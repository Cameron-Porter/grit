-- WORKOUT FEEDBACK per muscle group
create table workout_feedback (
  id uuid primary key default gen_random_uuid(),
  workout_id text,
  muscle_group text not null,
  joint_pain text,
  pump text,
  volume text,
  created_at timestamp default now()
);

-- PERSONAL RECORDS per exercise
create table personal_records (
  id uuid primary key default gen_random_uuid(),
  exercise_name text not null,
  weight numeric not null default 0,
  reps integer,
  achieved_at timestamp default now(),
  updated_at timestamp default now()
);
create unique index personal_records_exercise_lower_idx on personal_records (lower(exercise_name));
