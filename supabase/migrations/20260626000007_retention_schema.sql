-- ─────────────────────────────────────────────────────────────────────────────
-- Retention schema
--
-- 1. Expand role check constraint to include coach / ambassador / beta_tester
-- 2. Add retention_exempt flag to user_profiles
-- 3. retention_status table — one row per user in any retention state
-- 4. retention_audit_log — immutable log; survives account deletion (no FK)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Expand role constraint ─────────────────────────────────────────────────
alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('user', 'vip', 'admin', 'coach', 'ambassador', 'beta_tester'));

-- ── 2. Retention-exempt flag ──────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists retention_exempt boolean not null default false;

-- ── 3. Retention status ───────────────────────────────────────────────────────
create table if not exists public.retention_status (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  status                  text not null default 'grace_period'
                            check (status in (
                              'grace_period',     -- Day 0–30: sub expired, no data change yet
                              'archived',         -- Day 30–90: data soft-deleted
                              'permanently_deleted' -- Day 90+: data hard-deleted
                            )),
  entered_retention_at    timestamptz not null default now(),
  archive_eligible_at     timestamptz not null,  -- entered + 30 days
  delete_eligible_at      timestamptz not null,  -- entered + 90 days
  archived_at             timestamptz,
  permanently_deleted_at  timestamptz,
  last_evaluated_at       timestamptz not null default now(),
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── 4. Audit log ─────────────────────────────────────────────────────────────
-- No FK on user_id intentionally — log must survive account deletion.
create table if not exists public.retention_audit_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid   not null,
  action       text   not null,  -- grace_period_entered | archived | restored | permanently_deleted | exempted | exemption_removed | grace_extended | manual_*
  performed_by uuid   references auth.users(id) on delete set null,
  details      jsonb  not null default '{}',
  created_at   timestamptz not null default now()
);

-- ── Notification tracking (scaffold — actual send logic requires push infra) ──
create table if not exists public.retention_notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid  not null references auth.users(id) on delete cascade,
  trigger_day  int   not null,   -- 14 | 23 | 30 | 60 | 83 | 90
  sent_at      timestamptz not null default now(),
  channel      text not null default 'push'  -- push | email
);

create unique index if not exists retention_notifications_unique
  on public.retention_notifications(user_id, trigger_day, channel);
