-- Fixes a dangling exercise-name reference left behind by the
-- 20260629000001 dedup migration: that migration deleted the catalog row
-- for 'Dumbbell Incline Flyes' (kept 'Incline Dumbbell Flyes' as canonical),
-- but only touched the `exercises` table. Any program_exercises /
-- program_day_targets / workout_sets / personal_records rows already using
-- the old duplicate name as free text were left unchanged, so they now
-- reference a name that exists nowhere in the live catalog (or in the local
-- exerciseDatabase.ts rules-engine fixture, which only carries the
-- canonical name) — confirmed still present in at least one user's active
-- program_exercises data.

-- program_exercises: simple rename, no uniqueness constraint.
update program_exercises
set exercise_name = 'Incline Dumbbell Flyes'
where exercise_name = 'Dumbbell Incline Flyes';

-- program_day_targets: simple rename, no uniqueness constraint.
update program_day_targets
set exercise_name = 'Incline Dumbbell Flyes'
where exercise_name = 'Dumbbell Incline Flyes';

-- workout_sets: simple rename, no uniqueness constraint (append-only log).
update workout_sets
set exercise_name = 'Incline Dumbbell Flyes'
where exercise_name = 'Dumbbell Incline Flyes';

-- personal_records: unique constraint is (exercise_name, user_id) (see
-- 20260605000007), so a user who already logged a PR under both names
-- would hit a constraint violation on a blind rename. Keep whichever PR is
-- heavier per user and drop the other before renaming.
with conflicts as (
  select id, user_id, weight,
         row_number() over (partition by user_id order by weight desc, id) as rn
  from personal_records
  where exercise_name in ('Dumbbell Incline Flyes', 'Incline Dumbbell Flyes')
),
losers as (
  select id from conflicts where rn > 1
)
delete from personal_records where id in (select id from losers);

update personal_records
set exercise_name = 'Incline Dumbbell Flyes'
where exercise_name = 'Dumbbell Incline Flyes';
