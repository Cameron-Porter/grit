import { getExerciseByName } from './exerciseDatabase';

export interface TemplateExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
}

export interface TemplateDay {
  label: string;
  exercises: TemplateExercise[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  daysPerWeek: number;
  recommendedWeeks: number;
  focus: string;
  bestFor: string;
  days: TemplateDay[];
}

function ex(
  name: string,
  muscleGroup: string,
  sets: number,
  repsMin: number,
  repsMax: number,
  rir: number,
): TemplateExercise {
  return { name, muscleGroup, sets, repsMin, repsMax, rir };
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'ppl-5',
    name: 'Push Pull Legs',
    tagline: '5 days/week',
    description: '5-day PPL: two push days, two pull days, and one legs day per week. Each muscle gets hit twice with different exercise angles and rep ranges.',
    daysPerWeek: 5,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Intermediate–Advanced · 5 gym days',
    days: [
      {
        label: 'Push A',
        exercises: [
          ex('Barbell Bench Press', 'Chest', 4, 5, 8, 2),
          ex('Incline Dumbbell Press', 'Chest', 3, 10, 15, 2),
          ex('Barbell Overhead Press', 'Shoulders', 3, 6, 10, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Tricep Rope Pushdown', 'Triceps', 3, 12, 16, 1),
          ex('Skull Crusher', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull A',
        exercises: [
          ex('Pull-Up', 'Back', 4, 5, 8, 2),
          ex('Barbell Row', 'Back', 3, 6, 10, 2),
          ex('Seated Cable Row', 'Back', 3, 10, 15, 2),
          ex('Face Pull', 'Back', 3, 15, 20, 1),
          ex('EZ-Bar Curl', 'Biceps', 3, 8, 12, 1),
          ex('Hammer Curl', 'Biceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs',
        exercises: [
          ex('Barbell Back Squat', 'Quads', 4, 5, 8, 2),
          ex('Romanian Deadlift', 'Hamstrings', 3, 8, 12, 2),
          ex('Leg Press', 'Quads', 3, 10, 15, 2),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension', 'Quads', 3, 12, 16, 1),
          ex('Standing Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
      {
        label: 'Push B',
        exercises: [
          ex('Incline Barbell Bench Press', 'Chest', 3, 8, 12, 2),
          ex('Dumbbell Bench Press', 'Chest', 3, 10, 15, 2),
          ex('Seated Dumbbell Press', 'Shoulders', 3, 10, 15, 2),
          ex('Cable Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Rear Delt Fly', 'Shoulders', 3, 15, 20, 1),
          ex('Cable Tricep Pushdown', 'Triceps', 3, 12, 16, 1),
          ex('Dumbbell Overhead Tricep Extension', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull B',
        exercises: [
          ex('Lat Pulldown', 'Back', 3, 10, 15, 2),
          ex('Dumbbell Row', 'Back', 3, 8, 12, 2),
          ex('Straight-Arm Pulldown', 'Back', 3, 12, 16, 1),
          ex('Cable Rear Delt Fly', 'Shoulders', 3, 15, 20, 1),
          ex('Cable Curl', 'Biceps', 3, 12, 16, 1),
          ex('Incline Dumbbell Curl', 'Biceps', 3, 10, 15, 1),
          ex('Preacher Curl', 'Biceps', 3, 10, 15, 1),
        ],
      },
    ],
  },
  {
    id: 'upper-focus-4',
    name: 'Upper Focus',
    tagline: '4 days/week',
    description: 'Three upper body sessions per week with one leg day. Ideal for building chest, back, shoulders, and arms while maintaining lower body strength.',
    daysPerWeek: 4,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Anyone prioritizing upper body',
    days: [
      {
        label: 'Push',
        exercises: [
          ex('Barbell Bench Press', 'Chest', 4, 5, 8, 2),
          ex('Incline Dumbbell Press', 'Chest', 3, 10, 15, 2),
          ex('Barbell Overhead Press', 'Shoulders', 3, 8, 12, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Tricep Rope Pushdown', 'Triceps', 3, 12, 16, 1),
          ex('Skull Crusher', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull',
        exercises: [
          ex('Pull-Up', 'Back', 4, 5, 10, 2),
          ex('Barbell Row', 'Back', 3, 8, 12, 2),
          ex('Seated Cable Row', 'Back', 3, 10, 15, 2),
          ex('Face Pull', 'Back', 3, 15, 20, 1),
          ex('EZ-Bar Curl', 'Biceps', 3, 8, 12, 1),
          ex('Hammer Curl', 'Biceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs',
        exercises: [
          ex('Barbell Back Squat', 'Quads', 4, 6, 10, 2),
          ex('Romanian Deadlift', 'Hamstrings', 3, 8, 12, 2),
          ex('Leg Press', 'Quads', 3, 10, 15, 2),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Standing Calf Raise', 'Calves', 3, 12, 20, 1),
        ],
      },
      {
        label: 'Upper',
        exercises: [
          ex('Incline Barbell Bench Press', 'Chest', 3, 8, 12, 2),
          ex('Lat Pulldown', 'Back', 3, 10, 15, 2),
          ex('Seated Dumbbell Press', 'Shoulders', 3, 10, 15, 2),
          ex('Cable Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Dumbbell Curl', 'Biceps', 3, 10, 15, 1),
          ex('Cable Tricep Pushdown', 'Triceps', 3, 12, 16, 1),
          ex('Pec Deck', 'Chest', 3, 12, 16, 1),
        ],
      },
    ],
  },
  {
    id: 'lower-focus-4',
    name: 'Lower Focus',
    tagline: '4 days/week',
    description: 'Three leg sessions per week with one upper body day. High-frequency lower training for quad, hamstring, and glute development.',
    daysPerWeek: 4,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Anyone prioritizing lower body',
    days: [
      {
        label: 'Legs A (Quad)',
        exercises: [
          ex('Barbell Back Squat', 'Quads', 4, 5, 8, 2),
          ex('Hack Squat', 'Quads', 3, 8, 12, 2),
          ex('Leg Press', 'Quads', 3, 10, 15, 2),
          ex('Leg Extension', 'Quads', 3, 12, 16, 1),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Standing Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
      {
        label: 'Upper',
        exercises: [
          ex('Barbell Bench Press', 'Chest', 3, 6, 10, 2),
          ex('Barbell Row', 'Back', 3, 6, 10, 2),
          ex('Barbell Overhead Press', 'Shoulders', 3, 8, 12, 2),
          ex('Lat Pulldown', 'Back', 3, 10, 15, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('EZ-Bar Curl', 'Biceps', 3, 10, 15, 1),
          ex('Tricep Rope Pushdown', 'Triceps', 3, 12, 16, 1),
        ],
      },
      {
        label: 'Legs B (Hinge)',
        exercises: [
          ex('Romanian Deadlift', 'Hamstrings', 4, 6, 10, 2),
          ex('Barbell Hip Thrust', 'Glutes', 3, 8, 12, 2),
          ex('Bulgarian Split Squat', 'Quads', 3, 8, 12, 2),
          ex('Lying Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension', 'Quads', 3, 12, 16, 1),
          ex('Seated Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
      {
        label: 'Legs C (Volume)',
        exercises: [
          ex('Leg Press', 'Quads', 4, 10, 15, 2),
          ex('Hack Squat', 'Quads', 3, 10, 15, 2),
          ex('Barbell Hip Thrust', 'Glutes', 3, 10, 15, 1),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension', 'Quads', 3, 12, 16, 1),
          ex('Hip Abduction Machine', 'Glutes', 3, 15, 20, 1),
          ex('Standing Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
    ],
  },
  {
    id: 'full-body-3',
    name: 'Full Body',
    tagline: '3 days/week',
    description: 'Train every major muscle group three times per week. Great for beginners and anyone who wants maximum frequency with minimal days.',
    daysPerWeek: 3,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Beginners · Time-limited',
    days: [
      {
        label: 'Full Body A',
        exercises: [
          ex('Barbell Back Squat', 'Quads', 3, 8, 12, 2),
          ex('Barbell Bench Press', 'Chest', 3, 8, 12, 2),
          ex('Barbell Row', 'Back', 3, 8, 12, 2),
          ex('Barbell Overhead Press', 'Shoulders', 3, 10, 15, 2),
          ex('EZ-Bar Curl', 'Biceps', 3, 10, 15, 1),
          ex('Tricep Rope Pushdown', 'Triceps', 3, 12, 16, 1),
        ],
      },
      {
        label: 'Full Body B',
        exercises: [
          ex('Romanian Deadlift', 'Hamstrings', 3, 8, 12, 2),
          ex('Incline Dumbbell Press', 'Chest', 3, 10, 15, 2),
          ex('Lat Pulldown', 'Back', 3, 10, 15, 2),
          ex('Seated Dumbbell Press', 'Shoulders', 3, 10, 15, 2),
          ex('Hammer Curl', 'Biceps', 3, 10, 15, 1),
          ex('Skull Crusher', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Full Body C',
        exercises: [
          ex('Leg Press', 'Quads', 3, 10, 15, 2),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Dumbbell Bench Press', 'Chest', 3, 10, 15, 2),
          ex('Seated Cable Row', 'Back', 3, 12, 16, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Standing Calf Raise', 'Calves', 3, 12, 20, 1),
        ],
      },
    ],
  },
  {
    id: 'ppl-3',
    name: 'Push Pull Legs',
    tagline: '3 days/week',
    description: 'Classic PPL split: push muscles one day, pull muscles the next, legs on the third. Each muscle group trained once per week with high volume.',
    daysPerWeek: 3,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Intermediate · 3 gym days',
    days: [
      {
        label: 'Push',
        exercises: [
          ex('Barbell Bench Press', 'Chest', 4, 6, 10, 2),
          ex('Incline Dumbbell Press', 'Chest', 3, 10, 15, 2),
          ex('Barbell Overhead Press', 'Shoulders', 3, 8, 12, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Cable Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Tricep Rope Pushdown', 'Triceps', 3, 12, 16, 1),
          ex('Skull Crusher', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull',
        exercises: [
          ex('Pull-Up', 'Back', 3, 6, 10, 2),
          ex('Barbell Row', 'Back', 3, 8, 12, 2),
          ex('Seated Cable Row', 'Back', 3, 10, 15, 2),
          ex('Face Pull', 'Back', 3, 15, 20, 1),
          ex('EZ-Bar Curl', 'Biceps', 3, 10, 15, 1),
          ex('Hammer Curl', 'Biceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs',
        exercises: [
          ex('Barbell Back Squat', 'Quads', 4, 6, 10, 2),
          ex('Romanian Deadlift', 'Hamstrings', 3, 8, 12, 2),
          ex('Leg Press', 'Quads', 3, 10, 15, 2),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension', 'Quads', 3, 12, 16, 1),
          ex('Standing Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
    ],
  },
  {
    id: 'ppl-6',
    name: 'Push Pull Legs',
    tagline: '6 days/week',
    description: 'High-frequency PPL: two full rotations per week means each muscle is trained twice. Best for intermediate and advanced lifters who recover quickly.',
    daysPerWeek: 6,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Intermediate–Advanced · 6 gym days',
    days: [
      {
        label: 'Push A',
        exercises: [
          ex('Barbell Bench Press', 'Chest', 4, 6, 10, 2),
          ex('Incline Dumbbell Press', 'Chest', 3, 10, 15, 2),
          ex('Barbell Overhead Press', 'Shoulders', 3, 8, 12, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Tricep Rope Pushdown', 'Triceps', 3, 12, 16, 1),
          ex('Skull Crusher', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull A',
        exercises: [
          ex('Pull-Up', 'Back', 3, 6, 10, 2),
          ex('Barbell Row', 'Back', 3, 8, 12, 2),
          ex('Seated Cable Row', 'Back', 3, 10, 15, 2),
          ex('Face Pull', 'Back', 3, 15, 20, 1),
          ex('EZ-Bar Curl', 'Biceps', 3, 10, 15, 1),
          ex('Hammer Curl', 'Biceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs A',
        exercises: [
          ex('Barbell Back Squat', 'Quads', 4, 6, 10, 2),
          ex('Romanian Deadlift', 'Hamstrings', 3, 8, 12, 2),
          ex('Leg Press', 'Quads', 3, 10, 15, 2),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Standing Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
      {
        label: 'Push B',
        exercises: [
          ex('Incline Barbell Bench Press', 'Chest', 4, 6, 10, 2),
          ex('Dumbbell Bench Press', 'Chest', 3, 10, 15, 2),
          ex('Seated Dumbbell Press', 'Shoulders', 3, 10, 15, 2),
          ex('Cable Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Cable Tricep Pushdown', 'Triceps', 3, 12, 16, 1),
          ex('Dumbbell Overhead Tricep Extension', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull B',
        exercises: [
          ex('Lat Pulldown', 'Back', 3, 10, 15, 2),
          ex('Dumbbell Row', 'Back', 3, 8, 12, 2),
          ex('Chest-Supported Row', 'Back', 3, 10, 15, 2),
          ex('Straight-Arm Pulldown', 'Back', 3, 12, 16, 1),
          ex('Cable Curl', 'Biceps', 3, 10, 15, 1),
          ex('Incline Dumbbell Curl', 'Biceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs B',
        exercises: [
          ex('Romanian Deadlift', 'Hamstrings', 3, 8, 12, 2),
          ex('Bulgarian Split Squat', 'Quads', 3, 8, 12, 2),
          ex('Leg Extension', 'Quads', 3, 12, 16, 1),
          ex('Lying Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Barbell Hip Thrust', 'Glutes', 3, 10, 15, 1),
          ex('Seated Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Upper Lower',
    tagline: '4 days/week',
    description: 'Alternate upper and lower body sessions. Each muscle group trained twice per week — a great balance of frequency, volume, and recovery.',
    daysPerWeek: 4,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Intermediate · 4 gym days',
    days: [
      {
        label: 'Upper A',
        exercises: [
          ex('Barbell Bench Press', 'Chest', 4, 6, 10, 2),
          ex('Barbell Row', 'Back', 4, 6, 10, 2),
          ex('Barbell Overhead Press', 'Shoulders', 3, 8, 12, 2),
          ex('Lat Pulldown', 'Back', 3, 10, 15, 2),
          ex('EZ-Bar Curl', 'Biceps', 3, 10, 15, 1),
          ex('Tricep Rope Pushdown', 'Triceps', 3, 12, 16, 1),
        ],
      },
      {
        label: 'Lower A',
        exercises: [
          ex('Barbell Back Squat', 'Quads', 4, 6, 10, 2),
          ex('Romanian Deadlift', 'Hamstrings', 3, 8, 12, 2),
          ex('Leg Press', 'Quads', 3, 10, 15, 2),
          ex('Seated Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Standing Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
      {
        label: 'Upper B',
        exercises: [
          ex('Incline Barbell Bench Press', 'Chest', 3, 8, 12, 2),
          ex('Pull-Up', 'Back', 3, 6, 10, 2),
          ex('Seated Dumbbell Press', 'Shoulders', 3, 10, 15, 2),
          ex('Seated Cable Row', 'Back', 3, 10, 15, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 3, 15, 20, 1),
          ex('Hammer Curl', 'Biceps', 3, 10, 15, 1),
          ex('Skull Crusher', 'Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Lower B',
        exercises: [
          ex('Romanian Deadlift', 'Hamstrings', 4, 6, 10, 2),
          ex('Bulgarian Split Squat', 'Quads', 3, 8, 12, 2),
          ex('Leg Extension', 'Quads', 3, 12, 16, 1),
          ex('Lying Leg Curl', 'Hamstrings', 3, 10, 15, 1),
          ex('Barbell Hip Thrust', 'Glutes', 3, 10, 15, 1),
          ex('Seated Calf Raise', 'Calves', 4, 12, 20, 1),
        ],
      },
    ],
  },
];

export function getEquipmentForTemplateExercise(name: string): string {
  return getExerciseByName(name)?.equipment ?? 'Barbell';
}
