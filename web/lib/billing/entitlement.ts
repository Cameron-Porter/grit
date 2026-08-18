export type Entitlement = 'free' | 'pro';

/** Mirrors src/types/auth.ts PREMIUM_ROLES — roles that grant premium access
 * regardless of subscription state. Keep these two lists in sync; native and
 * web must agree on which roles bypass billing. */
export const PREMIUM_ROLES = ['vip', 'admin', 'coach', 'ambassador', 'beta_tester'] as const;

export type EntitlementProfile = { role?: string | null; subscription_status?: string | null };

/**
 * The one place web entitlement is decided. Never inspect `role` or
 * `subscription_status` directly outside this function — StripeBillingProvider
 * .getEntitlement() and every AI-program guard call through here so a role
 * change and a billing-status change are always evaluated the same way.
 */
export function resolveEntitlement(profile: EntitlementProfile | null | undefined): Entitlement {
  if (!profile) return 'free';
  if (profile.role && (PREMIUM_ROLES as readonly string[]).includes(profile.role)) return 'pro';
  return profile.subscription_status === 'active' ? 'pro' : 'free';
}
