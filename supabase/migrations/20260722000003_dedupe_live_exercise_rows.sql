-- Full reconciliation pass between the live exercises table and the
-- rules-engine dataset (src/data/exerciseDatabase.ts), following up on
-- 20260722000002. Two classes of bug found:
--
-- 1. ~40 exercise names were inserted twice, byte-for-byte identical
--    (name, muscle_group, equipment), because 20260605000001 and
--    20260609000004_seed_csv_exercises.sql both seeded the same exercise
--    under the same name without a not-exists guard, and the 20260629000001
--    dedup pass only covered differently-named duplicates. These show up
--    twice in the live ExercisePicker for no reason.
--
-- 2. Three names ended up representing two genuinely different exercises
--    under one shared name (seed1 vs seed2 disagreeing on equipment):
--      - 'Standing Calf Raise': Machine (seed1) vs Bodyweight (seed2)
--      - 'Bulgarian Split Squat': Dumbbell (seed1) vs Bodyweight (seed2)
--      - 'Donkey Calf Raise': Bodyweight Loadable (seed1) vs Bodyweight (seed2)
--
-- Safety: no other table has a foreign key into exercises.id — checked all
-- migrations, confirmed program_exercises and workout_sets both denormalize
-- exercise_name/muscle_group/equipment as their own plain-text columns at
-- write time (see 20260605000000_add_programs.sql, pendingWorkouts.ts insert)
-- and never re-query the exercises table afterward. There are also no views
-- or triggers referencing exercises.id. So nothing in an existing program or
-- workout's history can be affected by removing a catalog row — those rows
-- already carry their own copy of whatever equipment the user actually used.
-- The only real question per row below is whether removing it drops an
-- exercise a user could otherwise no longer pick going forward:
--
--   - 'Standing Calf Raise' (Bodyweight) → DELETE. Equivalent already exists
--     under its own clean name, 'Bodyweight Calf Raise' (added by the prior
--     migration, matches src/data/exerciseDatabase.ts ca-05). Nothing lost.
--   - 'Donkey Calf Raise' (Bodyweight Loadable) → DELETE. Equivalent already
--     exists as 'Weighted Donkey Calf Raise' (Bodyweight Loadable, seed2).
--     Nothing lost.
--   - 'Bulgarian Split Squat' (Bodyweight) → RENAME, not delete. This is a
--     genuinely distinct, unweighted variant with no equivalent anywhere else
--     in the catalog ('Bulgarian Split Squat' keeps the Dumbbell-loaded row,
--     'Weighted Bulgarian Split Squat' is the Bodyweight Loadable row — the
--     bare bodyweight version has no substitute). Renamed instead of dropped
--     so it stays selectable.

-- ─── 1. Collapse exact duplicates (official rows only, never touches user customs) ───
delete from exercises a
using exercises b
where a.is_custom = false
  and b.is_custom = false
  and a.name = b.name
  and a.muscle_group = b.muscle_group
  and a.equipment = b.equipment
  and a.ctid > b.ctid;

-- ─── 2. Resolve same-name/different-equipment conflicts ───
delete from exercises
where is_custom = false and name = 'Standing Calf Raise' and muscle_group = 'Calves' and equipment = 'Bodyweight';

delete from exercises
where is_custom = false and name = 'Donkey Calf Raise' and muscle_group = 'Calves' and equipment = 'Bodyweight Loadable';

update exercises set name = 'Bodyweight Bulgarian Split Squat'
where is_custom = false and name = 'Bulgarian Split Squat' and muscle_group = 'Quads' and equipment = 'Bodyweight';
