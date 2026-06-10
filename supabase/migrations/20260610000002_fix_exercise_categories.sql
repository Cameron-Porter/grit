-- Fix exercise muscle group miscategorizations

-- Abs → Glutes: these are hip extension / abduction movements, not core exercises
update exercises
set muscle_group = 'Glutes'
where muscle_group = 'Abs'
  and name in (
    'Bench Kickbacks',
    'Side Leg Raises',
    'Bent-Knee Side Leg Raises',
    'Front Kicks',
    'Rear Leg Scissors'
  );

-- Back → Traps: shrugs and heavy upright rows target traps, not lats/back
update exercises
set muscle_group = 'Traps'
where muscle_group = 'Back'
  and name in (
    'Barbell Shrugs',
    'Dumbbell Shrugs',
    'Smith Machine Shrugs',
    'Cable Shrugs',
    'Heavy Upright Rows'
  );
