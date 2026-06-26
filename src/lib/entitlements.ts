// ─────────────────────────────────────────────────────────────────────────────
// Entitlement helpers — pure functions, no React, no hooks.
//
// These are the ONLY place premium/admin logic lives.  UI components must
// never inspect role strings or subscription_status directly.
// ─────────────────────────────────────────────────────────────────────────────

import { UserProfile, UserRole, ADMIN_ROLES, PREMIUM_ROLES, RETENTION_EXEMPT_ROLES } from '../types/auth';

/**
 * Returns true when the user should have full premium access.
 *
 * Access is granted when ANY of the following is true:
 *   1. The user has a premium role (vip, admin) — billing-independent.
 *   2. RevenueCat reports an active subscription (rcIsProMember = true).
 *
 * `profile` may be null while loading; fall back to RC state only so the
 * app doesn't flash a paywall before the profile arrives.
 */
export function hasPremiumAccess(
  profile: UserProfile | null,
  rcIsProMember: boolean,
): boolean {
  if (!profile) return rcIsProMember;
  return PREMIUM_ROLES.includes(profile.role) || rcIsProMember;
}

/**
 * Returns true when the user has the admin role.
 * Admins have full premium access and can manage other users' roles.
 */
export function isAdmin(profile: UserProfile | null): boolean {
  return profile ? ADMIN_ROLES.includes(profile.role) : false;
}

/**
 * Returns true when the user has the vip role.
 * VIPs have premium access but cannot manage roles.
 */
export function isVip(profile: UserProfile | null): boolean {
  return profile?.role === 'vip';
}

/**
 * Returns true when the user has exactly the given role.
 */
export function hasRole(profile: UserProfile | null, role: UserRole): boolean {
  return profile?.role === role;
}

/**
 * Returns true when the user has any of the given roles.
 * Useful for features shared by multiple elevated roles.
 *
 * @example
 * hasAnyRole(profile, ['admin', 'coach']) // coach-only or admin
 */
export function hasAnyRole(profile: UserProfile | null, roles: UserRole[]): boolean {
  return profile ? roles.includes(profile.role) : false;
}

/**
 * Returns a human-readable label for a role.
 */
export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    user:        'Member',
    vip:         'VIP',
    admin:       'Admin',
    coach:       'Coach',
    ambassador:  'Ambassador',
    beta_tester: 'Beta Tester',
  };
  return labels[role] ?? role;
}

/**
 * Returns true when the user's role makes them permanently exempt from
 * data retention (archival / deletion).  The `retention_exempt` flag on
 * user_profiles can override this for individual 'user' accounts.
 */
export function isRetentionExempt(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.retention_exempt || RETENTION_EXEMPT_ROLES.includes(profile.role);
}
