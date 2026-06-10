-- The original unique constraint on personal_records was (exercise_name) globally.
-- With RLS, each user can only see their own rows, but the constraint still blocked
-- different users from having a PR for the same exercise.
-- Fix: scope the constraint to (exercise_name, user_id).

alter table personal_records
  drop constraint if exists personal_records_exercise_name_unique;

alter table personal_records
  add constraint personal_records_exercise_name_user_unique
  unique (exercise_name, user_id);
