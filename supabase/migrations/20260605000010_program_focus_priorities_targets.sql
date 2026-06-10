-- Program training focus and muscle priorities
alter table programs add column if not exists focus text default 'hypertrophy';
alter table programs add column if not exists muscle_priorities jsonb default '{}';

-- AI-suggested targets on week-1 template exercises
alter table program_exercises add column if not exists target_reps_min int default 8;
alter table program_exercises add column if not exists target_reps_max int default 12;
alter table program_exercises add column if not exists target_weight float default 0;
alter table program_exercises add column if not exists rir int default 3;

-- Progressive overload targets for specific program days (week 2+)
create table if not exists program_day_targets (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid references program_days(id) on delete cascade,
  exercise_name text not null,
  target_sets int not null default 3,
  target_reps_min int not null default 8,
  target_reps_max int not null default 12,
  target_weight float not null default 0,
  rir int not null default 2,
  ai_rationale text,
  created_at timestamp default now(),
  unique(program_day_id, exercise_name)
);
