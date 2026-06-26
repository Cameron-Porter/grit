-- ─────────────────────────────────────────────────────────────────────────────
-- Soft delete columns
--
-- Added only to root-level tables. Cascade-delete relationships mean child
-- rows (workout_sets, program_days, program_exercises, etc.) become
-- unreachable once the parent is soft-deleted. Hard deletion at Day 90
-- deletes from root tables and lets ON DELETE CASCADE clean up children.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.workouts          add column if not exists deleted_at timestamptz;
alter table public.programs          add column if not exists deleted_at timestamptz;
alter table public.personal_records  add column if not exists deleted_at timestamptz;

-- Partial indexes — only index the rows that are actually soft-deleted.
-- Normal queries filter WHERE deleted_at IS NULL and hit the base index.
create index if not exists idx_workouts_soft_deleted
  on public.workouts(user_id) where deleted_at is not null;

create index if not exists idx_programs_soft_deleted
  on public.programs(user_id) where deleted_at is not null;

create index if not exists idx_personal_records_soft_deleted
  on public.personal_records(user_id) where deleted_at is not null;
