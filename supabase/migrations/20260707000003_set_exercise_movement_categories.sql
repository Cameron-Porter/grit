-- Set movement_category for the curated exercise set using their actual names.
-- The original taxonomy migration used different name variants and missed most rows.

update public.exercises set movement_category = 'Horizontal Press'
where name in (
  'Barbell Bench Press', 'Dumbbell Bench Press', 'Machine Chest Press',
  'Cable Crossover', 'Pec Deck', 'Dumbbell Fly'
);

update public.exercises set movement_category = 'Incline Press'
where name in (
  'Incline Barbell Bench Press', 'Incline Dumbbell Press',
  'Incline Machine Press', 'Cable Fly Low to High'
);

update public.exercises set movement_category = 'Vertical Press'
where name in (
  'Barbell Overhead Press', 'Seated Dumbbell Press',
  'Arnold Press', 'Machine Shoulder Press'
);

update public.exercises set movement_category = 'Lateral Raise'
where name in (
  'Dumbbell Lateral Raise', 'Cable Lateral Raise', 'Machine Lateral Raise'
);

update public.exercises set movement_category = 'Rear Delt'
where name in ('Rear Delt Fly', 'Cable Rear Delt Fly', 'Face Pull');

update public.exercises set movement_category = 'Vertical Pull'
where name in (
  'Pull-Up', 'Lat Pulldown', 'Close-Grip Lat Pulldown', 'Straight-Arm Pulldown'
);

update public.exercises set movement_category = 'Horizontal Pull'
where name in (
  'Barbell Row', 'T-Bar Row', 'Dumbbell Row',
  'Seated Cable Row', 'Chest-Supported Row'
);

update public.exercises set movement_category = 'Elbow Flexion'
where name in (
  'Barbell Curl', 'EZ-Bar Curl', 'Dumbbell Curl', 'Hammer Curl',
  'Preacher Curl', 'Incline Dumbbell Curl', 'Cable Curl'
);

update public.exercises set movement_category = 'Elbow Extension'
where name in (
  'Skull Crusher', 'Dumbbell Overhead Tricep Extension',
  'Cable Overhead Tricep Extension', 'Cable Tricep Pushdown', 'Machine Tricep Press'
);

update public.exercises set movement_category = 'Quad Dominant'
where name in (
  'Barbell Back Squat', 'Front Squat', 'Leg Press',
  'Hack Squat', 'Bulgarian Split Squat', 'Goblet Squat', 'Leg Extension'
);

update public.exercises set movement_category = 'Hip Hinge'
where name in (
  'Romanian Deadlift', 'Stiff-Leg Deadlift', 'Good Morning',
  'Dumbbell Romanian Deadlift'
);

update public.exercises set movement_category = 'Scapular Elevation'
where name in ('Barbell Shrug', 'Dumbbell Shrug', 'Machine Shrug');

update public.exercises set movement_category = 'Knee Flexion'
where name in (
  'Lying Leg Curl', 'Seated Leg Curl', 'Nordic Hamstring Curl', 'Dumbbell Leg Curl'
);

update public.exercises set movement_category = 'Glute Dominant'
where name in (
  'Barbell Hip Thrust', 'Dumbbell Hip Thrust', 'Machine Hip Thrust',
  'Cable Kickback', 'Hip Abduction Machine'
);

update public.exercises set movement_category = 'Calf Raise'
where name in (
  'Standing Calf Raise', 'Leg Press Calf Raise', 'Seated Calf Raise',
  'Dumbbell Calf Raise', 'Bodyweight Calf Raise', 'Donkey Calf Raise'
);

update public.exercises set movement_category = 'Core'
where name in (
  'Cable Crunch', 'Hanging Leg Raise', 'Ab Wheel Rollout',
  'Decline Crunch', 'Plank', 'Pallof Press', 'Dead Bug'
);

-- Forearms / grip
update public.exercises set movement_category = 'Elbow Flexion'
where name in ('Reverse Barbell Curl');

update public.exercises set movement_category = 'Wrist Flexion'
where name in ('Wrist Curl');

update public.exercises set movement_category = 'Core'
where name = 'Farmer''s Walk';
