jest.mock('../exercises', () => ({ getExercises: jest.fn() }));
jest.mock('../history', () => ({
  getExerciseAllSessions: jest.fn(),
  getRecentWorkoutExerciseNames: jest.fn(),
}));
jest.mock('../programs', () => ({
  getCurrentProgramFocus: jest.fn(),
  saveProgramDayTargets: jest.fn(),
}));
jest.mock('../../data/exerciseDatabase', () => ({ getExerciseByName: jest.fn() }));

import { getExercises } from '../exercises';
import { getExerciseAllSessions, getRecentWorkoutExerciseNames } from '../history';
import { getCurrentProgramFocus, saveProgramDayTargets } from '../programs';
import { getExerciseByName } from '../../data/exerciseDatabase';
import { generateQuickWorkout } from '../quickWorkout';

const mockGetExercises = getExercises as jest.Mock;
const mockGetExerciseAllSessions = getExerciseAllSessions as jest.Mock;
const mockGetRecentWorkoutExerciseNames = getRecentWorkoutExerciseNames as jest.Mock;
const mockGetCurrentProgramFocus = getCurrentProgramFocus as jest.Mock;
const mockGetExerciseByName = getExerciseByName as jest.Mock;

// Upper+Push resolves to 5 structural slots at 'grow' priority:
// Chest-Primary, Chest-Secondary, Shoulders-Primary, Shoulders-Secondary, Triceps-Primary
// (verified in __tests__/rules/quickWorkoutBuilder.test.ts).
const CATALOG = [
  { id: '1', name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell', is_custom: false, description: null, movement_category: 'Horizontal Press' },
  { id: '2', name: 'Incline Dumbbell Press', muscle_group: 'Chest', equipment: 'Dumbbell', is_custom: false, description: null, movement_category: 'Incline Press' },
  { id: '3', name: 'Overhead Press', muscle_group: 'Shoulders', equipment: 'Barbell', is_custom: false, description: null, movement_category: 'Vertical Press' },
  { id: '4', name: 'Lateral Raise', muscle_group: 'Shoulders', equipment: 'Dumbbell', is_custom: false, description: null, movement_category: 'Lateral Raise' },
  { id: '5', name: 'Triceps Pushdown', muscle_group: 'Triceps', equipment: 'Cable', is_custom: false, description: null, movement_category: 'Elbow Extension' },
];

const defaultOpts = {
  preferredEquipment: [] as string[],
  usePreferredEquipment: false,
  experienceLevel: 'intermediate' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetExercises.mockResolvedValue(CATALOG);
  mockGetRecentWorkoutExerciseNames.mockResolvedValue([]);
  mockGetExerciseAllSessions.mockResolvedValue([]);
  mockGetCurrentProgramFocus.mockResolvedValue('hypertrophy');
  mockGetExerciseByName.mockReturnValue(undefined);
});

describe('generateQuickWorkout — focus resolution', () => {
  it('uses the active program focus returned by getCurrentProgramFocus', async () => {
    mockGetCurrentProgramFocus.mockResolvedValue('strength');
    const result = await generateQuickWorkout('Upper', 'Push', defaultOpts);
    expect(result.focus).toBe('strength');
    // Strength Primary/grow has a distinctly lower rep ceiling than hypertrophy's.
    const primary = result.exercises.find((e) => e.muscleGroup === 'Chest');
    expect(primary?.targetRepsMax).toBeLessThan(12);
  });
});

describe('generateQuickWorkout — no history', () => {
  it('marks every pick as isFirstSession with zero starting weight', async () => {
    const result = await generateQuickWorkout('Upper', 'Push', defaultOpts);
    expect(result.exercises.length).toBeGreaterThan(0);
    for (const ex of result.exercises) {
      expect(ex.isFirstSession).toBe(true);
      expect(ex.targetWeight).toBe(0);
    }
  });
});

