-- "Dumbbell Fly" and "Dumbbell Flyes" are the same movement, existing as two
-- separate rows in the exercises catalog. "Dumbbell Flyes" is the original
-- seed (20260605000001) with full taxonomy/description/rules metadata,
-- already chosen as canonical for other Fly duplicates by the
-- 20260629000001 dedup migration. "Dumbbell Fly" was added later by
-- 20260722000002_sync_local_exercise_database.sql, which added the local
-- rules-fixture's name to Supabase without recognizing it as the same
-- exercise as the existing "Dumbbell Flyes" row — the same class of drift
-- already fixed once this session for "Overhead Tricep Extension (Dumbbell)"
-- vs "Dumbbell Overhead Tricep Extension".

-- program_exercises: simple rename, no uniqueness constraint.
update program_exercises
set exercise_name = 'Dumbbell Flyes'
where exercise_name = 'Dumbbell Fly';

-- program_day_targets: simple rename, no uniqueness constraint.
update program_day_targets
set exercise_name = 'Dumbbell Flyes'
where exercise_name = 'Dumbbell Fly';

-- workout_sets: simple rename, no uniqueness constraint (append-only log).
update workout_sets
set exercise_name = 'Dumbbell Flyes'
where exercise_name = 'Dumbbell Fly';

-- personal_records: unique constraint is (exercise_name, user_id), so a
-- user who already logged a PR under both names would hit a constraint
-- violation on a blind rename. Keep whichever PR is heavier per user and
-- drop the other before renaming (same pattern as 20260731000001).
with conflicts as (
  select id, user_id, weight,
         row_number() over (partition by user_id order by weight desc, id) as rn
  from personal_records
  where exercise_name in ('Dumbbell Fly', 'Dumbbell Flyes')
),
losers as (
  select id from conflicts where rn > 1
)
delete from personal_records where id in (select id from losers);

update personal_records
set exercise_name = 'Dumbbell Flyes'
where exercise_name = 'Dumbbell Fly';

-- Now safe to remove the duplicate catalog row — nothing references it anymore.
delete from exercises where is_custom = false and name = 'Dumbbell Fly';
