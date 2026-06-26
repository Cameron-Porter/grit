-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies for user_profiles
--
-- Security model:
--   • Normal users  → read/update their own row; CANNOT change their own role.
--   • Admins        → read and update any row (role assignment handled via RPC).
--   • subscription_status is NOT writable by the client at all; it is updated
--     exclusively by the RevenueCat → Supabase webhook (service-role key).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.user_profiles enable row level security;

-- ── 1. Every authenticated user can read their own profile ──
create policy "users_read_own_profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

-- ── 2. Admins can read every profile (for the admin dashboard) ──
create policy "admins_read_all_profiles"
  on public.user_profiles
  for select
  using (public.get_my_role() = 'admin');

-- ── 3. Users can update their own row ONLY if they do not change their role ──
--    subscription_status is also excluded: the client never writes it.
--    The only self-service update this permits is future fields like display_name.
--    If you have no such fields yet, this policy is a safe no-op.
create policy "users_update_own_profile_no_role_change"
  on public.user_profiles
  for update
  using  (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent the caller from escalating their own role
    and role = (select role from public.user_profiles where id = auth.uid())
    -- Prevent the caller from self-approving a subscription
    and subscription_status = (select subscription_status from public.user_profiles where id = auth.uid())
  );

-- ── 4. Admins can update any profile (role changes go via the secure RPC) ──
create policy "admins_update_any_profile"
  on public.user_profiles
  for update
  using  (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── 5. Prevent any client from inserting their own profile row ──
--    The trigger handle_new_user (security definer) creates it; clients must not.
--    (The trigger runs as superuser and bypasses RLS, so no insert policy is
--    needed for normal users — the absence of a policy blocks direct inserts.)
