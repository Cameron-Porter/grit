-- Actual effort is distinct from workout_sets.rir, which is the prescribed
-- target pre-filled when the workout starts.
alter table public.workout_sets
  add column if not exists reported_rir integer
  check (reported_rir between 0 and 10);
