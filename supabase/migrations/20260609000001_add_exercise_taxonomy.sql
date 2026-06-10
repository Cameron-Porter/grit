-- Add taxonomy columns to exercises table
alter table exercises
  add column if not exists movement_category text,
  add column if not exists fatigue_rating text check (fatigue_rating in ('low','medium','high','very_high')),
  add column if not exists rep_range_min integer,
  add column if not exists rep_range_max integer,
  add column if not exists beginner_suitable boolean default true;

-- ─────────────────────────────────────────────────────────────────────────────
-- HORIZONTAL PRESS — compound presses
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Horizontal Press', fatigue_rating = 'high',
  rep_range_min = 5, rep_range_max = 12, beginner_suitable = true
where name in (
  'Barbell Bench Press',
  'Decline Barbell Bench Press',
  'Dumbbell Bench Press',
  'Machine Chest Press',
  'Smith Machine Bench Press',
  'Chest Dips',
  'Weighted Push-Up'
);

update exercises set
  movement_category = 'Horizontal Press', fatigue_rating = 'medium',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = true
where name in (
  'Decline Dumbbell Press',
  'Push-Up'
);

-- Horizontal Press — isolation/cable flyes
update exercises set
  movement_category = 'Horizontal Press', fatigue_rating = 'medium',
  rep_range_min = 10, rep_range_max = 20, beginner_suitable = true
where name in (
  'Dumbbell Flyes',
  'Cable Crossover',
  'High-to-Low Cable Fly'
);

update exercises set
  movement_category = 'Horizontal Press', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 20, beginner_suitable = true