describe('generateQuickWorkout — resolves from history without corrupting RIR', () => {
  it('pulls weight/reps from the most recent session and leaves RIR at the prescribed value', async () => {
    mockGetExerciseAllSessions.mockImplementation(async (name: string) =>
      name === 'Barbell Bench Press'
        ? [{ workoutId: 'w1', date: '2026-01-01T00:00:00Z', programName: null, sets: [{ weight: 135, reps: 8, set_index: 0 }] }]
        : [],
    );

    const result = await generateQuickWorkout('Upper', 'Push', defaultOpts);
    const bench = result.exercises.find((e) => e.name === 'Barbell Bench Press')!;

    expect(bench.isFirstSession).toBe(false);
    expect(bench.targetWeight).toBe(135);
    // Regression guard: a prior version of the meso context passed to
    // recommendProgression (mesoWeek=1/totalMesoWeeks=1) silently inflated
    // RIR by 1 via HV-001's taper term. It must stay at the slot's
    // prescribed RIR (2 for Primary/grow) for a one-off session.
    expect(bench.rir).toBe(2);
  });

  it('uses actual RIR and holds load when ceiling reps were harder than prescribed', async () => {
    mockGetExerciseAllSessions.mockImplementation(async (name: string) =>
      name === 'Barbell Bench Press'
        ? [{
            workoutId: 'w1',
            date: '2026-01-01T00:00:00Z',
            programName: null,
            sets: [
              { weight: 135, reps: 12, set_index: 0, reported_rir: 0 },
              { weight: 135, reps: 12, set_index: 1, reported_rir: 0 },
              { weight: 135, reps: 12, set_index: 2, reported_rir: 0 },
            ],
          }]
        : [],
    );

    const result = await generateQuickWorkout('Upper', 'Push', defaultOpts);
    const bench = result.exercises.find((e) => e.name === 'Barbell Bench Press')!;

    expect(bench.targetWeight).toBe(135);
  });
});

describe('generateQuickWorkout — never writes program_day_targets', () => {
  it('does not call saveProgramDayTargets — there is no program_day_id for an ad-hoc session', async () => {
    await generateQuickWorkout('Upper', 'Push', defaultOpts);
    expect(saveProgramDayTargets).not.toHaveBeenCalled();
  });
});

describe('generateQuickWorkout — missing catalog coverage', () => {
  it('skips a slot instead of throwing when no exercise exists for its muscle', async () => {
    mockGetExercises.mockResolvedValue(CATALOG.filter((e) => e.muscle_group !== 'Triceps'));
    const result = await generateQuickWorkout('Upper', 'Push', defaultOpts);
    expect(result.exercises.some((e) => e.muscleGroup === 'Triceps')).toBe(false);
    expect(result.exercises.length).toBeGreaterThan(0);
  });
});

describe('generateQuickWorkout — session label', () => {
  it('labels Upper+Push as "Upper · Push"', async () => {
    const result = await generateQuickWorkout('Upper', 'Push', defaultOpts);
    expect(result.sessionLabel).toBe('Upper · Push');
  });

  it('labels FullBody+All as just "Full Body" (subtype is not user-chosen for FullBody)', async () => {
    mockGetExercises.mockResolvedValue([
      ...CATALOG,
      { id: '6', name: 'Back Squat', muscle_group: 'Quads', equipment: 'Barbell', is_custom: false, description: null, movement_category: 'Quad Dominant' },
      { id: '7', name: 'Barbell Row', muscle_group: 'Back', equipment: 'Barbell', is_custom: false, description: null, movement_category: 'Horizontal Pull' },
    ]);
    const result = await generateQuickWorkout('FullBody', 'All', defaultOpts);
    expect(result.sessionLabel).toBe('Full Body');
  });
});

describe('generateQuickWorkout — anti-repeat wiring', () => {
  it('avoids the exercise used in the most recent workout when an alternative exists', async () => {
    mockGetRecentWorkoutExerciseNames.mockResolvedValue([['Barbell Bench Press'], []]);
    const result = await generateQuickWorkout('Upper', 'Push', defaultOpts);
    const chestPrimary = result.exercises.find((e) => e.muscleGroup === 'Chest');
    expect(chestPrimary?.name).toBe('Incline Dumbbell Press');
  });
});
