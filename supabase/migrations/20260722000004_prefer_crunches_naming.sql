-- The original 20260629000001 dedup kept 'Crunch' over 'Crunches' — product
-- preference is the other way around. Merge Crunch's taxonomy/description
-- metadata into Crunches (never populated on the CSV-seeded row) before
-- dropping the now-redundant singular row, so nothing from the taxonomy
-- pass (20260609000001) or description pass (20260605000004) is lost.
-- Verified zero rows in program_exercises/workout_sets reference 'Crunch'
-- before writing this; even if they did, both tables denormalize
-- exercise_name as their own copy and never re-query this table, so
-- existing programs/history are unaffected regardless.
update exercises c
set description = s.description,
    movement_category = s.movement_category,
    fatigue_rating = s.fatigue_rating,
    rep_range_min = s.rep_range_min,
    rep_range_max = s.rep_range_max,
    beginner_suitable = s.beginner_suitable,
    hard_rir_floor = s.hard_rir_floor,
    exercise_tags = s.exercise_tags
from exercises s
where c.name = 'Crunches' and c.is_custom = false
  and s.name = 'Crunch' and s.is_custom = false;

delete from exercises
where name = 'Crunch' and is_custom = false;
