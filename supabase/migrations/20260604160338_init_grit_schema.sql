-- WORKOUTS TABLE
create table workouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp default now(),
  user_id text,
  completed_at timestamp,
  name text
);

-- SETS TABLE
create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise_name text,
  set_index int,
  reps int,
  weight int,
  completed boolean default false
);