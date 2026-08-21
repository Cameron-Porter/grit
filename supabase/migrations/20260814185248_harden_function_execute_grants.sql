-- Remove PostgreSQL's default PUBLIC execute privilege from privileged RPCs.
-- Authenticated access is granted only to the functions intentionally exposed by the app;
-- each admin RPC also performs its existing role check internally.
revoke execute on function public.assign_role(uuid, text) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.get_all_profiles() from public, anon;
revoke execute on function public.get_my_role() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.list_pregrants() from public, anon;
revoke execute on function public.pregrant_role(text, text) from public, anon;
revoke execute on function public.revoke_pregrant(text) from public, anon;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.search_profiles_by_email(text) from public, anon;

grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.assign_role(uuid, text) to authenticated;
grant execute on function public.get_all_profiles() to authenticated;
grant execute on function public.list_pregrants() to authenticated;
grant execute on function public.pregrant_role(text, text) to authenticated;
grant execute on function public.revoke_pregrant(text) to authenticated;
grant execute on function public.search_profiles_by_email(text) to authenticated;

-- Pin privileged functions to trusted schemas to prevent object-shadowing attacks.
alter function public.assign_role(uuid, text) set search_path = public, pg_temp;
alter function public.delete_my_account() set search_path = public, pg_temp;
alter function public.get_all_profiles() set search_path = public, pg_temp;
alter function public.get_my_role() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.list_pregrants() set search_path = public, pg_temp;
alter function public.pregrant_role(text, text) set search_path = public, pg_temp;
alter function public.revoke_pregrant(text) set search_path = public, pg_temp;
alter function public.search_profiles_by_email(text) set search_path = public, pg_temp;
alter function public.archive_user_data(uuid) set search_path = public, pg_temp;
alter function public.extend_grace_period(uuid, integer) set search_path = public, pg_temp;
alter function public.get_retention_dashboard() set search_path = public, pg_temp;
alter function public.is_retention_exempt(uuid) set search_path = public, pg_temp;
alter function public.permanently_delete_user_data(uuid) set search_path = public, pg_temp;
alter function public.restore_user_data(uuid) set search_path = public, pg_temp;
alter function public.run_retention_job() set search_path = public, pg_temp;
alter function public.set_retention_exempt(uuid, boolean) set search_path = public, pg_temp;

-- This user-owned table had RLS enabled but no policy, making legitimate rows inaccessible.
drop policy if exists "Users manage own exercise preferences" on public.user_exercises;
create policy "Users manage own exercise preferences"
  on public.user_exercises
  for all
  to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

-- Foreign-key indexes used by every program/workout detail and atomic save path.
create index if not exists idx_program_days_program_id on public.program_days(program_id);
create index if not exists idx_program_exercises_program_day_id on public.program_exercises(program_day_id);
create index if not exists idx_workout_sets_workout_id on public.workout_sets(workout_id);
create index if not exists idx_workout_feedback_workout_id on public.workout_feedback(workout_id);
