-- ─────────────────────────────────────────────────────────────────────────────
-- Retention RLS + pg_cron scheduling
-- ─────────────────────────────────────────────────────────────────────────────

-- ── RLS on retention tables ───────────────────────────────────────────────────

alter table public.retention_status      enable row level security;
alter table public.retention_audit_log   enable row level security;
alter table public.retention_notifications enable row level security;

-- Users can read their own retention status (so the app can show messaging)
create policy "users_read_own_retention_status"
  on public.retention_status for select
  using (auth.uid() = user_id);

-- Admins have full access to retention_status
create policy "admins_manage_retention_status"
  on public.retention_status for all
  using  (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Only admins can read the audit log
create policy "admins_read_audit_log"
  on public.retention_audit_log for select
  using (public.get_my_role() = 'admin');

-- Users can read their own notification records (for "you have X days" banners)
create policy "users_read_own_notifications"
  on public.retention_notifications for select
  using (auth.uid() = user_id);

-- Admins manage notifications
create policy "admins_manage_notifications"
  on public.retention_notifications for all
  using  (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ── updated_at trigger for retention_status ───────────────────────────────────
create trigger touch_retention_status_updated_at
  before update on public.retention_status
  for each row execute function public.touch_updated_at();

-- ── pg_cron: daily retention job at 02:00 UTC ─────────────────────────────────
-- Requires pg_cron extension (enable in Supabase Dashboard → Database → Extensions).
-- If pg_cron is not available, call run_retention_job() manually or via Edge Function.
--
-- Uncomment the block below once pg_cron is enabled:
--
select cron.schedule(
  'grit-retention-daily',
  '0 2 * * *',
  'select public.run_retention_job()'
);
