alter table workout_sets
  add column if not exists exercise_index int;
