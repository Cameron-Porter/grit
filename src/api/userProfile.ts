import { supabase } from './supabase';
import { UserProfile, UserRole } from '../types/auth';

// ── Read ──────────────────────────────────────────────────────────────────────

/** Fetch the signed-in user's own profile. Returns null on error or no session. */
export async function fetchMyProfile(): Promise<UserProfile | null> {
  // Await the session explicitly — the Supabase client may not have applied
  // the JWT to outgoing request headers yet when called synchronously from
  // an auth-state-change subscriber.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    console.warn('[fetchMyProfile] no active session');
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .limit(1);

  if (error) {
    console.warn('[fetchMyProfile] error:', error.code, error.message);
    return null;
  }
  const profile = (data?.[0] ?? null) as UserProfile | null;
  console.log('[fetchMyProfile] loaded profile:', profile?.role ?? 'none');
  return profile;
}

// ── Admin: role management ────────────────────────────────────────────────────

/**
 * Promote or demote a user's role.
 * Calls the `assign_role` security-definer RPC — will throw if the caller
 * is not an admin (enforced server-side, not just in the UI).
 */
export async function assignRole(targetUserId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('assign_role', {
    target_user_id: targetUserId,
    new_role: role,
  });
  if (error) throw new Error(error.message);
}

/**
 * Search profiles by email fragment. Admin-only (non-admins get empty array).
 */
export async function searchProfilesByEmail(query: string): Promise<UserProfile[]> {
  const { data, error } = await supabase.rpc('search_profiles_by_email', { query });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserProfile[];
}

/**
 * Fetch all profiles. Admin-only (non-admins get empty array).
 */
export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.rpc('get_all_profiles');
  if (error) throw new Error(error.message);
  return (data ?? []) as UserProfile[];
}

// ── Admin: pre-grants (assign role before user signs up) ─────────────────────

export interface RolePreGrant {
  email: string;
  role: UserRole;
  granted_by: string | null;
  created_at: string;
}

/** Upsert a role that will be applied automatically when this email signs up. */
export async function pregrantRole(email: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('pregrant_role', {
    target_email: email,
    new_role: role,
  });
  if (error) throw new Error(error.message);
}

/** Cancel a pending pre-grant. No-op if the email has already signed up. */
export async function revokePregrant(email: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_pregrant', { target_email: email });
  if (error) throw new Error(error.message);
}

/** List all pending pre-grants for the admin panel. */
export async function listPregrants(): Promise<RolePreGrant[]> {
  const { data, error } = await supabase.rpc('list_pregrants');
  if (error) throw new Error(error.message);
  return (data ?? []) as RolePreGrant[];
}
