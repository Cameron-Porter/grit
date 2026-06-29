-- Deduplicate exercises.
-- The original seed (20260605000001) has cleaner names and carries all
-- taxonomy, description, and rules metadata. The CSV seed (20260609000004)
-- inserted differently-named duplicates for most of those exercises.
-- This migration removes the CSV duplicates and a handful of intra-CSV
-- duplicates, keeping the original names intact.

-- ─── CHEST ───────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Barbell Flat Bench Press',           -- kept: Barbell Bench Press
  'Barbell Incline Bench Press',        -- kept: Incline Barbell Bench Press
  'Barbell Decline Bench Press',        -- kept: Decline Barbell Bench Press
  'Dumbbell Flat Bench Press',          -- kept: Dumbbell Bench Press
  'Dumbbell Incline Bench Press',       -- kept: Incline Dumbbell Press
  'Dumbbell Decline Bench Press',       -- kept: Decline Dumbbell Press
  'Dumbbell Flat Flyes',                -- kept: Dumbbell Flyes
  'Dumbbell Incline Flyes',             -- kept: Incline Dumbbell Flyes
  'Cable Crossover / Cable Flyes',      -- kept: Cable Crossover
  'High to Low Cable Crossover',        -- kept: High-to-Low Cable Fly
  'Low to High Cable Crossover',        -- kept: Low-to-High Cable Fly
  'Pec Deck Machine',                   -- kept: Pec Deck Fly
  'Push-ups',                           -- kept: Push-Up
  'Weighted Push-ups',                  -- kept: Weighted Push-Up
  'Smith Machine Flat Bench Press',     -- kept: Smith Machine Bench Press
  'Smith Machine Incline Bench Press',  -- kept: Smith Machine Incline Press
  'Close Grip Chins (Chest Focus)',     -- confusing placement, removed
  'Hanging Serratus Crunches',          -- niche/confusing
  'Hanging Dumbbell Rows (Chest Focus)' -- wrong muscle group
);

-- ─── BACK ────────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Barbell Bent-Over Row',              -- kept: Barbell Row (Bent Over)
  'Straight-Arm Cable Pulldown',        -- kept: Straight-Arm Pulldown
  'Pull-ups',                           -- kept: Pull-Up (Wide Grip) / Pull-Up (Normal Grip)
  'Weighted Pull-ups',                  -- kept: Weighted Pull-Up
  'Chin-ups',                           -- kept: Chin-Up
  'Wide-Grip Chins to the Front',       -- kept: Pull-Up (Wide Grip)
  'Wide-Grip Chins Behind the Neck',    -- rarely used, potentially dangerous
  'Barbell Deadlift',                   -- kept: Deadlift
  'Rack Pulls',                         -- kept: Rack Pull
  'Hyperextensions',                    -- kept: Hyperextension
  'Weighted Hyperextensions',           -- kept: Weighted Hyperextension
  'Single-Arm Dumbbell Row',            -- kept: Dumbbell Row (Single-Arm)
  'Seated Machine Row',                 -- kept: Machine Row
  'Barbell Shrugs',                     -- kept: Barbell Shrug (Traps)
  'Dumbbell Shrugs',                    -- kept: Dumbbell Shrug (Traps)
  'Cable Shrugs',                       -- kept: Cable Shrug (Traps)
  'Heavy Upright Rows'                  -- kept: Barbell Upright Row (Shoulders)
);

-- Rename Weighted Chin-ups to match original naming style
UPDATE exercises SET name = 'Weighted Chin-Up'
WHERE name = 'Weighted Chin-ups' AND is_custom = false;

-- Move Smith Machine Shrugs to Traps where shrugs belong
UPDATE exercises SET muscle_group = 'Traps'
WHERE name = 'Smith Machine Shrugs' AND is_custom = false;

-- ─── SHOULDERS ───────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Face Pulls',              -- kept: Face Pull
  'Standing Lateral Raises'  -- kept: Dumbbell Lateral Raise
);

-- ─── BICEPS ──────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Barbell Bicep Curl',      -- kept: Barbell Curl
  'Alternate Dumbbell Curls',-- kept: Dumbbell Curl (Alternating)
  'Dumbbell Hammer Curl',    -- kept: Hammer Curl
  'Barbell Preacher Curl',   -- kept: Preacher Curl (Barbell)
  'Dumbbell Preacher Curl',  -- kept: Preacher Curl (Dumbbell)
  'Cable Bicep Curl',        -- kept: Cable Curl
  'Machine Bicep Curl'       -- kept: Machine Curl
);

-- ─── TRICEPS ─────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Close-Grip Barbell Bench Press',      -- kept: Close-Grip Bench Press
  'Barbell Skullcrushers',               -- kept: Skull Crusher (Barbell)
  'Tricep Pushdown (Rope/Bar)',           -- kept: Tricep Pushdown (Rope) + (Bar) separately
  'Overhead Cable Tricep Extension',     -- kept: Overhead Tricep Extension (Cable)
  'Overhead Dumbbell Tricep Extension',  -- kept: Overhead Tricep Extension (Dumbbell)
  'Dumbbell Tricep Kickback',            -- kept: Dumbbell Kickback
  'Dips Behind Back'                     -- kept: Bench Dips
);

-- ─── FOREARMS ────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Barbell Wrist Curls',           -- kept: Barbell Wrist Curl
  'Dumbbell One-Arm Wrist Curls',  -- kept: Dumbbell Bench Wrist Curl
  'Reverse Wrist Curls with Barbell',   -- kept: Barbell Wrist Extension
  'Reverse Wrist Curls with Dumbbells'  -- covered by Reverse Dumbbell Curl
);

-- ─── QUADS ───────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Hack Squat Machine',       -- kept: Hack Squat
  'Sissy Squats',             -- kept: Sissy Squat
  'Dumbbell Goblet Squat',    -- kept: Goblet Squat
  'Heavy Squats',             -- vague name, dup of Barbell Back Squat
  'Half Squats'               -- vague name
);

-- ─── HAMSTRINGS ──────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Barbell Romanian Deadlift (RDL)',   -- kept: Romanian Deadlift (Barbell)
  'Dumbbell Romanian Deadlift (RDL)',  -- kept: Romanian Deadlift (Dumbbell)
  'Barbell Stiff-Legged Deadlift',     -- kept: Stiff-Leg Deadlift
  'Straight-Leg Deadlifts'            -- dup of Stiff-Leg Deadlift
);

-- ─── GLUTES ──────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Cable Glute Kickback',  -- kept: Cable Kickback
  'Hip Abductor Machine'   -- kept: Hip Abduction Machine
);

-- ─── CALVES ──────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Standing Machine Calf Raise'  -- kept: Standing Calf Raise (Machine)
);

-- ─── ABS ─────────────────────────────────────────────────────────────────────
DELETE FROM exercises WHERE is_custom = false AND name IN (
  'Crunches',          -- kept: Crunch
  'Hanging Leg Raises',-- kept: Hanging Leg Raise
  'Lying Leg Raises',  -- kept: Lying Leg Raise
  'Russian Twists',    -- kept: Russian Twist
  'Dragon Flags',      -- kept: Dragon Flag
  'Cable Pallof Press',-- kept: Pallof Press
  'Dead Bugs',         -- kept: Dead Bug
  'V-Ups'              -- kept: V-Up
);
