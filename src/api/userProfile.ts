import { supabase } from './supabase';
import { UserProfile, UserRole } from '../types/auth';

// ── Read ──────────────────────────────────────────────────────────────────────

/** Fetch the signed-in user's own profile. Returns null on error or no session. */
export async function fetchMyProfile(): Promise<UserProfile | null> {
  // Await the session explicitly — the Supabase client may not have applied
  // the JWT to outgoing request headers yet when called synchronously from
  // an auth-state-change subscriber.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .limit(1);

  if (error) return null;
  return (data?.[0] ?? null) as UserProfile | null;
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

/** Permanently delete the signed-in user's account and all their data. */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
}

// ── Body weight (cross-device sync) ──────────────────────────────────────────

export async function getBodyWeight(): Promise<number | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;
  const { data } = await supabase
    .from('user_profiles')
    .select('body_weight')
    .eq('id', session.user.id)
    .limit(1)
    .single();
  return (data as any)?.body_weight ?? null;
}

export async function upsertBodyWeight(weight: number): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;
  await supabase
    .from('user_profiles')
    .update({ body_weight: weight } as any)
    .eq('id', session.user.id);
}

// ── Settings (cross-device sync) ──────────────────────────────────────────────

export interface RemoteSettings {
  autoMatchWeight: boolean;
  usePreferredEquipment: boolean;
  preferredEquipment: string[];
  theme: string;
  workoutRemindersEnabled: boolean;
}

export async function getSettings(): Promise<RemoteSettings | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;
  const { data } = await supabase
    .from('user_profiles')
    .select('auto_match_weight, use_preferred_equipment, preferred_equipment, theme, workout_reminders_enabled')
    .eq('id', session.user.id)
    .limit(1)
    .single();
  if (!data) return null;
  const d = data as any;
  return {
    autoMatchWeight: d.auto_match_weight ?? false,
    usePreferredEquipment: d.use_preferred_equipment ?? false,
    preferredEquipment: d.preferred_equipment ?? ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight'],
    theme: d.theme ?? 'dark',
    workoutRemindersEnabled: d.workout_reminders_enabled ?? false,
  };
}

export async function upsertSettings(partial: Partial<RemoteSettings>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;
  const patch: Record<string, unknown> = {};
  if (partial.autoMatchWeight !== undefined) patch.auto_match_weight = partial.autoMatchWeight;
  if (partial.usePreferredEquipment !== undefined) patch.use_preferred_equipment = partial.usePreferredEquipment;
  if (partial.preferredEquipment !== undefined) patch.preferred_equipment = partial.preferredEquipment;
  if (partial.theme !== undefined) patch.theme = partial.theme;
  if (partial.workoutRemindersEnabled !== undefined) patch.workout_reminders_enabled = partial.workoutRemindersEnabled;
  if (Object.keys(patch).length === 0) return;
  await supabase.from('user_profiles').update(patch as any).eq('id', session.user.id);
}
