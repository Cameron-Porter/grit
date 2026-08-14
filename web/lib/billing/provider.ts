export interface BillingProvider {
  createCheckout(userId: string, plan: string): Promise<{ url: string }>;
  createPortal(userId: string): Promise<{ url: string }>;
  getEntitlement(userId: string): Promise<'free' | 'pro'>;
}

export class BillingNotConfigured implements BillingProvider {
  private unavailable(): never { throw new Error('Billing provider is not configured.'); }
  createCheckout(): Promise<{ url: string }> { return this.unavailable(); }
  createPortal(): Promise<{ url: string }> { return this.unavailable(); }
  getEntitlement(): Promise<'free' | 'pro'> { return Promise.resolve('free'); }
}

export const billing: BillingProvider = new BillingNotConfigured();
