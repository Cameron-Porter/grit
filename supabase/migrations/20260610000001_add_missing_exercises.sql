-- Remove semantic duplicate: Close-Grip Chins = Chin-ups (same exercise, cleaner name wins)
delete from exercises where name = 'Close-Grip Chins' and muscle_group = 'Back';

-- Add exercises missing from the initial seed

insert into exercises (name, muscle_group, equipment, is_custom)
select v.name, v.muscle_group, v.equipment, false
from (values
  -- Lunges (reverse + stationary bodyweight variants were absent)
  ('Reverse Lunge',                       'Quads',      'Bodyweight'),
  ('Weighted Reverse Lunge',              'Quads',      'Bodyweight Loadable'),
  ('Dumbbell Reverse Lunge',              'Quads',      'Dumbbell'),
  ('Barbell Reverse Lunge',               'Quads',      'Barbell'),
  ('Bodyweight Lunge',                    'Quads',      'Bodyweight'),
  ('Dumbbell Reverse Lunge (Glute Focus)','Glutes',     'Dumbbell'),
  ('Bodyweight Reverse Lunge',            'Glutes',     'Bodyweight')
) as v(name, muscle_group, equipment)
where not exists (
  select 1 from exercises e
  where e.name = v.name and e.muscle_group = v.muscle_group
);
