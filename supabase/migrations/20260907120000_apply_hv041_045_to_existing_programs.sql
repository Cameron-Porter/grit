-- Bring existing programs onto the HV-041..HV-045 doctrine.
--
-- The rules-engine changes take effect the next time progression is computed,
-- but two kinds of already-stored row predate them and will not correct
-- themselves:
--
--   1. program_exercises  — the week-1 template. Its rep band was written at
--      program-build time, before HV-043 added per-muscle rep floors, so an
--      existing program still prescribes 5-10 reps for calves, abs and
--      forearms. Every future week is derived from this row, so it never heals.
--
--   2. program_day_targets — targets already computed by the old engine, which
--      sized load jumps from the weight rather than the equipment (HV-041) and
--      applied no proportional cap (HV-042). These hold values like a 77.5 lb
--      dumbbell.
--
-- HV-045 (per-set rep targets) needs nothing here: it is derived at render time
-- from logged history.
--
-- Nothing in this migration touches `workouts` or `workout_sets`. Logged
-- history is the input the engine recomputes from and is left exactly as it is.

-- ─── HV-043: raise rep floors for muscles that cannot be loaded low ─────────
-- Floors only: a band already at or above these is left alone. Applied to the
-- week-1 template so every week derived from it inherits the corrected band.
update program_exercises pe
set target_reps_min = greatest(coalesce(pe.target_reps_min, floors.reps_min), floors.reps_min),
    target_reps_max = greatest(coalesce(pe.target_reps_max, floors.reps_max), floors.reps_max)
from (values
  ('Calves', 10, 20),
  ('Forearms', 10, 20),
  ('Abs', 10, 25)
) as floors(muscle, reps_min, reps_max)
where pe.muscle_group = floors.muscle
  and (coalesce(pe.target_reps_min, 0) < floors.reps_min
    or coalesce(pe.target_reps_max, 0) < floors.reps_max);

-- The same floors on targets already generated for days not yet performed.
-- muscle_group is not stored on the target row, so it is resolved through the
-- exercise catalog by name.
update program_day_targets t
set target_reps_min = greatest(t.target_reps_min, floors.reps_min),
    target_reps_max = greatest(t.target_reps_max, floors.reps_max)
from exercises e,
     program_days d,
     (values
       ('Calves', 10, 20),
       ('Forearms', 10, 20),
       ('Abs', 10, 25)
     ) as floors(muscle, reps_min, reps_max)
where e.name = t.exercise_name
  and e.muscle_group = floors.muscle
  and d.id = t.program_day_id
  and d.completed = false
  and d.skipped = false
  and (t.target_reps_min < floors.reps_min or t.target_reps_max < floors.reps_max);

-- ─── HV-041/HV-042: recompute stale loads from logged history ──────────────
-- The old engine's weights cannot be corrected in SQL, because the correction
-- is the rules engine itself. Zeroing the stored weight hands the decision back
-- to it: app/workout/page.tsx treats a zero target as missing and calls
-- recoverMissingTarget(), which re-derives the load from that exercise's logged
-- sessions using the current engine, at render time.
--
-- Scoped to days that have not been performed. Completed and skipped days keep
-- their stored targets so past sessions still read back as they were prescribed.
-- Bodyweight exercises are left alone: their "weight" is the lifter's body
-- weight, not an engine-chosen load, and the app keeps that row regardless.
update program_day_targets t
set target_weight = 0
from program_days d
where d.id = t.program_day_id
  and d.completed = false
  and d.skipped = false
  and t.target_weight > 0
  and exists (
    select 1 from exercises e
    where e.name = t.exercise_name
      and coalesce(e.equipment, '') <> 'Bodyweight'
  );
