// Exercise names retired from the Supabase catalog because each one duplicated
// another exercise under a different name. Migration 20260914120000_merge_duplicate_exercise_names.sql moved every
// stored reference (programs, targets, logged sets, PRs) onto the kept name and
// deleted the retired catalog rows.
//
// The map outlives that migration for payloads built before it ran: a workout
// tab left open, or a save waiting in the offline queue, still carries the old
// name, and the catalog check at the save boundary would otherwise reject it.
//
// This map and the migration's pair list must stay identical — enforced by
// src/data/__tests__/exerciseNameAliases.test.ts.
export const RETIRED_EXERCISE_NAMES: Readonly<Record<string, string>> = {
  // Re-inserted by 20260722000002 under the rules-fixture spelling, alongside
  // the row the 20260629000001 dedupe had already kept.
  'Incline Machine Press': 'Incline Machine Chest Press',
  'Pec Deck': 'Pec Deck Fly',
  'Dumbbell Fly': 'Dumbbell Flyes',
  'Cable Fly Low to High': 'Low-to-High Cable Fly',
  'Pull-Up': 'Pull-Up (Normal Grip)',
  'Barbell Row': 'Barbell Row (Bent Over)',
  'Dumbbell Row': 'Dumbbell Row (Single-Arm)',
  'Chest-Supported Row': 'Dumbbell Row (Supported)',
  'Rear Delt Fly': 'Bent-Over Rear Delt Fly',
  'Dumbbell Curl': 'Dumbbell Curl (Both Arms)',
  'Preacher Curl': 'Preacher Curl (Barbell)',
  'Skull Crusher': 'Skull Crusher (Barbell)',
  'Dumbbell Overhead Tricep Extension': 'Overhead Tricep Extension (Dumbbell)',
  'Cable Overhead Tricep Extension': 'Overhead Tricep Extension (Cable)',
  'Cable Tricep Pushdown': 'Tricep Pushdown (Bar)',
  'Machine Tricep Press': 'Machine Tricep Extension',
  'Front Squat': 'Barbell Front Squat',
  'Romanian Deadlift': 'Romanian Deadlift (Barbell)',
  'Dumbbell Romanian Deadlift': 'Romanian Deadlift (Dumbbell)',
  'Wrist Curl': 'Barbell Wrist Curl',

  // Seeded by 20260609000004 (CSV) and missed by the 20260629000001 dedupe.
  'Cable Rear Delt Flyes': 'Cable Rear Delt Fly',
  'Dumbbell Rear Delt Flyes': 'Bent-Over Rear Delt Fly',
  'Standing Bent-Over Dumbbell Laterals': 'Bent-Over Rear Delt Fly',
  'Seated Bent-Over Dumbbell Laterals': 'Seated Dumbbell Rear Delt Raise',
  'Military Press': 'Barbell Overhead Press',
  'Dumbbell Bicep Curl': 'Dumbbell Curl (Both Arms)',
  'Two-Hand Cable Curls': 'Cable Curl',
  'Cable Curls with Preacher Bench': 'Cable Preacher Curl',
  'Lying Triceps Extensions': 'Skull Crusher (Barbell)',
  'Lying Dumbbell Extensions': 'Dumbbell Skullcrushers',
  'French Press': 'Overhead Barbell Tricep Extension',
  'Standing Triceps Presses': 'Overhead Barbell Tricep Extension',
  'Reverse Pressdowns': 'Reverse Grip Tricep Pushdown',
  'Close-or Medium-Grip Pulldowns': 'Close-Grip Lat Pulldown',
  'Smith Machine Back Squat': 'Smith Machine Squat',
  'Standing Dumbbell Calf Raise': 'Dumbbell Calf Raise',
  'Standing Single Leg Curl': 'Standing Leg Curl',
  'Barbell Good Mornings': 'Good Morning (Hamstring Focus)',

  // The same exercise seeded twice under conflicting classifications.
  'Reverse Barbell Curl': 'Barbell Reverse Curl',
  'Reverse Dumbbell Curl': 'Dumbbell Reverse Curl',
  'Weighted Russian Twists': 'Weighted Russian Twist',
};

export function canonicalExerciseName(name: string): string {
  const trimmed = name.trim();
  return RETIRED_EXERCISE_NAMES[trimmed] ?? trimmed;
}
