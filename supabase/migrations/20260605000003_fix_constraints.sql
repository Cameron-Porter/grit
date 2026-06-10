-- Fix personal_records: drop functional index, add proper unique constraint
drop index if exists personal_records_exercise_lower_idx;
alter table personal_records add constraint personal_records_exercise_name_unique unique (exercise_name);

-- Track which program a workout came from (used for history display)
alter table workouts add column if not exists program_name text;
alter table workouts add column if not exists program_day_id text;
