-- ─────────────────────────────────────────────────────────────────────────────
-- Retention functions
--
-- All functions are security definer.  Admin-facing RPCs check get_my_role().
-- run_retention_job() allows calls from pg_cron (auth.uid() IS NULL) OR admins.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: is a user exempt from retention? ──────────────────────────────────
create or replace function public.is_retention_exempt(target_user_id uuid)
returns boolean language plpgsql security definer stable as $$
begin
  return exists (
    select 1 from public.user_profiles
    where id = target_user_id
      and (
        role in ('admin', 'vip', 'coach', 'ambassador', 'beta_tester')
        or retention_exempt = true
      )
  );
end;
$$;

-- ── archive_user_data ─────────────────────────────────────────────────────────
create or replace function public.archive_user_data(target_user_id uuid)
returns void language plpgsql security definer as $$
declare v_now timestamptz := now();
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: admins only';
  end if;
  if public.is_retention_exempt(target_user_id) then
    raise exception 'user_exempt: this user is retention-exempt and cannot be archived';
  end if;

  update public.workouts         set deleted_at = v_now where user_id = target_user_id::text and deleted_at is null;
  update public.programs         set deleted_at = v_now where user_id = target_user_id::text and deleted_at is null;
  update public.personal_records set deleted_at = v_now where user_id = target_user_id::text and deleted_at is null;

  insert into public.retention_status (
    user_id, status, entered_retention_at, archive_eligible_at, delete_eligible_at, archived_at, last_evaluated_at
  )
  values (
    target_user_id, 'archived',
    coalesce((select entered_retention_at from public.retention_status where user_id = target_user_id), v_now),
    coalesce((select archive_eligible_at  from public.retention_status where user_id = target_user_id), v_now),
    coalesce((select delete_eligible_at   from public.retention_status where user_id = target_user_id), v_now + interval '60 days'),
    v_now, v_now
  )
  on conflict (user_id) do update set
    status = 'archived', archived_at = coalesce(retention_status.archived_at, v_now),
    last_evaluated_at = v_now, updated_at = v_now;

  insert into public.retention_audit_log (user_id, action, performed_by)
  values (target_user_id, 'manual_archive', auth.uid());
end;
$$;

-- ── restore_user_data ─────────────────────────────────────────────────────────
create or replace function public.restore_user_data(target_user_id uuid)
returns void language plpgsql security definer as $$
declare v_now timestamptz := now();
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: admins only';
  end if;

  update public.workouts         set deleted_at = null where user_id = target_user_id::text;
  update public.programs         set deleted_at = null where user_id = target_user_id::text;
  update public.personal_records set deleted_at = null where user_id = target_user_id::text;

  delete from public.retention_status where user_id = target_user_id;

  insert into public.retention_audit_log (user_id, action, performed_by)
  values (target_user_id, 'manual_restore', auth.uid());
end;
$$;

-- ── permanently_delete_user_data ──────────────────────────────────────────────
create or replace function public.permanently_delete_user_data(target_user_id uuid)
returns void language plpgsql security definer as $$
declare v_now timestamptz := now();
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: admins only';
  end if;

  -- Hard delete — ON DELETE CASCADE removes workout_sets, program_days, etc.
  delete from public.workouts         where user_id = target_user_id::text;
  delete from public.programs         where user_id = target_user_id::text;
  delete from public.personal_records where user_id = target_user_id::text;

  update public.retention_status
  set status = 'permanently_deleted', permanently_deleted_at = v_now,
      last_evaluated_at = v_now, updated_at = v_now
  where user_id = target_user_id;

  insert into public.retention_audit_log (user_id, action, performed_by)
  values (target_user_id, 'manual_permanently_deleted', auth.uid());
end;
$$;

-- ── set_retention_exempt ──────────────────────────────────────────────────────
create or replace function public.set_retention_exempt(target_user_id uuid, exempt boolean)
returns void language plpgsql security definer as $$
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: admins only';
  end if;

  update public.user_profiles set retention_exempt = exempt, updated_at = now()
  where id = target_user_id;

  -- If exempting someone who is currently in retention, restore them automatically
  if exempt then
    perform public.restore_user_data(target_user_id);
  end if;

  insert into public.retention_audit_log (user_id, action, performed_by, details)
  values (target_user_id,
    case when exempt then 'exempted' else 'exemption_removed' end,
    auth.uid(),
    jsonb_build_object('retention_exempt', exempt));
