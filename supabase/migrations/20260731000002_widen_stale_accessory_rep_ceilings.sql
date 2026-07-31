-- HV-024 widened the default hypertrophy Accessory-role rep ceiling from a
-- flat 20 to 25 (emphasize/grow/maintain tiers) / 30 (mev tier), per RP
-- Strength "Hypertrophy Made Simple" (2023) — see src/data/slotRoleConfig.ts.
-- That change only affects newly-generated programs: computeAndSaveProgressionTargets
-- reads its rep ceiling from the already-persisted program_exercises row
-- (the frozen Week 1 template), not live from slotRoleConfig.ts, so existing
-- programs created before this fix are still frozen at the old 20 ceiling.
--
-- This updates the specific exercises confirmed still on the old ceiling
-- (Accessory role, target_reps_max = 20) to the new default of 25. Scoped by
-- both role and the exact old value so it can't touch a row a user has
-- already customized away from the old default, and can't touch a
-- differently-classified use of the same exercise name.
update program_exercises
set target_reps_max = 25
where role = 'Accessory'
  and target_reps_max = 20
  and exercise_name in (
    'Incline Dumbbell Flyes',
    'Leaning Dumbbell Lateral Raise',
    'Dumbbell Rear Delt Flyes'
  );
