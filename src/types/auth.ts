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
  // Future roles — uncomment when ready:
  // | 'coach'
  // | 'trainer'
  // | 'beta_tester'
  // | 'ambassador'
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
  subscription_status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

// ── Role sets ─────────────────────────────────────────────────────────────────

/** Roles that grant premium access regardless of subscription state. */
export const PREMIUM_ROLES: UserRole[] = ['vip', 'admin'];

/** Roles that have admin panel access. */
export const ADMIN_ROLES: UserRole[] = ['admin'];
