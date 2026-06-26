// ─────────────────────────────────────────────────────────────────────────────
// Role & entitlement types
//
// Add future roles here and nowhere else; entitlement helpers read from these
// arrays so no other code needs to change.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'user'
  | 'vip'
  | 'admin'
  | 'coach'
  | 'ambassador'
  | 'beta_tester'
  ;

export type SubscriptionStatus =
  | 'active'
  | 'inactive'
  | 'canceled'
  | 'past_due';

export interface UserProfile {
  id: string;
  email: string | null;
  role: UserRole;
  retention_exempt: boolean;
  subscription_status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

// ── Role sets ─────────────────────────────────────────────────────────────────

/** Roles that grant premium access regardless of subscription state. */
export const PREMIUM_ROLES: UserRole[] = ['vip', 'admin', 'coach', 'ambassador', 'beta_tester'];

/** Roles that have admin panel access. */
export const ADMIN_ROLES: UserRole[] = ['admin'];

/** Roles that are automatically exempt from data retention/deletion. */
export const RETENTION_EXEMPT_ROLES: UserRole[] = ['admin', 'vip', 'coach', 'ambassador', 'beta_tester'];
