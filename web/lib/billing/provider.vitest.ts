import{describe,expect,it,vi}from'vitest';

const billingPortalCreate=vi.fn(async()=>({url:'https://billing.stripe.test/portal'}));
const checkoutSessionCreate=vi.fn(async()=>({url:'https://checkout.stripe.test/session'}));
vi.mock('./stripe',()=>({stripe:()=>({billingPortal:{sessions:{create:billingPortalCreate}},checkout:{sessions:{create:checkoutSessionCreate}}})}));

const{checkoutIntegrationIdentifier,StripeBillingProvider}=await import('./provider');

describe('checkoutIntegrationIdentifier',()=>{it('uses the required eight-letter suffix',()=>expect(checkoutIntegrationIdentifier()).toMatch(/^grit_pwa_[a-z]{8}$/))});

const makeDatabase=(row:Record<string,unknown>|null)=>({
  from:vi.fn(()=>({select:vi.fn(()=>({eq:vi.fn(()=>({maybeSingle:vi.fn(async()=>({data:row,error:null}))}))}))})),
}) as never;

describe('StripeBillingProvider.getEntitlement',()=>{
  it('grants pro to a premium role even with no active subscription',async()=>{
    const provider=new StripeBillingProvider(makeDatabase({role:'vip',subscription_status:'inactive'}));
    expect(await provider.getEntitlement('user-1')).toBe('pro');
  });
  it('denies an ordinary user without an active subscription',async()=>{
    const provider=new StripeBillingProvider(makeDatabase({role:'user',subscription_status:'inactive'}));
    expect(await provider.getEntitlement('user-1')).toBe('free');
  });
  it('grants pro to an ordinary user with an active subscription',async()=>{
    const provider=new StripeBillingProvider(makeDatabase({role:'user',subscription_status:'active'}));
    expect(await provider.getEntitlement('user-1')).toBe('pro');
  });
  it('grants pro to an ordinary user with only an active Stripe subscription',async()=>{
    const provider=new StripeBillingProvider(makeDatabase({role:'user',subscription_status:'inactive',stripe_subscription_status:'active'}));
    expect(await provider.getEntitlement('user-1')).toBe('pro');
  });
  it('denies access when no profile row exists',async()=>{
    const provider=new StripeBillingProvider(makeDatabase(null));
    expect(await provider.getEntitlement('user-1')).toBe('free');
  });
});

const makeColumnDatabase=(handlers:Record<string,()=>{data:unknown;error:unknown}>)=>({
  from:vi.fn(()=>({select:vi.fn((columns:string)=>({eq:vi.fn(()=>({maybeSingle:vi.fn(async()=>handlers[columns]())}))}))})),
}) as never;

describe('StripeBillingProvider.getEntitlement resilience',()=>{
  it('still grants pro to a VIP when the Stripe status column errors (e.g. missing migration)',async()=>{
    const database=makeColumnDatabase({
      'role,subscription_status':()=>({data:{role:'vip',subscription_status:'inactive'},error:null}),
      'stripe_subscription_status':()=>({data:null,error:{message:'column "stripe_subscription_status" does not exist'}}),
    });
    const provider=new StripeBillingProvider(database);
    expect(await provider.getEntitlement('user-1')).toBe('pro');
  });
  it('still denies an ordinary inactive user when the Stripe status column errors',async()=>{
    const database=makeColumnDatabase({
      'role,subscription_status':()=>({data:{role:'user',subscription_status:'inactive'},error:null}),
      'stripe_subscription_status':()=>({data:null,error:{message:'column "stripe_subscription_status" does not exist'}}),
    });
    const provider=new StripeBillingProvider(database);
    expect(await provider.getEntitlement('user-1')).toBe('free');
  });
});

describe('StripeBillingProvider.createCheckout',()=>{
  const withPrice=async(fn:()=>Promise<void>)=>{
    const previous=process.env.STRIPE_PRO_PRICE_ID;
    process.env.STRIPE_PRO_PRICE_ID='price_test';
    try{await fn()}finally{if(previous===undefined)delete process.env.STRIPE_PRO_PRICE_ID;else process.env.STRIPE_PRO_PRICE_ID=previous}
  };

  it('routes a VIP with an existing Stripe customer to the billing portal even when the Stripe status column errors',()=>withPrice(async()=>{
    billingPortalCreate.mockClear();
    const database=makeColumnDatabase({
      'role,subscription_status':()=>({data:{role:'vip',subscription_status:'inactive'},error:null}),
      'stripe_subscription_status':()=>({data:null,error:{message:'column "stripe_subscription_status" does not exist'}}),
      'stripe_customer_id':()=>({data:{stripe_customer_id:'cus_123'},error:null}),
    });
    const provider=new StripeBillingProvider(database);
    const result=await provider.createCheckout('user-1','vip@example.com','https://app.example.com');
    expect(result.url).toBe('https://billing.stripe.test/portal');
    expect(billingPortalCreate).toHaveBeenCalledWith({customer:'cus_123',return_url:'https://app.example.com/profile'});
  }));

  it('throws when the core role/subscription_status query errors instead of silently treating the user as free',()=>withPrice(async()=>{
    const database=makeColumnDatabase({
      'role,subscription_status':()=>({data:null,error:{message:'connection reset'}}),
    });
    const provider=new StripeBillingProvider(database);
    await expect(provider.createCheckout('user-1','user@example.com','https://app.example.com')).rejects.toMatchObject({message:'connection reset'});
  }));

  it('still creates a customer-email checkout instead of crashing when the stripe_customer_id column errors (e.g. missing migration)',()=>withPrice(async()=>{
    checkoutSessionCreate.mockClear();
    const database=makeColumnDatabase({
      'role,subscription_status':()=>({data:{role:'user',subscription_status:'inactive'},error:null}),
      'stripe_subscription_status':()=>({data:null,error:{message:'column "stripe_subscription_status" does not exist'}}),
      'stripe_customer_id':()=>({data:null,error:{message:'column "stripe_customer_id" does not exist'}}),
    });
    const provider=new StripeBillingProvider(database);
    const result=await provider.createCheckout('user-1','user@example.com','https://app.example.com');
    expect(result.url).toBe('https://checkout.stripe.test/session');
    expect(checkoutSessionCreate).toHaveBeenCalledWith(expect.objectContaining({customer:undefined,customer_email:'user@example.com'}));
  }));

  it('still creates a customer-email checkout for a VIP with no linked customer when the stripe_customer_id column errors',()=>withPrice(async()=>{
    checkoutSessionCreate.mockClear();
    const database=makeColumnDatabase({
      'role,subscription_status':()=>({data:{role:'vip',subscription_status:'inactive'},error:null}),
      'stripe_subscription_status':()=>({data:null,error:{message:'column "stripe_subscription_status" does not exist'}}),
      'stripe_customer_id':()=>({data:null,error:{message:'column "stripe_customer_id" does not exist'}}),
    });
    const provider=new StripeBillingProvider(database);
    const result=await provider.createCheckout('user-1','vip@example.com','https://app.example.com');
    expect(result.url).toBe('https://checkout.stripe.test/session');
    expect(checkoutSessionCreate).toHaveBeenCalledWith(expect.objectContaining({customer:undefined,customer_email:'vip@example.com'}));
  }));
});
