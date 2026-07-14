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
];

export function getEquipmentForTemplateExercise(name: string): string {
  return getExerciseByName(name)?.equipment ?? 'Barbell';
}
