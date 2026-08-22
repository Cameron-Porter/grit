-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill three objects that migration 20260814185248 (harden_function_execute_
-- grants) referenced by name — revoke/grant on delete_my_account() and
-- rls_auto_enable(), plus an RLS policy on user_exercises — but that no earlier
-- checked-in migration ever created.
--
-- 2026-08-18: Cameron ran this migration against production and it failed on
-- rls_auto_enable() with "42P13 cannot change return type of existing
-- function" (rolled back as a whole — nothing else in this file was applied).
-- That proves rls_auto_enable() (and very likely delete_my_account() and
-- user_exercises, applied together at the same time originally) were already
-- created directly against production — outside any checked-in migration —
-- with a signature/body this file doesn't know. `delete_my_account()` is
-- known-working in production today (native app calls it successfully), so
-- this file must NOT risk silently replacing its real body with a guess.
--
-- This migration is therefore written to be safe to run against a database
-- where these objects already exist in an unknown shape:
--   - user_exercises / its RLS policy: idempotent (`create table if not
--     exists`, `drop policy if exists` then recreate) — safe either way.
--   - delete_my_account(): only created if the function does not already
--     exist (checked via pg_proc, not `create or replace`), so a real
--     production body is never touched by this migration.
--   - rls_auto_enable(): DROP FUNCTION IF EXISTS first (matching the error's
--     own hint), then recreate with the shape below. Only run the DROP/CREATE
--     for this one after confirming with Cameron whether its current
--     production behavior differs from the "enable RLS on tables missing it"
--     admin helper implemented here — dropping it destroys the original body
--     with no recovery path from this repo alone.
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

drop trigger if exists user_exercises_updated_at on public.user_exercises;
create trigger user_exercises_updated_at
  before update on public.user_exercises
  for each row execute procedure public.touch_updated_at();

-- ── delete_my_account ────────────────────────────────────────────────────────
-- Self-service hard delete for the *calling* user. Confirmed to already exist
-- and work in production (native app calls it via RPC) — so this block only
-- fills the gap on a database where it is genuinely missing (e.g. a fresh
-- local/staging environment) and never touches an existing definition.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'delete_my_account'
  ) then
    execute $fn$
      create function public.delete_my_account()
      returns void language plpgsql security definer as $body$
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
      $body$;
    $fn$;
    execute 'alter function public.delete_my_account() set search_path = public, pg_temp';
    execute 'revoke execute on function public.delete_my_account() from public, anon';
    execute 'grant execute on function public.delete_my_account() to authenticated';
  end if;
end;
$$;

-- ── rls_auto_enable ───────────────────────────────────────────────────────────
-- CONFIRMED to already exist in production with a return type this repo's
-- earlier guess didn't match (2026-08-18 42P13 error). Deliberately NOT
-- recreated here — dropping and replacing an unknown, possibly-relied-upon
-- admin helper with a guessed body is not safe to do blind. Once Cameron
-- confirms the current production definition (or confirms it is safe to
-- replace), update this file with the real `drop function ... ; create
-- function ...` pair and remove this comment.
