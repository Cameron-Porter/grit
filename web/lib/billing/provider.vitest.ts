import{describe,expect,it,vi}from'vitest';
import{checkoutIntegrationIdentifier,StripeBillingProvider}from'./provider';

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
  it('denies access when no profile row exists',async()=>{
    const provider=new StripeBillingProvider(makeDatabase(null));
    expect(await provider.getEntitlement('user-1')).toBe('free');
  });
});
