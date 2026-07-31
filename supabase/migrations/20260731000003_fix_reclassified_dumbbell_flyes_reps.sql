-- "Dumbbell Flyes" (Chest) was saved with role = 'Primary' in program_exercises
-- from generation time, but it's genuinely an isolation movement — the role
-- persistence fix (20260730000001_program_exercises_add_role.sql) never
-- retroactively re-inferred roles until backfillWeek1ExerciseRoles ran, which
-- (now that 'Dumbbell Flyes' exists in exerciseDatabase.ts as an isolation
-- exercise) correctly reclassified it to 'Accessory'. That backfill only
-- updates the `role` column, not target_reps_min/target_reps_max, so rows
-- reclassified this way are left with a stale Primary-tier rep range
-- (5-10) that doesn't match any Accessory doctrine tier.
--
-- This corrects target_reps_min/target_reps_max to the Accessory tier
-- matching the muscle's current priority (see slotRoleConfig.ts's
-- SLOT_ROLE_CONFIGS.Accessory, post-HV-024): emphasize -> 10-25,
-- grow/maintain -> 12-25. Looked up live from programs.muscle_priorities
-- rather than hardcoded, since a program's muscle priorities can change
-- after generation.
--
-- Scoped tightly: only rows still at the exact stale Primary-tier value
-- (5-10) with role already corrected to 'Accessory', so this can't touch a
-- row a user has already customized or a differently-classified use of the
-- same exercise name.
update program_exercises pe
set
  target_reps_min = case
    when p.muscle_priorities->>'Chest' = 'emphasize' then 10
    else 12
  end,
  target_reps_max = 25
from program_days pd
join programs p on p.id = pd.program_id
where pe.program_day_id = pd.id
  and pe.exercise_name = 'Dumbbell Flyes'
  and pe.muscle_group = 'Chest'
  and pe.role = 'Accessory'
  and pe.target_reps_min = 5
  and pe.target_reps_max = 10;
