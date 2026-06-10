-- Store exercise-level metadata alongside each set row so the workout history
-- is fully self-contained without needing joins back to other tables.
alter table workout_sets add column if not exists muscle_group text;
alter table workout_sets add column if not exists equipment text;
alter table workout_sets add column if not exists note text;
