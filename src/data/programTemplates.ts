import { getExerciseByName } from './exerciseDatabase';
import type { SlotRole } from '../types/program';

export interface TemplateExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  // Optional — most existing templates predate this field and leave it
  // unset (progression then defaults to treating the exercise as Primary,
  // same as before). Populate for new/edited templates where known so
  // load-increment sizing (see progressionEngine.ts getLoadIncrement) can
  // tell isolation accessory work apart from heavy compounds.
  role?: SlotRole;
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
  role?: SlotRole,
): TemplateExercise {
  return { name, muscleGroup, sets, repsMin, repsMax, rir, role };
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  // ─── Full Body 3x ──────────────────────────────────────────────────────────
  {
    id: 'full-body-3',
    name: 'Full Body',
    tagline: '3 days/week',
    description: 'Each session hits every major muscle with different movements — A is barbell-focused, B uses dumbbells and machines, C is cable and unilateral work. Maximizes weekly frequency without excessive fatigue.',
    daysPerWeek: 3,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Beginners · Time-constrained lifters',
    days: [
      {
        label: 'Full Body A',
        exercises: [
          ex('Barbell Back Squat',    'Quads',     3, 8,  12, 2),
          ex('Barbell Bench Press',   'Chest',     3, 8,  12, 2),
          ex('Barbell Row',           'Back',      3, 8,  12, 2),
          ex('Barbell Overhead Press','Shoulders', 3, 10, 15, 2),
          ex('EZ-Bar Curl',           'Biceps',    2, 10, 15, 1),
          ex('Cable Tricep Pushdown',  'Triceps',   2, 12, 16, 1),
        ],
      },
      {
        label: 'Full Body B',
        exercises: [
          ex('Romanian Deadlift',     'Hamstrings', 3, 10, 15, 2),
          ex('Incline Dumbbell Press','Chest',      3, 10, 15, 2),
          ex('Lat Pulldown',          'Back',       3, 10, 15, 2),
          ex('Seated Dumbbell Press', 'Shoulders',  3, 10, 15, 2),
          ex('Hammer Curl',           'Biceps',     2, 10, 15, 1),
          ex('Skull Crusher',         'Triceps',    2, 10, 15, 1),
        ],
      },
      {
        label: 'Full Body C',
        exercises: [
          ex('Leg Press',             'Quads',      3, 12, 16, 2),
          ex('Seated Leg Curl',       'Hamstrings', 3, 10, 15, 1),
          ex('Dumbbell Bench Press',  'Chest',      3, 10, 15, 2),
          ex('Seated Cable Row',      'Back',       3, 12, 16, 2),
          ex('Dumbbell Lateral Raise','Shoulders',  3, 15, 20, 1),
          ex('Standing Calf Raise',   'Calves',     3, 12, 20, 1),
        ],
      },
    ],
  },

  // ─── PPL 3x ────────────────────────────────────────────────────────────────
  {
    id: 'ppl-3',
    name: 'Push Pull Legs',
    tagline: '3 days/week',
    description: 'Each muscle group trained once per week with high session volume. Push covers chest, shoulders, triceps. Pull covers back and biceps. Legs covers everything below.',
    daysPerWeek: 3,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Intermediate · 3 gym days',
    days: [
      {
        label: 'Push',
        exercises: [
          ex('Barbell Bench Press',       'Chest',     4, 6,  10, 2),
          ex('Incline Dumbbell Press',    'Chest',     3, 10, 15, 2),
          ex('Barbell Overhead Press',    'Shoulders', 3, 8,  12, 2),
          ex('Dumbbell Lateral Raise',    'Shoulders', 3, 15, 20, 1),
          ex('Rear Delt Fly',             'Shoulders', 3, 15, 20, 1),
          ex('Cable Tricep Pushdown',      'Triceps',   3, 12, 16, 1),
          ex('Skull Crusher',             'Triceps',   3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull',
        exercises: [
          ex('Pull-Up',                   'Back',    4, 6,  10, 2),
          ex('Barbell Row',               'Back',    3, 6,  10, 2),
          ex('Seated Cable Row',          'Back',    3, 10, 15, 2),
          ex('Face Pull',                 'Back',    3, 15, 20, 1),
          ex('EZ-Bar Curl',               'Biceps',  3, 10, 15, 1),
          ex('Incline Dumbbell Curl',     'Biceps',  3, 10, 15, 1),
          ex('Hammer Curl',               'Biceps',  3, 12, 16, 1),
        ],
      },
      {
        label: 'Legs',
        exercises: [
          ex('Barbell Back Squat',        'Quads',      4, 6,  10, 2),
          ex('Romanian Deadlift',         'Hamstrings', 3, 8,  12, 2),
          ex('Leg Press',                 'Quads',      3, 10, 15, 2),
          ex('Barbell Hip Thrust',        'Glutes',     3, 10, 15, 1),
          ex('Seated Leg Curl',           'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension',             'Quads',      3, 12, 16, 1),
          ex('Standing Calf Raise',       'Calves',     4, 12, 20, 1),
        ],
      },
    ],
  },

  // ─── Upper Lower 4x ────────────────────────────────────────────────────────
  {
    id: 'upper-lower-4',
    name: 'Upper Lower',
    tagline: '4 days/week',
    description: 'Alternates upper and lower body sessions. Upper A is compound-strength focused; Upper B shifts to dumbbell volume. Lower A is squat-dominant; Lower B is hinge and glute dominant.',
    daysPerWeek: 4,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Intermediate · 4 gym days',
    days: [
      {
        label: 'Upper A — Strength',
        exercises: [
          ex('Barbell Bench Press',       'Chest',     4, 5,  8,  2),
          ex('Barbell Row',               'Back',      4, 5,  8,  2),
          ex('Barbell Overhead Press',    'Shoulders', 3, 6,  10, 2),
          ex('Lat Pulldown',              'Back',      3, 8,  12, 2),
          ex('EZ-Bar Curl',               'Biceps',    3, 10, 15, 1),
          ex('Cable Tricep Pushdown',      'Triceps',   3, 12, 16, 1),
        ],
      },
      {
        label: 'Lower A — Quad Focus',
        exercises: [
          ex('Barbell Back Squat',        'Quads',      4, 6,  10, 2),
          ex('Leg Press',                 'Quads',      3, 10, 15, 2),
          ex('Leg Extension',             'Quads',      3, 12, 16, 1),
          ex('Romanian Deadlift',         'Hamstrings', 3, 8,  12, 2),
          ex('Standing Calf Raise',       'Calves',     4, 12, 20, 1),
        ],
      },
      {
        label: 'Upper B — Volume',
        exercises: [
          ex('Incline Dumbbell Press',    'Chest',     3, 10, 15, 2),
          ex('Dumbbell Row',              'Back',      3, 8,  12, 2),
          ex('Seated Dumbbell Press',     'Shoulders', 3, 10, 15, 2),
          ex('Seated Cable Row',          'Back',      3, 10, 15, 2),
          ex('Dumbbell Lateral Raise',    'Shoulders', 3, 15, 20, 1),
          ex('Hammer Curl',               'Biceps',    3, 10, 15, 1),
          ex('Skull Crusher',             'Triceps',   3, 10, 15, 1),
        ],
      },
      {
        label: 'Lower B — Hinge Focus',
        exercises: [
          ex('Romanian Deadlift',         'Hamstrings', 4, 6,  10, 2),
          ex('Barbell Hip Thrust',        'Glutes',     3, 10, 15, 1),
          ex('Bulgarian Split Squat',     'Quads',      3, 8,  12, 2),
          ex('Lying Leg Curl',            'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension',             'Quads',      3, 12, 16, 1),
          ex('Seated Calf Raise',         'Calves',     4, 12, 20, 1),
        ],
      },
    ],
  },

  // ─── Upper Focus 4x ────────────────────────────────────────────────────────
  {
    id: 'upper-focus-4',
    name: 'Upper Focus',
    tagline: '4 days/week',
    description: 'Three upper body sessions per week with one leg day. Push day is chest and shoulder heavy; Pull day is back and bicep heavy; Full Upper pairs antagonists for volume. Legs is done once, thoroughly.',
    daysPerWeek: 4,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Anyone prioritizing upper body',
    days: [
      {
        label: 'Push',
        exercises: [
          ex('Barbell Bench Press',       'Chest',     4, 5,  8,  2),
          ex('Incline Dumbbell Press',    'Chest',     3, 10, 15, 2),
          ex('Barbell Overhead Press',    'Shoulders', 3, 8,  12, 2),
          ex('Dumbbell Lateral Raise',    'Shoulders', 3, 15, 20, 1),
          ex('Pec Deck',                  'Chest',     3, 12, 16, 1),
          ex('Skull Crusher',             'Triceps',   3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull',
        exercises: [
          ex('Pull-Up',                   'Back',    4, 5,  8,  2),
          ex('Barbell Row',               'Back',    3, 6,  10, 2),
          ex('Lat Pulldown',              'Back',    3, 10, 15, 2),
          ex('Face Pull',                 'Back',    3, 15, 20, 1),
          ex('EZ-Bar Curl',               'Biceps',  3, 10, 15, 1),
          ex('Incline Dumbbell Curl',     'Biceps',  3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs',
        exercises: [
          ex('Barbell Back Squat',        'Quads',      4, 6,  10, 2),
          ex('Romanian Deadlift',         'Hamstrings', 3, 8,  12, 2),
          ex('Leg Press',                 'Quads',      3, 10, 15, 2),
          ex('Seated Leg Curl',           'Hamstrings', 3, 10, 15, 1),
          ex('Standing Calf Raise',       'Calves',     4, 12, 20, 1),
        ],
      },
      {
        label: 'Full Upper',
        exercises: [
          ex('Incline Barbell Bench Press','Chest',    3, 8,  12, 2),
          ex('Seated Cable Row',          'Back',      3, 10, 15, 2),
          ex('Arnold Press',              'Shoulders', 3, 10, 15, 2),
          ex('Straight-Arm Pulldown',     'Back',      3, 12, 16, 1),
          ex('Cable Lateral Raise',       'Shoulders', 3, 15, 20, 1),
          ex('Hammer Curl',               'Biceps',    3, 10, 15, 1),
          ex('Cable Tricep Pushdown',     'Triceps',   3, 12, 16, 1),
        ],
      },
    ],
  },

  // ─── Lower Focus 4x ────────────────────────────────────────────────────────
  {
    id: 'lower-focus-4',
    name: 'Lower Focus',
    tagline: '4 days/week',
    description: 'Three leg sessions per week with one upper body day. Legs A is squat and quad dominant; Legs B shifts to hinge and posterior chain; Legs C uses machines and single-leg work for isolation volume.',
    daysPerWeek: 4,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Anyone prioritizing lower body',
    days: [
      {
        label: 'Legs A — Quad',
        exercises: [
          ex('Barbell Back Squat',        'Quads',      4, 5,  8,  2),
          ex('Hack Squat',                'Quads',      3, 8,  12, 2),
          ex('Leg Press',                 'Quads',      3, 10, 15, 2),
          ex('Leg Extension',             'Quads',      3, 12, 16, 1),
          ex('Seated Leg Curl',           'Hamstrings', 3, 10, 15, 1),
          ex('Standing Calf Raise',       'Calves',     4, 12, 20, 1),
        ],
      },
      {
        label: 'Upper',
        exercises: [
          ex('Barbell Bench Press',       'Chest',     3, 6,  10, 2),
          ex('Barbell Row',               'Back',      3, 6,  10, 2),
          ex('Barbell Overhead Press',    'Shoulders', 3, 8,  12, 2),
          ex('Lat Pulldown',              'Back',      3, 10, 15, 2),
          ex('Dumbbell Lateral Raise',    'Shoulders', 3, 15, 20, 1),
          ex('EZ-Bar Curl',               'Biceps',    3, 10, 15, 1),
          ex('Cable Tricep Pushdown',      'Triceps',   3, 12, 16, 1),
        ],
      },
      {
        label: 'Legs B — Posterior',
        exercises: [
          ex('Romanian Deadlift',         'Hamstrings', 4, 6,  10, 2),
          ex('Barbell Hip Thrust',        'Glutes',     3, 8,  12, 2),
          ex('Bulgarian Split Squat',     'Quads',      3, 8,  12, 2),
          ex('Lying Leg Curl',            'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension',             'Quads',      3, 12, 16, 1),
          ex('Seated Calf Raise',         'Calves',     4, 12, 20, 1),
        ],
      },
      {
        label: 'Legs C — Isolation',
        exercises: [
          ex('Bulgarian Split Squat',     'Quads',      4, 8,  12, 2),
          ex('Barbell Hip Thrust',        'Glutes',     3, 10, 15, 1),
          ex('Leg Extension',             'Quads',      3, 15, 20, 1),
          ex('Lying Leg Curl',            'Hamstrings', 3, 12, 16, 1),
          ex('Hip Abduction Machine',     'Glutes',     3, 15, 20, 1),
          ex('Seated Calf Raise',         'Calves',     3, 15, 20, 1),
        ],
      },
    ],
  },

  // ─── PPL 5x ────────────────────────────────────────────────────────────────
  {
    id: 'ppl-5',
    name: 'Push Pull Legs',
    tagline: '5 days/week',
    description: 'Two push days, two pull days, one leg day. A sessions are compound and strength-oriented; B sessions shift to higher-rep isolation. Each muscle is trained twice with different angles and loading.',
    daysPerWeek: 5,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Intermediate–Advanced · 5 gym days',
    days: [
      {
        label: 'Push A — Compound',
        exercises: [
          ex('Barbell Bench Press',       'Chest',     4, 5,  8,  2),
          ex('Incline Dumbbell Press',    'Chest',     3, 8,  12, 2),
          ex('Barbell Overhead Press',    'Shoulders', 3, 6,  10, 2),
          ex('Dumbbell Lateral Raise',    'Shoulders', 3, 15, 20, 1),
          ex('Skull Crusher',             'Triceps',   3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull A — Compound',
        exercises: [
          ex('Pull-Up',                   'Back',    4, 5,  8,  2),
          ex('Barbell Row',               'Back',    3, 6,  10, 2),
          ex('Face Pull',                 'Back',    3, 15, 20, 1),
          ex('EZ-Bar Curl',               'Biceps',  3, 8,  12, 1),
          ex('Hammer Curl',               'Biceps',  3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs',
        exercises: [
          ex('Barbell Back Squat',        'Quads',      4, 6,  10, 2),
          ex('Romanian Deadlift',         'Hamstrings', 3, 8,  12, 2),
          ex('Leg Press',                 'Quads',      3, 10, 15, 2),
          ex('Seated Leg Curl',           'Hamstrings', 3, 10, 15, 1),
          ex('Leg Extension',             'Quads',      3, 12, 16, 1),
          ex('Standing Calf Raise',       'Calves',     4, 12, 20, 1),
        ],
      },
      {
        label: 'Push B — Isolation',
        exercises: [
          ex('Incline Barbell Bench Press','Chest',    3, 8,  12, 2),
          ex('Dumbbell Bench Press',      'Chest',     3, 10, 15, 2),
          ex('Seated Dumbbell Press',     'Shoulders', 3, 10, 15, 2),
          ex('Cable Lateral Raise',       'Shoulders', 3, 15, 20, 1),
          ex('Rear Delt Fly',             'Shoulders', 3, 15, 20, 1),
          ex('Cable Tricep Pushdown',     'Triceps',   3, 12, 16, 1),
          ex('Dumbbell Overhead Tricep Extension','Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull B — Isolation',
        exercises: [
          ex('Lat Pulldown',              'Back',    3, 10, 15, 2),
          ex('Seated Cable Row',          'Back',    3, 10, 15, 2),
          ex('Chest-Supported Row',       'Back',    3, 10, 15, 2),
          ex('Cable Rear Delt Fly',       'Shoulders',3, 15, 20, 1),
          ex('Cable Curl',                'Biceps',  3, 12, 16, 1),
          ex('Incline Dumbbell Curl',     'Biceps',  3, 10, 15, 1),
        ],
      },
    ],
  },

  // ─── PPL 6x ────────────────────────────────────────────────────────────────
  {
    id: 'ppl-6',
    name: 'Push Pull Legs',
    tagline: '6 days/week',
    description: 'Two full PPL rotations per week. A sessions are barbell and compound heavy; B sessions are dumbbell and cable isolation. Each muscle hits twice weekly with contrasting stimuli — shorter, focused sessions six days in a row.',
    daysPerWeek: 6,
    recommendedWeeks: 8,
    focus: 'hypertrophy',
    bestFor: 'Advanced · 6 gym days · Recovers quickly',
    days: [
      {
        label: 'Push A — Barbell',
        exercises: [
          ex('Barbell Bench Press',       'Chest',     4, 6,  10, 2),
          ex('Incline Dumbbell Press',    'Chest',     3, 10, 15, 2),
          ex('Barbell Overhead Press',    'Shoulders', 3, 8,  12, 2),
          ex('Dumbbell Lateral Raise',    'Shoulders', 3, 15, 20, 1),
          ex('Skull Crusher',             'Triceps',   3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull A — Vertical',
        exercises: [
          ex('Pull-Up',                   'Back',    4, 6,  10, 2),
          ex('Barbell Row',               'Back',    3, 6,  10, 2),
          ex('Seated Cable Row',          'Back',    3, 10, 15, 2),
          ex('EZ-Bar Curl',               'Biceps',  3, 8,  12, 1),
          ex('Hammer Curl',               'Biceps',  3, 12, 16, 1),
        ],
      },
      {
        label: 'Legs A — Quad',
        exercises: [
          ex('Barbell Back Squat',        'Quads',      4, 6,  10, 2),
          ex('Leg Press',                 'Quads',      3, 10, 15, 2),
          ex('Leg Extension',             'Quads',      3, 12, 16, 1),
          ex('Seated Leg Curl',           'Hamstrings', 3, 10, 15, 1),
          ex('Standing Calf Raise',       'Calves',     4, 12, 20, 1),
        ],
      },
      {
        label: 'Push B — Dumbbell',
        exercises: [
          ex('Incline Barbell Bench Press','Chest',    3, 8,  12, 2),
          ex('Dumbbell Bench Press',      'Chest',     3, 10, 15, 2),
          ex('Arnold Press',              'Shoulders', 3, 10, 15, 2),
          ex('Cable Lateral Raise',       'Shoulders', 3, 15, 20, 1),
          ex('Cable Tricep Pushdown',     'Triceps',   3, 12, 16, 1),
          ex('Dumbbell Overhead Tricep Extension','Triceps', 3, 10, 15, 1),
        ],
      },
      {
        label: 'Pull B — Horizontal',
        exercises: [
          ex('Lat Pulldown',              'Back',    3, 10, 15, 2),
          ex('Dumbbell Row',              'Back',    3, 8,  12, 2),
          ex('Chest-Supported Row',       'Back',    3, 10, 15, 2),
          ex('Cable Rear Delt Fly',       'Shoulders',3, 15, 20, 1),
          ex('Cable Curl',                'Biceps',  3, 10, 15, 1),
          ex('Incline Dumbbell Curl',     'Biceps',  3, 10, 15, 1),
        ],
      },
      {
        label: 'Legs B — Posterior',
        exercises: [
          ex('Romanian Deadlift',         'Hamstrings', 4, 6,  10, 2),
          ex('Barbell Hip Thrust',        'Glutes',     3, 10, 15, 1),
          ex('Bulgarian Split Squat',     'Quads',      3, 8,  12, 2),
          ex('Lying Leg Curl',            'Hamstrings', 3, 10, 15, 1),
          ex('Seated Calf Raise',         'Calves',     4, 12, 20, 1),
        ],
      },
    ],
  },

  // ─── Kizen Powerbuilding 6x ────────────────────────────────────────────────
  // Rep/set schemes follow PB-001/PB-002/PB-003 (see slotRoleConfig.ts "emphasize"
  // tier) — Kizen 16-Week + PHAT (Layne Norton). Each movement pattern gets one
  // heavy/low-rep pass and one pump/high-rep pass per week.
  {
    id: 'kizen-6',
    name: 'Kizen Powerbuilding',
    tagline: '6 days/week',
    description: 'Push, Pull, and Legs each run twice weekly — a heavy, low-rep Power pass early in the week and a higher-rep Hypertrophy pass later. Combines Kizen 16-Week and PHAT-style powerbuilding: strength on the big lifts, size from the accessory work.',
    daysPerWeek: 6,
    recommendedWeeks: 16,
    focus: 'powerbuilding',
    bestFor: 'Advanced · Wants both strength and size',
    days: [
      {
        label: 'Push A — Power',
        exercises: [
          ex('Barbell Bench Press',        'Chest',     4, 3,  6,  2),
          ex('Barbell Overhead Press',     'Shoulders', 3, 6,  10, 2),
          ex('Incline Barbell Bench Press','Chest',     3, 6,  10, 2),
          ex('Cable Tricep Pushdown',      'Triceps',   3, 10, 15, 2),
        ],
      },
      {
        label: 'Pull A — Power',
        exercises: [
          ex('Deadlift',                   'Back',      4, 3,  6,  2),
          ex('Pull-Up',                    'Back',      3, 6,  10, 2),
          ex('Seated Cable Row',           'Back',      3, 6,  10, 2),
          ex('EZ-Bar Curl',                'Biceps',    3, 10, 15, 2),
        ],
      },
      {
        label: 'Legs A — Power',
        exercises: [
          ex('Barbell Back Squat',         'Quads',      4, 3,  6,  2),
          ex('Romanian Deadlift',          'Hamstrings', 3, 6,  10, 2),
          ex('Leg Press',                  'Quads',      3, 6,  10, 2),
          ex('Standing Calf Raise',        'Calves',     3, 10, 15, 2),
        ],
      },
      {
        label: 'Push B — Hypertrophy',
        exercises: [
          ex('Incline Dumbbell Press',           'Chest',     3, 10, 15, 2),
          ex('Pec Deck',                          'Chest',     3, 10, 15, 2),
          ex('Dumbbell Lateral Raise',            'Shoulders', 3, 10, 15, 2),
          ex('Rear Delt Fly',                     'Shoulders', 3, 10, 15, 2),
          ex('Cable Overhead Tricep Extension',   'Triceps',   3, 10, 15, 2),
        ],
      },
      {
        label: 'Pull B — Hypertrophy',
        exercises: [
          ex('Lat Pulldown',              'Back',    3, 10, 15, 2),
          ex('Chest-Supported Row',       'Back',    3, 10, 15, 2),
          ex('Face Pull',                 'Back',    3, 10, 15, 2),
          ex('Hammer Curl',               'Biceps',  3, 10, 15, 2),
          ex('Incline Dumbbell Curl',     'Biceps',  3, 10, 15, 2),
        ],
      },
      {
        label: 'Legs B — Hypertrophy',
        exercises: [
          ex('Leg Press',                 'Quads',      3, 10, 15, 2),
          ex('Leg Extension',             'Quads',      3, 10, 15, 2),
          ex('Lying Leg Curl',            'Hamstrings', 3, 10, 15, 2),
          ex('Barbell Hip Thrust',        'Glutes',     3, 10, 15, 2),
          ex('Seated Calf Raise',         'Calves',     3, 10, 15, 2),
        ],
      },
    ],
  },

  // ─── Strength 4x ───────────────────────────────────────────────────────────
  // Rep/set schemes follow ST-001/ST-002/ST-003 (see slotRoleConfig.ts "emphasize"
  // tier) — Prilepin's Chart + NSCA guidelines. One heavy Primary lift per day
  // in the 85-95% / 1-3 rep zone, with Secondary and Accessory work in the
  // Prilepin bridge zones to add volume without blunting recovery for the next
  // heavy day.
  {
    id: 'strength-4',
    name: 'Strength',
    tagline: '4 days/week',
    description: 'Built around one heavy compound lift per session — Squat, Bench, Deadlift, and Overhead Press — trained in the low-rep Prilepin zone. Secondary and accessory work stay in moderate rep ranges to add volume without eating into recovery for the next heavy day.',
    daysPerWeek: 4,
    recommendedWeeks: 10,
    focus: 'strength',
    bestFor: 'Intermediate–Advanced · Chasing squat/bench/press numbers',
    days: [
      {
        label: 'Squat',
        exercises: [
          ex('Barbell Back Squat',   'Quads',      5, 1, 3,  1),
          ex('Romanian Deadlift',    'Hamstrings', 4, 4, 6,  1),
          ex('Leg Extension',        'Quads',      3, 6, 10, 2),
          ex('Standing Calf Raise',  'Calves',     3, 8, 12, 2),
        ],
      },
      {
        label: 'Bench',
        exercises: [
          ex('Barbell Bench Press',     'Chest',     5, 1, 3,  1),
          ex('Barbell Overhead Press',  'Shoulders', 4, 4, 6,  1),
          ex('Incline Dumbbell Press',  'Chest',     3, 6, 10, 2),
          ex('Cable Tricep Pushdown',   'Triceps',   3, 6, 10, 2),
        ],
      },
      {
        label: 'Deadlift',
        exercises: [
          ex('Deadlift',           'Back',    5, 3, 6,  1),
          ex('Pull-Up',            'Back',    4, 4, 6,  1),
          ex('Seated Cable Row',   'Back',    3, 6, 10, 2),
          ex('EZ-Bar Curl',        'Biceps',  3, 6, 10, 2),
        ],
      },
      {
        label: 'Overhead Press',
        exercises: [
          ex('Barbell Overhead Press', 'Shoulders', 5, 1, 3,  1),
          ex('Front Squat',            'Quads',     4, 4, 6,  1),
          ex('Barbell Hip Thrust',     'Glutes',    3, 6, 10, 2),
          ex('Skull Crusher',          'Triceps',   3, 6, 10, 2),
        ],
      },
    ],
  },

  // ─── Thor 5x ───────────────────────────────────────────────────────────────
  // Physique-goal preset. Rotates which of Back/Shoulders/Arms trains first
  // across the week (Day 1 Back, Day 3 Shoulders, Day 5 Arms) so each gets
  // freshest-neural-drive treatment at least once, per RP's priority-first-
  // ordering doctrine. Chest/Legs/Abs are trained twice at lower priority to
  // conserve recovery for the emphasized muscles. Source: RP Strength "Thor"
  // hypertrophy blueprint (autoregulated ~3 RIR, add a set only if the target
  // muscle isn't sore going into the next session).
  {
    id: 'thor-5',
    name: 'Thor',
    tagline: '5 days/week',
    description: 'Rotates priority through back, shoulders, and arms so each trains first at least once a week, while chest, legs, and abs are trained twice at lower priority to conserve recovery. Start at 2 sets/exercise around 3 RIR — add a set only where soreness has cleared by the next session.',
    daysPerWeek: 5,
    recommendedWeeks: 12,
    focus: 'hypertrophy',
    bestFor: 'Physique-focused · Broad shoulders, back width, and arm size',
    days: [
      {
        label: 'Back, Shoulders, Arms',
        exercises: [
          ex('Barbell Row',            'Back',      2, 10, 15, 3),
          ex('Pull-Up',                'Back',      2, 10, 15, 3),
          ex('Dumbbell Lateral Raise', 'Shoulders', 2, 10, 15, 3),
          ex('Dumbbell Curl',          'Biceps',    2, 10, 15, 3),
          ex('Skull Crusher',          'Triceps',   2, 10, 15, 3),
        ],
      },
      {
        label: 'Chest, Legs, Abs',
        exercises: [
          ex('Barbell Back Squat',     'Quads', 2, 10, 15, 3),
          ex('Good Morning',           'Back',  2, 10, 15, 3),
          ex('Incline Dumbbell Press', 'Chest', 2, 10, 15, 3),
          ex('Decline Crunch',         'Abs',   2, 10, 15, 3),
        ],
      },
      {
        label: 'Shoulders, Back, Arms — Higher Rep',
        exercises: [
          ex('Cable Lateral Raise',   'Shoulders', 2, 10, 15, 3),
          ex('Rear Delt Fly',         'Shoulders', 2, 10, 15, 3),
          ex('Chest-Supported Row',   'Back',      2, 10, 15, 3),
          ex('EZ-Bar Curl',           'Biceps',    2, 10, 15, 3),
          ex('Cable Tricep Pushdown', 'Triceps',   2, 10, 15, 3),
        ],
      },
      {
        label: 'Chest, Legs, Abs',
        exercises: [
          ex('Machine Chest Press',        'Chest',      2, 10, 15, 3),
          ex('Hanging Leg Raise',          'Abs',        2, 10, 15, 3),
          ex('Bulgarian Split Squat',      'Quads',      2, 10, 15, 3),
          ex('Dumbbell Romanian Deadlift', 'Hamstrings', 2, 10, 15, 3),
        ],
      },
      {
        label: 'Arms, Back, Shoulders',
        exercises: [
          ex('Pull-Up',                         'Back',      2, 10, 15, 3),
          ex('Seated Cable Row',                'Back',      2, 10, 15, 3),
          ex('Cable Curl',                      'Biceps',    2, 10, 15, 3),
          ex('Incline Dumbbell Curl',           'Biceps',    2, 10, 15, 3),
          ex('Skull Crusher',                   'Triceps',   2, 10, 15, 3),
          ex('Cable Overhead Tricep Extension',  'Triceps',   2, 10, 15, 3),
          ex('Cable Rear Delt Fly',             'Shoulders', 2, 10, 15, 3),
        ],
      },
    ],
  },

  // ─── Superman 5x ───────────────────────────────────────────────────────────
  // Physique-goal preset. Rotates which of Chest/Shoulders/Back trains first
  // across the week (Day 1 Chest, Day 3 Back, Day 5 Shoulders/higher-rep) so
  // each "hero muscle" gets freshest treatment at least once, per RP's
  // priority-first-ordering doctrine. Arms/Legs days are lighter maintenance
  // work. Source: RP Strength "Superman" hypertrophy blueprint (autoregulated
  // — add sets only where recovery/soreness allows).
  {
    id: 'superman-5',
    name: 'Superman',
    tagline: '5 days/week',
    description: 'Rotates priority through chest, shoulders, and back so each trains first at least once a week — chest, then back, then delts on a higher-rep day — while two lighter arm/leg days hold everything else at maintenance. Start at 2 sets/exercise and add sets only where recovery allows.',
    daysPerWeek: 5,
    recommendedWeeks: 12,
    focus: 'hypertrophy',
    bestFor: 'Physique-focused · Broad shoulders, upper chest, and V-taper',
    days: [
      {
        label: 'Chest, Delts, Back',
        exercises: [
          ex('Incline Dumbbell Press', 'Chest',     2, 10, 15, 2),
          ex('Machine Chest Press',    'Chest',     2, 10, 15, 2),
          ex('Dumbbell Lateral Raise', 'Shoulders', 2, 10, 15, 2),
          ex('Cable Rear Delt Fly',    'Shoulders', 1, 10, 15, 2),
          ex('Lat Pulldown',          'Back',      1, 10, 15, 2),
        ],
      },
      {
        label: 'Legs & Arms — Maintenance',
        exercises: [
          ex('Barbell Back Squat',                 'Quads',   2, 10, 15, 2),
          ex('Good Morning',                       'Back',    2, 10, 15, 2),
          ex('Dumbbell Overhead Tricep Extension',  'Triceps', 2, 10, 15, 2),
          ex('Dumbbell Curl',                      'Biceps',  2, 10, 15, 2),
        ],
      },
      {
        label: 'Back, Chest, Delts',
        exercises: [
          ex('Pull-Up',                'Back',      2, 10, 15, 2),
          ex('Lat Pulldown',           'Back',      2, 10, 15, 2),
          ex('Incline Dumbbell Press', 'Chest',     2, 10, 15, 2),
          ex('Cable Crossover',        'Chest',     2, 10, 15, 2),
          ex('Machine Lateral Raise',  'Shoulders', 1, 10, 15, 2),
        ],
      },
      {
        label: 'Arms & Legs — Maintenance',
        exercises: [
          ex('Cable Curl',            'Biceps',     2, 10, 15, 2),
          ex('Cable Tricep Pushdown', 'Triceps',    2, 10, 15, 2),
          ex('Lying Leg Curl',        'Hamstrings', 2, 10, 15, 2),
          ex('Leg Press',             'Quads',      2, 10, 15, 2),
        ],
      },
      {
        label: 'Delts, Back, Chest — Higher Rep',
        exercises: [
          ex('Cable Lateral Raise',   'Shoulders', 2, 15, 20, 1),
          ex('Rear Delt Fly',         'Shoulders', 2, 15, 20, 1),
          ex('Seated Cable Row',      'Back',      2, 15, 20, 1),
          ex('Straight-Arm Pulldown', 'Back',      2, 15, 20, 1),
          ex('Pec Deck',              'Chest',     2, 15, 20, 0),
        ],
      },
    ],
  },
];

export function getEquipmentForTemplateExercise(name: string): string {
  const exercise = getExerciseByName(name);
  if (!exercise) throw new Error(`Exercise not found in database: "${name}"`);
  return exercise.equipment;
}

export function getProgramTemplateById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((template) => template.id === id);
}