where name in (
  'Pec Deck Fly'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INCLINE PRESS — upper chest emphasis
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Incline Press', fatigue_rating = 'high',
  rep_range_min = 6, rep_range_max = 12, beginner_suitable = true
where name in (
  'Incline Barbell Bench Press',
  'Incline Dumbbell Press',
  'Smith Machine Incline Press'
);

update exercises set
  movement_category = 'Incline Press', fatigue_rating = 'medium',
  rep_range_min = 10, rep_range_max = 20, beginner_suitable = true
where name in (
  'Incline Dumbbell Flyes',
  'Low-to-High Cable Fly'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERTICAL PRESS — overhead compounds
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Vertical Press', fatigue_rating = 'high',
  rep_range_min = 5, rep_range_max = 12, beginner_suitable = true
where name in (
  'Barbell Overhead Press',
  'Standing Dumbbell Press'
);

update exercises set
  movement_category = 'Vertical Press', fatigue_rating = 'medium',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = true
where name in (
  'Seated Dumbbell Press',
  'Arnold Press',
  'Machine Shoulder Press',
  'Smith Machine Overhead Press'
);

-- Vertical Press — isolation (lateral/front raises)
update exercises set
  movement_category = 'Vertical Press', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 25, beginner_suitable = true
where name in (
  'Dumbbell Lateral Raise',
  'Cable Lateral Raise',
  'Dumbbell Front Raise',
  'Cable Front Raise'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HORIZONTAL PULL — rows and rear delt work
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Horizontal Pull', fatigue_rating = 'high',
  rep_range_min = 5, rep_range_max = 12, beginner_suitable = false
where name in (
  'Barbell Row (Bent Over)',
  'Barbell Row (Underhand Grip)',
  'T-Bar Row'
);

update exercises set
  movement_category = 'Horizontal Pull', fatigue_rating = 'medium',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = true
where name in (
  'Seated Cable Row',
  'Single-Arm Cable Row',
  'Dumbbell Row (Single-Arm)',
  'Dumbbell Row (Supported)',
  'Chest-Supported Machine Row',
  'Machine Row'
);

-- Horizontal Pull — rear delt isolation
update exercises set
  movement_category = 'Horizontal Pull', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 20, beginner_suitable = true
where name in (
  'Bent-Over Rear Delt Fly',
  'Reverse Pec Deck',
  'Face Pull',
  'Barbell Upright Row',
  'Dumbbell Upright Row'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERTICAL PULL — lat pulldowns and pull-ups
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Vertical Pull', fatigue_rating = 'high',
  rep_range_min = 4, rep_range_max = 12, beginner_suitable = false
where name in (
  'Pull-Up (Wide Grip)',
  'Pull-Up (Normal Grip)',
  'Chin-Up',
  'Weighted Pull-Up'
);

update exercises set
  movement_category = 'Vertical Pull', fatigue_rating = 'medium',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = true
where name in (
  'Wide-Grip Lat Pulldown',
  'Close-Grip Lat Pulldown'
);

update exercises set
  movement_category = 'Vertical Pull', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 20, beginner_suitable = true
where name in (
  'Straight-Arm Pulldown'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- QUAD DOMINANT — squat patterns
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Quad Dominant', fatigue_rating = 'very_high',
  rep_range_min = 3, rep_range_max = 10, beginner_suitable = false
where name in (
  'Barbell Back Squat',
  'Barbell Front Squat'
);

update exercises set
  movement_category = 'Quad Dominant', fatigue_rating = 'high',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = true
where name in (
  'Leg Press',
  'Hack Squat',
  'Smith Machine Squat',
  'Bulgarian Split Squat',
  'Barbell Lunge',
  'Dumbbell Lunge',
  'Goblet Squat',
  'Sissy Squat',
  'Step-Up'
);

update exercises set
  movement_category = 'Quad Dominant', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 25, beginner_suitable = true
where name in (
  'Leg Extension'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HIP HINGE — deadlift / RDL / leg curl patterns
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Hip Hinge', fatigue_rating = 'very_high',
  rep_range_min = 3, rep_range_max = 6, beginner_suitable = false
where name in (
  'Deadlift',
  'Sumo Deadlift'
);

update exercises set
  movement_category = 'Hip Hinge', fatigue_rating = 'high',
  rep_range_min = 6, rep_range_max = 12, beginner_suitable = true
where name in (
  'Romanian Deadlift (Barbell)',
  'Romanian Deadlift (Dumbbell)',
  'Stiff-Leg Deadlift',
  'Rack Pull',
  'Good Morning',
  'Good Morning (Hamstring Focus)',
  'Nordic Hamstring Curl'
);

update exercises set
  movement_category = 'Hip Hinge', fatigue_rating = 'medium',
  rep_range_min = 10, rep_range_max = 20, beginner_suitable = true
where name in (
  'Hyperextension',
  'Weighted Hyperextension',
  'Lying Leg Curl',
  'Seated Leg Curl',
  'Standing Leg Curl'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GLUTE DOMINANT — hip thrust / isolation patterns
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Glute Dominant', fatigue_rating = 'medium',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = true
where name in (
  'Barbell Hip Thrust',
  'Dumbbell Hip Thrust',
  'Glute Bridge',
  'Cable Pull-Through',
  'Bulgarian Split Squat (Glute Focus)'
);

update exercises set
  movement_category = 'Glute Dominant', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 25, beginner_suitable = true
where name in (
  'Cable Kickback',
  'Donkey Kick',
  'Hip Abduction Machine'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ELBOW FLEXION — all bicep / curl work
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Elbow Flexion', fatigue_rating = 'low',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = true
where name in (
  'Barbell Curl',
  'EZ-Bar Curl',
  'Dumbbell Curl (Alternating)',
  'Dumbbell Curl (Both Arms)',
  'Hammer Curl',
  'Concentration Curl',
  'Incline Dumbbell Curl',
  'Preacher Curl (Barbell)',
  'Preacher Curl (Dumbbell)'
);

update exercises set
  movement_category = 'Elbow Flexion', fatigue_rating = 'low',
  rep_range_min = 10, rep_range_max = 20, beginner_suitable = true
where name in (
  'Cable Curl',
  'Cable Hammer Curl',
  'Machine Curl',
  'Reverse Barbell Curl',
  'Reverse Dumbbell Curl'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ELBOW EXTENSION — all tricep work
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Elbow Extension', fatigue_rating = 'medium',
  rep_range_min = 6, rep_range_max = 12, beginner_suitable = true
where name in (
  'Close-Grip Bench Press',
  'Skull Crusher (Barbell)',
  'Skull Crusher (EZ-Bar)',
  'Tricep Dips',
  'Weighted Tricep Dips'
);

update exercises set
  movement_category = 'Elbow Extension', fatigue_rating = 'low',
  rep_range_min = 10, rep_range_max = 20, beginner_suitable = true
where name in (
  'Overhead Tricep Extension (Cable)',
  'Overhead Tricep Extension (Dumbbell)',
  'Tricep Pushdown (Rope)',
  'Tricep Pushdown (Bar)',
  'Dumbbell Kickback',
  'Machine Tricep Extension'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CORE — abdominal and stabilization work
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Core', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 20, beginner_suitable = true
where name in (
  'Crunch',
  'Cable Crunch',
  'Decline Sit-Up',
  'Reaching Sit-Up',
  'Russian Twist',
  'Weighted Russian Twist',
  'Lying Leg Raise',
  'Plank',
  'Pallof Press',
  'Dead Bug'
);

update exercises set
  movement_category = 'Core', fatigue_rating = 'medium',
  rep_range_min = 8, rep_range_max = 15, beginner_suitable = false
where name in (
  'Hanging Leg Raise',
  'Ab Wheel Rollout',
  'Dragon Flag',
  'V-Up'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CALF RAISE — supplemental
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Calf Raise', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 25, beginner_suitable = true
where name in (
  'Standing Calf Raise',
  'Seated Calf Raise',
  'Leg Press Calf Raise',
  'Dumbbell Calf Raise',
  'Single-Leg Calf Raise',
  'Donkey Calf Raise'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRAP/SHRUG — supplemental
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Trap/Shrug', fatigue_rating = 'low',
  rep_range_min = 10, rep_range_max = 20, beginner_suitable = true
where name in (
  'Barbell Shrug',
  'Dumbbell Shrug',
  'Cable Shrug',
  'Machine Shrug'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WRIST/GRIP — supplemental
-- ─────────────────────────────────────────────────────────────────────────────
update exercises set
  movement_category = 'Wrist/Grip', fatigue_rating = 'low',
  rep_range_min = 12, rep_range_max = 25, beginner_suitable = true
where name in (
  'Barbell Wrist Curl',
  'Dumbbell Wrist Curl',
  'Barbell Wrist Extension',
  'Dumbbell Bench Wrist Curl',
  'Farmer''s Walk'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX for slot generator queries
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists exercises_movement_category_idx on exercises (movement_category);
create index if not exists exercises_muscle_group_category_idx on exercises (muscle_group, movement_category);
