-- ─────────────────────────────────────────────────────────────────────────────
-- Admin role management RPCs
--
-- All functions are security definer (run as postgres/superuser) and perform
-- their own admin check before mutating data.  This means:
--   • RLS never blocks the function body — the function enforces its own rules.
--   • Clients call these via supabase.rpc() with the anon/user JWT.
--   • A non-admin caller gets a clear raised exception, not a silent no-op.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── assign_role ──────────────────────────────────────────────────────────────
-- Allows an admin to set any user's role.
-- Raises an exception if the caller is not an admin or if the role is invalid.
create or replace function public.assign_role(
  target_user_id uuid,
  new_role        text
)
returns void
language plpgsql
security definer
as $$
begin
  -- Gate: caller must be an admin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: only admins can assign roles';
  end if;

  -- Validate role value (defence-in-depth beyond the check constraint)
  if new_role not in ('user', 'vip', 'admin') then
    raise exception 'invalid_role: "%" is not a valid role', new_role;
  end if;

  -- Ensure the target profile exists
  if not exists (select 1 from public.user_profiles where id = target_user_id) then
    raise exception 'not_found: no profile found for user %', target_user_id;
  end if;

  update public.user_profiles
  set    role       = new_role,
         updated_at = now()
  where  id = target_user_id;
end;
$$;

-- ── get_all_profiles ─────────────────────────────────────────────────────────
-- Returns every profile row so the admin dashboard can list users.
-- Non-admins receive an empty result set (not an error).
create or replace function public.get_all_profiles()
returns setof public.user_profiles
language plpgsql
security definer
stable
as $$
begin
  if public.get_my_role() != 'admin' then
    return; -- empty result for non-admins
  end if;

  return query
    select * from public.user_profiles
    order by role, created_at;
end;
$$;

-- ── search_profiles_by_email ─────────────────────────────────────────────────
-- Admin-only email search for the role management dashboard.
create or replace function public.search_profiles_by_email(query text)
returns setof public.user_profiles
language plpgsql
security definer
stable
as $$
begin
  if public.get_my_role() != 'admin' then
    return;
  end if;

  return query
    select * from public.user_profiles
    where  email ilike '%' || query || '%'
    order by email
    limit 50;
end;
$$;

-- ── Revoke public execute on sensitive functions ─────────────────────────────
-- Only authenticated users with valid JWTs should be able to call these.
revoke execute on function public.assign_role(uuid, text) from anon;
revoke execute on function public.get_all_profiles() from anon;
revoke execute on function public.search_profiles_by_email(text) from anon;

grant execute on function public.assign_role(uuid, text) to authenticated;
grant execute on function public.get_all_profiles() to authenticated;
grant execute on function public.search_profiles_by_email(text) to authenticated;
