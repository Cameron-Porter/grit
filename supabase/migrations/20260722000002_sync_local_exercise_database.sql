-- Sync the curated exercise names used by src/data/exerciseDatabase.ts (the
-- rules-engine test fixture) and src/data/programTemplates.ts into the real
-- exercises table. Supabase is the single source of truth for what a user can
-- select and log; the local file must never be the origin of a name that
-- doesn't exist here too.
--
-- Several of these names were already assumed to exist by earlier metadata
-- migrations (20260612000001 exercise_tags/hard_rir_floor, 20260707000003
-- movement_category — the latter's own header admits "missed most rows")
-- but were never actually inserted, so those UPDATE statements silently
-- matched zero rows. This backfills the rows with the metadata those
-- migrations intended, so the tagging finally takes effect.
insert into exercises (
  name, muscle_group, equipment, is_custom,
  movement_category, fatigue_rating, rep_range_min, rep_range_max, beginner_suitable,
  hard_rir_floor, exercise_tags
)
select v.name, v.muscle_group, v.equipment, false,
       v.movement_category, v.fatigue_rating, v.rep_range_min, v.rep_range_max, v.beginner_suitable,
       v.hard_rir_floor, v.exercise_tags
from (values
  ('Incline Machine Press',              'Chest',      'Machine',    'Incline Press',    'high',      6,  12, true,  null::int, null::text[]),
  ('Pec Deck',                            'Chest',      'Machine',    'Horizontal Press', 'low',       12, 20, true,  null::int, null::text[]),
  ('Dumbbell Fly',                        'Chest',      'Dumbbell',   'Horizontal Press', 'medium',    10, 20, true,  null::int, null::text[]),
  ('Cable Fly Low to High',               'Chest',      'Cable',      'Incline Press',    'medium',    10, 20, true,  null::int, null::text[]),
  ('Pull-Up',                             'Back',       'Bodyweight', 'Vertical Pull',    'high',      4,  12, false, null::int, null::text[]),
  ('Barbell Row',                         'Back',       'Barbell',    'Horizontal Pull',  'high',      5,  12, false, null::int, array['barbell-row']),
  ('Dumbbell Row',                        'Back',       'Dumbbell',   'Horizontal Pull',  'medium',    8,  15, true,  null::int, null::text[]),
  ('Chest-Supported Row',                 'Back',       'Dumbbell',   'Horizontal Pull',  'medium',    8,  15, true,  null::int, null::text[]),
  ('Rear Delt Fly',                       'Shoulders',  'Dumbbell',   'Rear Delt',        'low',       12, 20, true,  null::int, null::text[]),
  ('Cable Rear Delt Fly',                 'Shoulders',  'Cable',      'Rear Delt',        'low',       12, 20, true,  null::int, null::text[]),
  ('Dumbbell Curl',                       'Biceps',     'Dumbbell',   'Elbow Flexion',    'low',       8,  15, true,  null::int, null::text[]),
  ('Preacher Curl',                       'Biceps',     'Barbell',    'Elbow Flexion',    'low',       8,  15, true,  null::int, null::text[]),
  ('Skull Crusher',                       'Triceps',    'Barbell',    'Elbow Extension',  'medium',    6,  12, true,  null::int, array['overheadExtension']),
  ('Dumbbell Overhead Tricep Extension',  'Triceps',    'Dumbbell',   'Elbow Extension',  'low',       10, 20, true,  null::int, array['overheadExtension']),
  ('Cable Overhead Tricep Extension',     'Triceps',    'Cable',      'Elbow Extension',  'low',       10, 20, true,  null::int, array['overheadExtension']),
  ('Cable Tricep Pushdown',               'Triceps',    'Cable',      'Elbow Extension',  'low',       10, 20, true,  null::int, null::text[]),
  ('Machine Tricep Press',                'Triceps',    'Machine',    'Elbow Extension',  'low',       10, 20, true,  null::int, null::text[]),
  ('Front Squat',                         'Quads',      'Barbell',    'Quad Dominant',    'very_high', 3,  10, false, null::int, null::text[]),
  ('Romanian Deadlift',                   'Hamstrings', 'Barbell',    'Hip Hinge',        'high',      6,  12, true,  1,         array['deadlift']),
  ('Dumbbell Romanian Deadlift',          'Hamstrings', 'Dumbbell',   'Hip Hinge',        'high',      6,  12, true,  null::int, null::text[]),
  ('Dumbbell Leg Curl',                   'Hamstrings', 'Dumbbell',   'Knee Flexion',     'medium',    10, 20, true,  null::int, null::text[]),
  ('Bodyweight Calf Raise',               'Calves',     'Bodyweight', 'Calf Raise',       'low',       12, 25, true,  null::int, null::text[]),
  ('Decline Crunch',                      'Abs',        'Bodyweight', 'Core',             'low',       12, 20, true,  null::int, null::text[]),
  ('Wrist Curl',                          'Forearms',   'Barbell',    'Wrist Flexion',    'low',       12, 25, true,  null::int, null::text[])
) as v(name, muscle_group, equipment, movement_category, fatigue_rating, rep_range_min, rep_range_max, beginner_suitable, hard_rir_floor, exercise_tags)
where not exists (
  select 1 from exercises e where e.name = v.name and e.muscle_group = v.muscle_group
);
