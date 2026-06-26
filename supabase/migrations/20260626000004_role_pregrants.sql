-- ─────────────────────────────────────────────────────────────────────────────
-- role_pregrants: stores a role to assign to an email address on signup.
-- The handle_new_user trigger (updated in 20260626000005) consumes and deletes
-- the grant row the moment a matching user signs up, so it can't be reused.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.role_pregrants (
  email      text      primary key,
  role       text      not null default 'vip'
                       check (role in ('user', 'vip', 'admin')),
  granted_by uuid      references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.role_pregrants enable row level security;

-- Only admins can read or write pre-grants.
create policy "admins_manage_pregrants"
  on public.role_pregrants
  for all
  using  (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── pregrant_role RPC ─────────────────────────────────────────────────────────
-- Admin upserts an email → role mapping before the user signs up.
create or replace function public.pregrant_role(
  target_email text,
  new_role     text
)
returns void
language plpgsql
security definer
as $$
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: only admins can pre-grant roles';
  end if;

  if new_role not in ('user', 'vip', 'admin') then
    raise exception 'invalid_role: "%" is not a valid role', new_role;
  end if;

  insert into public.role_pregrants (email, role, granted_by)
  values (lower(trim(target_email)), new_role, auth.uid())
  on conflict (email) do update
    set role       = excluded.role,
        granted_by = excluded.granted_by,
        created_at = now();
end;
$$;

-- ── revoke_pregrant RPC ───────────────────────────────────────────────────────
-- Cancel a pending pre-grant before the user signs up.
create or replace function public.revoke_pregrant(target_email text)
returns void
language plpgsql
security definer
as $$
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: only admins can revoke pre-grants';
  end if;

  delete from public.role_pregrants
  where email = lower(trim(target_email));
end;
$$;

-- ── list_pregrants RPC ────────────────────────────────────────────────────────
-- Returns all pending pre-grants for the admin panel.
create or replace function public.list_pregrants()
returns setof public.role_pregrants
language plpgsql
security definer
stable
as $$
begin
  if public.get_my_role() != 'admin' then
    return;
  end if;
  return query select * from public.role_pregrants order by created_at desc;
end;
$$;

revoke execute on function public.pregrant_role(text, text)  from anon;
revoke execute on function public.revoke_pregrant(text)      from anon;
revoke execute on function public.list_pregrants()           from anon;

grant execute on function public.pregrant_role(text, text)   to authenticated;
grant execute on function public.revoke_pregrant(text)       to authenticated;
grant execute on function public.list_pregrants()            to authenticated;
