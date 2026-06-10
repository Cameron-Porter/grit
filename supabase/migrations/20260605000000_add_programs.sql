-- PROGRAMS TABLE
create table programs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  name text not null,
  total_weeks int not null default 4,
  days_per_week int not null default 4,
  is_current boolean default false,
  created_at timestamp default now()
);

-- PROGRAM DAYS TABLE
create table program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade,
  week_number int not null,
  day_number int not null,
  label text,
  completed boolean default false,
  completed_at timestamp
);

-- PROGRAM EXERCISES TABLE
create table program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid references program_days(id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  equipment text,
  sort_order int default 0,
  target_sets int default 3
);
