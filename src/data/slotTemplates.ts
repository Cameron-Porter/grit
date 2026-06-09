import type { ExperienceLevel, MuscleGroup, SlotRole, SlotTemplate } from '../types/program';

// Slot templates ordered by priority within each muscle group.
// priority 1 = primary compound (always included)
// priority 2 = secondary compound / variation (included at moderate volume)
// priority 3 = isolation (included only at high volume)
// approvedExercises[0] = default selection shown to the user
// beginnerExercises = subset of approvedExercises shown when experienceLevel === 'beginner'

export const SLOT_TEMPLATES: Record<MuscleGroup, SlotTemplate[]> = {
  Chest: [
    {
      slotKey: 'chest-horizontal-press',
      muscle: 'Chest',
      name: 'Horizontal Press',
      movementPattern: 'horizontal-push',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 4,
      approvedExercises: ['Barbell Bench Press', 'Dumbbell Bench Press', 'Machine Chest Press'],
      // All three are beginner-suitable
    },
    {
      slotKey: 'chest-incline-press',
      muscle: 'Chest',
      name: 'Incline Press',
      movementPattern: 'incline-push',
      exerciseType: 'dumbbell-compound',
      priority: 2,
      minSetsForInclusion: 5,
      defaultSets: 3,
      approvedExercises: ['Incline Dumbbell Press', 'Incline Barbell Bench Press', 'Incline Machine Press'],
    },
    {
      slotKey: 'chest-fly',
      muscle: 'Chest',
      name: 'Chest Fly',
      movementPattern: 'horizontal-push',
      exerciseType: 'isolation',
      priority: 3,
      minSetsForInclusion: 8,
      defaultSets: 3,
      approvedExercises: ['Cable Crossover', 'Pec Deck', 'Dumbbell Fly', 'Cable Fly Low to High'],
    },
  ],

  Back: [
    {
      slotKey: 'back-vertical-pull',
      muscle: 'Back',
      name: 'Vertical Pull',
      movementPattern: 'vertical-pull',
      exerciseType: 'bodyweight-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 4,
      approvedExercises: ['Pull-Up', 'Lat Pulldown', 'Close-Grip Lat Pulldown'],
      // Pull-Up requires significant relative strength; beginners use machine alternatives
      beginnerExercises: ['Lat Pulldown', 'Close-Grip Lat Pulldown'],
    },
    {
      slotKey: 'back-horizontal-pull',
      muscle: 'Back',
      name: 'Horizontal Pull',
      movementPattern: 'horizontal-pull',
      exerciseType: 'barbell-compound',
      priority: 2,
      minSetsForInclusion: 7,
      defaultSets: 4,
      approvedExercises: ['Barbell Row', 'T-Bar Row', 'Dumbbell Row', 'Seated Cable Row', 'Chest-Supported Row'],
      // Barbell Row and T-Bar Row demand lumbar stability beginners haven't built yet
      beginnerExercises: ['Dumbbell Row', 'Seated Cable Row', 'Chest-Supported Row'],
    },
    {
      slotKey: 'back-isolation',
      muscle: 'Back',
      name: 'Back Isolation',
      movementPattern: 'vertical-pull',
      exerciseType: 'isolation',
      priority: 3,
      minSetsForInclusion: 9,
      defaultSets: 3,
      approvedExercises: ['Straight-Arm Pulldown', 'Cable Pullover', 'Face Pull'],
    },
  ],

  Shoulders: [
    {
      slotKey: 'shoulders-press',
      muscle: 'Shoulders',
      name: 'Overhead Press',
      movementPattern: 'vertical-push',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 4,
      approvedExercises: ['Barbell Overhead Press', 'Seated Dumbbell Press', 'Arnold Press', 'Machine Shoulder Press'],
    },
    {
      slotKey: 'shoulders-lateral',
      muscle: 'Shoulders',
      name: 'Lateral Raise',
      movementPattern: 'lateral-raise',
      exerciseType: 'isolation',
      priority: 2,
      minSetsForInclusion: 4,
      defaultSets: 3,
      approvedExercises: ['Dumbbell Lateral Raise', 'Cable Lateral Raise', 'Machine Lateral Raise'],
    },
    {
      slotKey: 'shoulders-rear-delt',
      muscle: 'Shoulders',
      name: 'Rear Delt',
      movementPattern: 'rear-delt',
      exerciseType: 'isolation',
      priority: 3,
      minSetsForInclusion: 7,
      defaultSets: 3,
      approvedExercises: ['Rear Delt Fly', 'Face Pull', 'Cable Rear Delt Fly'],
    },
  ],

  Biceps: [
    {
      slotKey: 'biceps-curl',
      muscle: 'Biceps',
      name: 'Curl',
      movementPattern: 'curl',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 3,
      approvedExercises: ['Barbell Curl', 'EZ-Bar Curl', 'Dumbbell Curl', 'Hammer Curl'],
    },
    {
      slotKey: 'biceps-isolation',
      muscle: 'Biceps',
      name: 'Isolation Curl',
      movementPattern: 'curl',
      exerciseType: 'isolation',
      priority: 2,
      minSetsForInclusion: 5,
      defaultSets: 3,
      approvedExercises: ['Preacher Curl', 'Incline Dumbbell Curl', 'Cable Curl'],
    },
  ],

  Triceps: [
    {
      slotKey: 'triceps-extension',
      muscle: 'Triceps',
      name: 'Overhead Extension',
      movementPattern: 'tricep-extension',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 3,
      approvedExercises: ['Skull Crusher', 'Dumbbell Overhead Tricep Extension', 'Cable Overhead Tricep Extension'],
    },
    {
      slotKey: 'triceps-pushdown',
      muscle: 'Triceps',
      name: 'Pushdown',
      movementPattern: 'tricep-extension',
      exerciseType: 'isolation',
      priority: 2,
      minSetsForInclusion: 4,
      defaultSets: 3,
      approvedExercises: ['Tricep Rope Pushdown', 'Cable Tricep Pushdown', 'Machine Tricep Press'],
    },
  ],

  Quads: [
    {
      slotKey: 'quads-squat',
      muscle: 'Quads',
      name: 'Squat Pattern',
      movementPattern: 'squat',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 4,
      approvedExercises: ['Barbell Back Squat', 'Front Squat', 'Leg Press', 'Hack Squat'],
      // Barbell squat and front squat demand motor patterns beginners take weeks to develop
      beginnerExercises: ['Leg Press', 'Hack Squat'],
    },
    {
      slotKey: 'quads-unilateral',
      muscle: 'Quads',
      name: 'Unilateral',
      movementPattern: 'squat',
      exerciseType: 'dumbbell-compound',
      priority: 2,
      minSetsForInclusion: 6,
      defaultSets: 3,
      approvedExercises: ['Bulgarian Split Squat', 'Goblet Squat'],
    },
    {
      slotKey: 'quads-isolation',
      muscle: 'Quads',
      name: 'Leg Extension',
      movementPattern: 'knee-extension',
      exerciseType: 'isolation',
      priority: 3,
      minSetsForInclusion: 9,
      defaultSets: 3,
      approvedExercises: ['Leg Extension'],
    },
  ],

  Hamstrings: [
    {
      slotKey: 'hamstrings-hinge',
      muscle: 'Hamstrings',
      name: 'Hip Hinge',
      movementPattern: 'hinge',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 4,
      approvedExercises: ['Romanian Deadlift', 'Stiff-Leg Deadlift', 'Good Morning'],
      // Romanian Deadlift is beginner-suitable; conventional deadlift is not in this list
    },
    {
      slotKey: 'hamstrings-curl',
      muscle: 'Hamstrings',
      name: 'Leg Curl',
      movementPattern: 'knee-flexion',
      exerciseType: 'isolation',
      priority: 2,
      minSetsForInclusion: 4,
      defaultSets: 3,
      approvedExercises: ['Lying Leg Curl', 'Seated Leg Curl', 'Nordic Hamstring Curl'],
      // Nordic Hamstring Curl requires significant eccentric strength; filter for beginners
      beginnerExercises: ['Lying Leg Curl', 'Seated Leg Curl'],
    },
  ],

  Glutes: [
    {
      slotKey: 'glutes-thrust',
      muscle: 'Glutes',
      name: 'Hip Thrust',
      movementPattern: 'hip-extension',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 3,
      approvedExercises: ['Barbell Hip Thrust', 'Dumbbell Hip Thrust', 'Machine Hip Thrust'],
    },
    {
      slotKey: 'glutes-isolation',
      muscle: 'Glutes',
      name: 'Glute Isolation',
      movementPattern: 'hip-extension',
      exerciseType: 'isolation',
      priority: 2,
      minSetsForInclusion: 5,
      defaultSets: 3,
      approvedExercises: ['Cable Kickback', 'Hip Abduction Machine'],
    },
  ],

  Calves: [
    {
      slotKey: 'calves-gastroc',
      muscle: 'Calves',
      name: 'Standing Calf Raise',
      movementPattern: 'calf-raise',
      exerciseType: 'machine-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 4,
      approvedExercises: ['Standing Calf Raise', 'Leg Press Calf Raise'],
    },
    {
      slotKey: 'calves-soleus',
      muscle: 'Calves',
      name: 'Seated Calf Raise',
      movementPattern: 'calf-raise',
      exerciseType: 'machine-compound',
      priority: 2,
      minSetsForInclusion: 5,
      defaultSets: 3,
      approvedExercises: ['Seated Calf Raise'],
    },
  ],

  Abs: [
    {
      slotKey: 'abs-weighted',
      muscle: 'Abs',
      name: 'Weighted Core',
      movementPattern: 'core',
      exerciseType: 'isolation',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 3,
      approvedExercises: ['Cable Crunch', 'Hanging Leg Raise', 'Ab Wheel Rollout', 'Decline Crunch'],
      // Hanging leg raise and ab wheel require significant strength; beginners use cable/decline
      beginnerExercises: ['Cable Crunch', 'Decline Crunch'],
    },
    {
      slotKey: 'abs-stabilization',
      muscle: 'Abs',
      name: 'Core Stabilization',
      movementPattern: 'core',
      exerciseType: 'core',
      priority: 2,
      minSetsForInclusion: 5,
      defaultSets: 3,
      approvedExercises: ['Plank', 'Pallof Press', 'Dead Bug'],
    },
  ],

  Traps: [
    {
      slotKey: 'traps-shrug',
      muscle: 'Traps',
      name: 'Shrug',
      movementPattern: 'hinge',
      exerciseType: 'barbell-compound',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 3,
      approvedExercises: ['Barbell Shrug', 'Dumbbell Shrug', 'Machine Shrug'],
    },
  ],

  Forearms: [
    {
      slotKey: 'forearms-curl',
      muscle: 'Forearms',
      name: 'Forearm Work',
      movementPattern: 'curl',
      exerciseType: 'isolation',
      priority: 1,
      minSetsForInclusion: 0,
      defaultSets: 3,
      approvedExercises: ["Farmer's Walk", 'Reverse Barbell Curl', 'Wrist Curl'],
    },
  ],
};

// ─── Exercise Picker helper ───────────────────────────────────────────────────
// Returns approved exercise names for a given muscle + slot role.
//
// Primary   → priority-1 templates (main compound patterns)
// Secondary → priority-1 and -2 templates (variations included)
// Accessory → all templates (isolations included)
//
// When experienceLevel === 'beginner', templates with a beginnerExercises list
// return only those exercises instead of the full approvedExercises array.
export function getApprovedExercises(
  muscle: MuscleGroup,
  role: SlotRole,
  experienceLevel?: ExperienceLevel,
): string[] {
  const templates = SLOT_TEMPLATES[muscle] ?? [];
  const maxPriority = role === 'Primary' ? 1 : role === 'Secondary' ? 2 : 3;
  const exercises = templates
    .filter((t) => t.priority <= maxPriority)
    .flatMap((t) => {
      if (experienceLevel === 'beginner' && t.beginnerExercises) {
        return t.beginnerExercises;
      }
      return t.approvedExercises;
    });
  return [...new Set(exercises)];
}