end;
$$;

-- ── extend_grace_period ───────────────────────────────────────────────────────
create or replace function public.extend_grace_period(target_user_id uuid, extend_days int)
returns void language plpgsql security definer as $$
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: admins only';
  end if;
  if extend_days <= 0 or extend_days > 365 then
    raise exception 'invalid_days: extend_days must be 1–365';
  end if;

  update public.retention_status
  set archive_eligible_at = archive_eligible_at + (extend_days || ' days')::interval,
      delete_eligible_at  = delete_eligible_at  + (extend_days || ' days')::interval,
      last_evaluated_at   = now(), updated_at = now()
  where user_id = target_user_id
    and status  = 'grace_period';

  if not found then
    raise exception 'not_in_grace_period: user is not currently in grace period';
  end if;

  insert into public.retention_audit_log (user_id, action, performed_by, details)
  values (target_user_id, 'grace_extended', auth.uid(), jsonb_build_object('extend_days', extend_days));
end;
$$;

-- ── get_retention_dashboard ───────────────────────────────────────────────────
create or replace function public.get_retention_dashboard()
returns table (
  user_id                 uuid,
  email                   text,
  role                    text,
  retention_exempt        boolean,
  subscription_status     text,
  retention_status        text,
  entered_retention_at    timestamptz,
  archive_eligible_at     timestamptz,
  delete_eligible_at      timestamptz,
  archived_at             timestamptz,
  permanently_deleted_at  timestamptz,
  days_in_retention       int,
  days_until_archive      int,
  days_until_deletion     int
)
language plpgsql security definer stable as $$
begin
  if public.get_my_role() != 'admin' then
    raise exception 'permission_denied: admins only';
  end if;

  return query
  select
    up.id,
    up.email,
    up.role,
    coalesce(up.retention_exempt, false),
    up.subscription_status,
    rs.status,
    rs.entered_retention_at,
    rs.archive_eligible_at,
    rs.delete_eligible_at,
    rs.archived_at,
    rs.permanently_deleted_at,
    greatest(0, extract(day from now() - rs.entered_retention_at)::int),
    greatest(0, extract(day from rs.archive_eligible_at - now())::int),
    greatest(0, extract(day from rs.delete_eligible_at  - now())::int)
  from public.retention_status rs
  join public.user_profiles up on up.id = rs.user_id
  order by
    case rs.status
      when 'grace_period'         then 1
      when 'archived'             then 2
      when 'permanently_deleted'  then 3
    end,
    rs.archive_eligible_at asc;
end;
$$;

-- ── run_retention_job ─────────────────────────────────────────────────────────
-- Called daily by pg_cron (auth.uid() IS NULL) or manually by an admin.
create or replace function public.run_retention_job()
returns table (action_taken text, affected_count int)
language plpgsql security definer as $$
declare
  v_now    timestamptz := now();
  v_count  int;
