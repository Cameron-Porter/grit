alter table workout_sets
  add column if not exists muscle_priority text check (muscle_priority in ('emphasize', 'grow', 'maintain'));
