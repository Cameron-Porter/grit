-- ── STEP 1: Add missing user_id columns before any policies reference them ──

alter table personal_records add column if not exists user_id text;
alter table exercises add column if not exists user_id text;

-- ── STEP 2: Enable RLS ──

alter table workouts enable row level security;
alter table workout_sets enable row level security;
alter table programs enable row level security;
alter table program_days enable row level security;
alter table program_exercises enable row level security;
alter table personal_records enable row level security;
alter table workout_feedback enable row level security;
alter table exercises enable row level security;

-- ── STEP 3: Create per-user policies ──

-- Workouts: users see only their own
create policy "users_own_workouts" on workouts
  for all using (auth.uid()::text = user_id);

-- Workout sets: scoped through workout ownership
create policy "users_own_workout_sets" on workout_sets
  for all using (
    workout_id in (
      select id from workouts where user_id = auth.uid()::text
    )
  );

-- Programs: users see only their own
create policy "users_own_programs" on programs
  for all using (auth.uid()::text = user_id);

-- Program days: scoped through program ownership
create policy "users_own_program_days" on program_days
  for all using (
    program_id in (
      select id from programs where user_id = auth.uid()::text
    )
  );

-- Program exercises: scoped through program_day → program
create policy "users_own_program_exercises" on program_exercises
  for all using (
    program_day_id in (
      select pd.id from program_days pd
      join programs p on p.id = pd.program_id
      where p.user_id = auth.uid()::text
    )
  );

-- Personal records: users see only their own
create policy "users_own_personal_records" on personal_records
  for all using (auth.uid()::text = user_id);

-- Workout feedback: scoped through workout ownership
-- (workout_feedback.workout_id is text; workouts.id is uuid — cast both)
create policy "users_own_workout_feedback" on workout_feedback
  for all using (
    workout_id in (
      select id::text from workouts where user_id = auth.uid()::text
    )
  );

-- Exercises: shared system rows + user's own custom rows
create policy "users_read_exercises" on exercises
  for select using (is_custom = false or user_id = auth.uid()::text);

create policy "users_insert_custom_exercises" on exercises
  for insert with check (user_id = auth.uid()::text);

create policy "users_delete_custom_exercises" on exercises
  for delete using (user_id = auth.uid()::text);