begin
  -- Only pg_cron (no auth context) or admins may call this
  if auth.uid() is not null and public.get_my_role() != 'admin' then
    raise exception 'permission_denied';
  end if;

  -- ── A. Enter grace period for newly inactive non-exempt users ──────────────
  insert into public.retention_status (
    user_id, status, entered_retention_at, archive_eligible_at, delete_eligible_at, last_evaluated_at
  )
  select
    up.id, 'grace_period', v_now,
    v_now + interval '30 days',
    v_now + interval '90 days',
    v_now
  from public.user_profiles up
  where up.subscription_status in ('inactive', 'canceled', 'past_due')
    and not (up.role in ('admin', 'vip', 'coach', 'ambassador', 'beta_tester'))
    and coalesce(up.retention_exempt, false) = false
    and not exists (select 1 from public.retention_status where user_id = up.id)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  action_taken := 'grace_period_entered'; affected_count := v_count; return next;

  -- ── B. Auto-restore users whose subscription became active again ───────────
  -- Clear soft deletes
  update public.workouts w
  set deleted_at = null
  from public.retention_status rs
  join public.user_profiles up on up.id = rs.user_id
  where w.user_id = rs.user_id::text
    and up.subscription_status = 'active'
    and rs.status in ('grace_period', 'archived')
    and w.deleted_at is not null;

  update public.programs p
  set deleted_at = null
  from public.retention_status rs
  join public.user_profiles up on up.id = rs.user_id
  where p.user_id = rs.user_id::text
    and up.subscription_status = 'active'
    and rs.status in ('grace_period', 'archived')
    and p.deleted_at is not null;

  update public.personal_records pr
  set deleted_at = null
  from public.retention_status rs
  join public.user_profiles up on up.id = rs.user_id
  where pr.user_id = rs.user_id::text
    and up.subscription_status = 'active'
    and rs.status in ('grace_period', 'archived')
    and pr.deleted_at is not null;

  -- Remove retention tracking for restored users
  delete from public.retention_status rs
  using public.user_profiles up
  where rs.user_id = up.id
    and up.subscription_status = 'active'
    and rs.status in ('grace_period', 'archived');

  get diagnostics v_count = row_count;
  action_taken := 'restored'; affected_count := v_count; return next;

  -- ── C. Archive users at Day 30 ────────────────────────────────────────────
  update public.workouts w
  set deleted_at = v_now
  from public.retention_status rs
  where w.user_id = rs.user_id::text
    and rs.status = 'grace_period'
    and rs.archive_eligible_at <= v_now
    and w.deleted_at is null;

  update public.programs p
  set deleted_at = v_now
  from public.retention_status rs
  where p.user_id = rs.user_id::text
    and rs.status = 'grace_period'
    and rs.archive_eligible_at <= v_now
    and p.deleted_at is null;

  update public.personal_records pr
  set deleted_at = v_now
  from public.retention_status rs
  where pr.user_id = rs.user_id::text
    and rs.status = 'grace_period'
    and rs.archive_eligible_at <= v_now
    and pr.deleted_at is null;

  update public.retention_status
  set status = 'archived', archived_at = coalesce(archived_at, v_now),
      last_evaluated_at = v_now, updated_at = v_now
  where status = 'grace_period' and archive_eligible_at <= v_now;

  get diagnostics v_count = row_count;
  action_taken := 'archived'; affected_count := v_count; return next;

  -- ── D. Permanently delete at Day 90 ──────────────────────────────────────
  delete from public.workouts w
  using public.retention_status rs
  where w.user_id = rs.user_id::text
    and rs.status = 'archived'
    and rs.delete_eligible_at <= v_now;

  delete from public.programs p
  using public.retention_status rs
  where p.user_id = rs.user_id::text
    and rs.status = 'archived'
    and rs.delete_eligible_at <= v_now;

  delete from public.personal_records pr
  using public.retention_status rs
  where pr.user_id = rs.user_id::text
    and rs.status = 'archived'
    and rs.delete_eligible_at <= v_now;

  update public.retention_status
  set status = 'permanently_deleted', permanently_deleted_at = v_now,
      last_evaluated_at = v_now, updated_at = v_now
  where status = 'archived' and delete_eligible_at <= v_now;

  get diagnostics v_count = row_count;
  action_taken := 'permanently_deleted'; affected_count := v_count; return next;

  -- Audit the automated run
  insert into public.retention_audit_log (user_id, action, performed_by, details)
  values (
    '00000000-0000-0000-0000-000000000000',
    'automated_job_completed',
    null,
    jsonb_build_object('ran_at', v_now)
  );
end;
$$;

-- ── Revoke / grant ────────────────────────────────────────────────────────────
revoke execute on function public.is_retention_exempt(uuid)             from anon, public;
revoke execute on function public.archive_user_data(uuid)               from anon, public;
revoke execute on function public.restore_user_data(uuid)               from anon, public;
revoke execute on function public.permanently_delete_user_data(uuid)    from anon, public;
revoke execute on function public.set_retention_exempt(uuid, boolean)   from anon, public;
revoke execute on function public.extend_grace_period(uuid, int)        from anon, public;
revoke execute on function public.get_retention_dashboard()             from anon, public;
revoke execute on function public.run_retention_job()                   from anon, public;

grant execute on function public.is_retention_exempt(uuid)             to authenticated;
grant execute on function public.archive_user_data(uuid)               to authenticated;
grant execute on function public.restore_user_data(uuid)               to authenticated;
grant execute on function public.permanently_delete_user_data(uuid)    to authenticated;
grant execute on function public.set_retention_exempt(uuid, boolean)   to authenticated;
grant execute on function public.extend_grace_period(uuid, int)        to authenticated;
grant execute on function public.get_retention_dashboard()             to authenticated;
grant execute on function public.run_retention_job()                   to authenticated;
