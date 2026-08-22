export type Entitlement = 'free' | 'pro';

/** Mirrors src/types/auth.ts PREMIUM_ROLES — roles that grant premium access
 * regardless of subscription state. Keep these two lists in sync; native and
 * web must agree on which roles bypass billing. */
export const PREMIUM_ROLES = ['vip', 'admin', 'coach', 'ambassador', 'beta_tester'] as const;

export type EntitlementProfile = {
  role?: string | null;
  /** RevenueCat/shared/native billing status — never written by the Stripe webhook. */
  subscription_status?: string | null;
  /** Stripe-only billing status, written exclusively by the Stripe webhook. */
  stripe_subscription_status?: string | null;
};

/**
 * The one place web entitlement is decided. Never inspect `role`,
 * `subscription_status`, or `stripe_subscription_status` directly outside
 * this function — StripeBillingProvider.getEntitlement() and every
 * AI-program guard call through here so a role change and a billing-status
 * change on either provider are always evaluated the same way. Effective
 * access is an OR across all three: a premium role, an active RevenueCat/
 * shared subscription, or an active Stripe subscription.
 */
export function resolveEntitlement(profile: EntitlementProfile | null | undefined): Entitlement {
  if (!profile) return 'free';
  const role = profile.role?.trim().toLowerCase();
  if (role && (PREMIUM_ROLES as readonly string[]).includes(role)) return 'pro';
  if (profile.subscription_status === 'active') return 'pro';
  if (profile.stripe_subscription_status === 'active') return 'pro';
  return 'free';
}
