-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill three objects that migration 20260814185248 (harden_function_execute_
-- grants) referenced by name — revoke/grant on delete_my_account() and
-- rls_auto_enable(), plus an RLS policy on user_exercises — but that no earlier
-- checked-in migration ever created. That migration's REVOKE/GRANT/ALTER
-- statements silently no-op against a nonexistent function, and its CREATE POLICY
-- would fail outright against a nonexistent table on a truly fresh database.
--
-- These are written from scratch, following this repo's own conventions
-- (public.permanently_delete_user_data's structure, user_id as text matching
-- auth.uid()::text as in every other user-owned table), NOT copied from a live
-- database — GRIT Audit 2026-08-17 found no working credentials to introspect
-- the production instance. If the production database already defines these
-- objects with different bodies, this migration's `create or replace` /
-- `create table if not exists` are safe no-ops for anything already identical,
-- but a manually-diverged live definition should be reconciled against this
-- file (or this file updated to match) before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_exercises ─────────────────────────────────────────────────────────
-- Per-user exercise preferences/notes distinct from the shared `exercises`
-- catalog (which already has its own is_custom flag and RLS in
-- 20260605000006_add_rls_policies.sql). Minimal shape: one row links a user to
-- an exercise with an optional personal note. Extend with real columns once a
-- concrete feature needs them.
create table if not exists public.user_exercises (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,
  exercise_id uuid        references public.exercises(id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_user_exercises_user_id on public.user_exercises(user_id);

alter table public.user_exercises enable row level security;

drop policy if exists "Users manage own exercise preferences" on public.user_exercises;
create policy "Users manage own exercise preferences"
  on public.user_exercises
  for all
  to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create trigger user_exercises_updated_at
  before update on public.user_exercises
  for each row execute procedure public.touch_updated_at();

-- ── delete_my_account ────────────────────────────────────────────────────────
-- Self-service hard delete for the *calling* user (no admin role required —
-- this is the RPC web/app/api/account/route.ts and src/api/userProfile.ts call
-- after canceling any Stripe/RevenueCat subscription). Modeled on
-- permanently_delete_user_data (20260626000009) but scoped to auth.uid() and
-- callable by any authenticated user for their own row only.
create or replace function public.delete_my_account()
returns void language plpgsql security definer as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  delete from public.user_exercises  where user_id = v_user_id::text;
  delete from public.workouts        where user_id = v_user_id::text;
  delete from public.programs        where user_id = v_user_id::text;
  delete from public.personal_records where user_id = v_user_id::text;
  delete from public.retention_status where user_id = v_user_id;

  insert into public.retention_audit_log (user_id, action, performed_by)
  values (v_user_id, 'self_service_account_deleted', v_user_id);

  delete from public.user_profiles where id = v_user_id;
end;
$$;

alter function public.delete_my_account() set search_path = public, pg_temp;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ── rls_auto_enable ───────────────────────────────────────────────────────────
-- Admin maintenance helper: enable row level security on every public table
-- that doesn't already have it, so a future table added without RLS never
-- silently ships open. Idempotent — tables already RLS-enabled are skipped.
create or replace function public.rls_auto_enable()
returns table (enabled_table text)
language plpgsql security definer as $$
declare
  v_row record;
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: admins only';
  end if;

  for v_row in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', v_row.relname);
    enabled_table := v_row.relname;
    return next;
  end loop;
end;
$$;

alter function public.rls_auto_enable() set search_path = public, pg_temp;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to authenticated;
