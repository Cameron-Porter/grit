-- User-specific data fix: program_day_targets for program "Mid Summer"
-- (03c02b93-fbc8-4a6d-bae9-aed703b7638c), week 3 day 1
-- (program_day_id 66a69d47-55fe-4346-870b-3f010dbba8af, not yet completed).
--
-- These rows were computed 2026-07-27 (right after week 2 day 1 finished),
-- before three fixes landed that should have changed their outcome:
--
--   1. ST-010 (2026-08-03, progressionEngine.ts): removed the 1.25 lb /
--      2.5 lb micro-loading tiers from getLoadIncrement — every load
--      increment is now a flat 5 lb, no exceptions.
--   2. 20260731000003_fix_reclassified_dumbbell_flyes_reps.sql widened
--      Dumbbell Flyes' Accessory rep band from the stale Primary-tier 5-10
--      to 10-25, but nothing re-ran computeAndSaveProgressionTargets
--      afterward, so this row stayed frozen on the old band's outcome.
--   3. VA-014 (2026-08-03, volumeRamp.ts + progressionEngine.ts): the
--      HV-021 muscle-level set-count ramp (which wins outright over the
--      per-exercise ramp for every exercise below, since this program is
--      hypertrophy-focus) now shifts its ramp step by the muscle's reported
--      soreness instead of always advancing with mesoWeek. This user
--      reported "Just in time" for Chest, Shoulders, and Triceps after week
--      2 day 1 — recovery and volume were matched, the doctrine signal for
--      "at the recoverable ceiling, don't push further" — but the stale
--      rows below still reflect an unconditional week-3 ramp step.
--
-- Recomputed by running the current (fixed) recommendProgression /
-- rampSets against this user's actual logged session history and reported
-- soreness for each exercise.
--
--   Dumbbell Flyes: under the corrected 10-25 rep band, last session's
--   15 reps @ 35 lb sits inside the band, not at the ceiling — the correct
--   action is HOLD at 35 lb, aim for 16 reps next session (not the stale
--   ADVANCE_LOAD to 36.25 lb @ 5 reps). Sets: the "Just in time" ramp step
--   for Chest (frequency 2, emphasize) drops from 5 to 3.
--
--   Incline Dumbbell Press: weight/reps unchanged (already a flat 5 lb
--   Primary-role increment). Sets drop from 4 to 3 (Chest "Just in time").
--
--   Dumbbell Overhead Press: weight/reps unchanged (already flat 5 lb).
--   Sets drop from 5 to 3 (Shoulders "Just in time", frequency 2).
--
--   Dumbbell Lateral Raise: still a genuine ceiling hit (12/12 reps) — just
--   re-priced at the flat 5 lb increment instead of the removed 1.25 lb
--   tier (25 -> 30, not 26.25). Sets drop from 3 to 2 (Shoulders "Just in
--   time").
--
--   Overhead Tricep Extension: unchanged. Triceps has only this one
--   exercise, so HV-023's single-exercise cap (5 sets) already capped both
--   the stale and the corrected value to 5 — the soreness shift doesn't
--   surface here since both land above the cap.
--
-- Scoped by exact row id plus each row's known stale value, so this can't
-- touch a row if the user has since logged today's workout or hand-edited
-- it themselves.

update program_day_targets
set
  target_sets = 3,
  target_reps_min = 10,
  target_reps_max = 16,
  target_weight = 35,
  ai_rationale = '15/25 reps at 35 lb. Aim for 16 next session.'
where id = 'c09ab91b-1f55-43a7-9b83-bbf83d5436b8'
  and target_sets = 5
  and target_weight = 36.25;

update program_day_targets
set
  target_sets = 3
where id = '63c9a665-c443-49bf-b9a2-57d49e557edf'
  and target_sets = 4
  and target_weight = 80;

update program_day_targets
set
  target_sets = 3
where id = 'e0537e6e-43e7-475c-a0c1-b5d366c0c5aa'
  and target_sets = 5
  and target_weight = 60;

update program_day_targets
set
  target_sets = 2,
  target_weight = 30,
  ai_rationale = 'Hit ceiling (12 reps × 25 lb). Double progression: add 5 lb → target 8 reps at new load.'
where id = 'c64ca52b-2e7f-4932-a674-14f31ab1e136'
  and target_sets = 3
  and target_weight = 26.25;
