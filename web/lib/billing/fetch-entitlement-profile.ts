import type { SupabaseClient } from '@supabase/supabase-js';
import type { EntitlementProfile } from './entitlement';

/**
 * Best-effort read of the Stripe-only billing column. Treats a missing
 * column (production hasn't run the 20260818123000 migration yet) or any
 * other query error as "no Stripe status" instead of throwing, so callers
 * that also need role/subscription_status never fail purely because this
 * one Stripe-specific column can't be read.
 */
export async function fetchStripeSubscriptionStatus(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('user_profiles').select('stripe_subscription_status').eq('id', userId).maybeSingle();
  if (error) return null;
  return data?.stripe_subscription_status ?? null;
}

/**
 * Best-effort read of the Stripe-only customer id column. Same rationale as
 * fetchStripeSubscriptionStatus(): a missing column (pre-migration
 * production) or any other query error is treated as "no linked customer"
 * instead of thrown, so callers that only need core/durable profile fields
 * (e.g. the profile page) never fail purely because this Stripe-specific
 * column can't be read.
 */
export async function fetchStripeCustomerId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('user_profiles').select('stripe_customer_id').eq('id', userId).maybeSingle();
  if (error) return null;
  return data?.stripe_customer_id ?? null;
}

/**
 * Loads exactly what resolveEntitlement() needs. role/subscription_status
 * are durable core columns from the original user_profiles migration — an
 * error there means we genuinely can't tell whether the user is entitled,
 * so it throws. stripe_subscription_status is fetched separately via
 * fetchStripeSubscriptionStatus() and never causes this to fail, so a
 * premium role (e.g. vip) still bypasses the paywall even when that column
 * is unreadable.
 */
export async function fetchEntitlementProfile(supabase: SupabaseClient, userId: string): Promise<EntitlementProfile | null> {
  const { data: core, error } = await supabase.from('user_profiles').select('role,subscription_status').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!core) return null;
  const stripe_subscription_status = await fetchStripeSubscriptionStatus(supabase, userId);
  return { ...core, stripe_subscription_status };
}
