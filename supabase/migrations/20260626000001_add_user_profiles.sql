-- ─────────────────────────────────────────────────────────────────────────────
-- user_profiles
--
-- Stores role and billing state separately from Supabase auth.users.
--
--  role                 → permissions gate (admin/vip bypass subscription check)
--  subscription_status  → billing state, updated ONLY by RevenueCat webhooks
--                         (never written by the client app)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.user_profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text,
  role                text        not null default 'user'
                                  check (role in ('user', 'vip', 'admin')),
  subscription_status text        not null default 'inactive'
                                  check (subscription_status in ('active', 'inactive', 'canceled', 'past_due')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Helper: returns the calling user's role without triggering RLS recursion ──
-- security definer means it runs as the function owner (postgres), bypassing RLS.
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

-- ── Auto-create a profile row whenever a new Supabase auth user is created ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Keep updated_at current ──
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.touch_updated_at();
