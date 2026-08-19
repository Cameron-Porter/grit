import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { stripe } from './stripe';
import { resolveEntitlement, type Entitlement } from './entitlement';
export type { Entitlement };
export const checkoutIntegrationIdentifier=()=>`grit_pwa_${[...randomBytes(8)].map((value)=>String.fromCharCode(97+(value%26))).join('')}`;

export interface BillingProvider {
  createCheckout(userId: string, email: string, origin: string): Promise<{ url: string }>;
  createPortal(userId: string, origin: string): Promise<{ url: string }>;
  getEntitlement(userId: string): Promise<Entitlement>;
}

export class StripeBillingProvider implements BillingProvider {
  constructor(private readonly database: SupabaseClient) {}

  async createCheckout(userId: string, email: string, origin: string) {
    const price = process.env.STRIPE_PRO_PRICE_ID;
    if (!price) throw new Error('STRIPE_PRO_PRICE_ID is not configured.');
    const { data, error } = await this.database.from('user_profiles').select('role,stripe_customer_id,subscription_status,stripe_subscription_status').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (resolveEntitlement(data) === 'pro' && data?.stripe_customer_id) return this.createPortal(userId, origin);
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription', line_items: [{ price, quantity: 1 }],
      integration_identifier: checkoutIntegrationIdentifier(),
      customer: data?.stripe_customer_id ?? undefined,
      customer_email: data?.stripe_customer_id ? undefined : email,
      client_reference_id: userId, metadata: { user_id: userId },
      subscription_data: { metadata: { user_id: userId } }, allow_promotion_codes: true,
      success_url: `${origin}/profile?checkout=success`, cancel_url: `${origin}/profile?checkout=canceled`,
    });
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    return { url: session.url };
  }

  async createPortal(userId: string, origin: string) {
    const { data, error } = await this.database.from('user_profiles').select('stripe_customer_id').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) throw new Error('No Stripe customer is linked to this account.');
    const session = await stripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${origin}/profile` });
    return { url: session.url };
  }

  async getEntitlement(userId: string): Promise<Entitlement> {
    const { data, error } = await this.database.from('user_profiles').select('role,subscription_status,stripe_subscription_status').eq('id', userId).maybeSingle();
    if (error) throw error;
    return resolveEntitlement(data);
  }
}
