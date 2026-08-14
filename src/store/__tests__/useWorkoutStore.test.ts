import { act } from '@testing-library/react-native';

// ── Mocks must be declared before any imports that use them ──────────────────

jest.mock('../../api/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
    from: jest.fn(),
  },
}));

jest.mock('../../api/programs', () => ({
  markDayComplete: jest.fn().mockResolvedValue(undefined),
  skipProgramDay: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../api/progression', () => ({
  computeAndSaveProgressionTargets: jest.fn().mockResolvedValue(undefined),
}));

// Covers both the static import (enqueueWorkout, isNetworkError) and the
// dynamic import (drainPendingWorkouts) used inside finishWorkout.
jest.mock('../../api/pendingWorkouts', () => ({
  enqueueWorkout: jest.fn().mockResolvedValue(undefined),
  drainPendingWorkouts: jest.fn().mockResolvedValue(1),
  isNetworkError: jest.fn().mockReturnValue(false),
}));

jest.mock('../../lib/notifications', () => ({
  rescheduleWithStreak: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
}));

jest.mock('../useProfileStore', () => ({
  useProfileStore: {
    getState: jest.fn().mockReturnValue({ bodyWeight: 180, experienceLevel: 'intermediate', workoutRemindersEnabled: false }),
  },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { supabase } from '../../api/supabase';
import { markDayComplete, skipProgramDay } from '../../api/programs';
import { computeAndSaveProgressionTargets } from '../../api/progression';
import { enqueueWorkout, drainPendingWorkouts } from '../../api/pendingWorkouts';
import { useWorkoutStore } from '../useWorkoutStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockSupabaseChain = (overrides: { insert?: any; update?: any; select?: any } = {}) => {
  const chain: any = {
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    then: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...overrides,
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
};

const resetStore = () => {
  useWorkoutStore.setState({
    activeWorkoutId: null,
    activeProgramDayId: null,
    activeProgramName: null,
    activeProgramWeek: null,
    activeProgramDayNumber: null,
    activeProgramDayLabel: null,
    exercises: [],
    pendingFeedback: [],
    isSaving: false,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

// ─────────────────────────────────────────────────────────────────────────────
// startWorkout
// ─────────────────────────────────────────────────────────────────────────────

describe('startWorkout', () => {
  it('initializes a new workout when none is active', () => {
    useWorkoutStore.getState().startWorkout();
    const { activeWorkoutId, exercises } = useWorkoutStore.getState();
    expect(activeWorkoutId).toBeTruthy();
    expect(exercises).toEqual([]);
  });

  it('does not reset an active workout with exercises', () => {
    useWorkoutStore.setState({ activeWorkoutId: 'existing-id', exercises: [{ id: 'ex1', name: 'Bench', muscleGroup: 'Chest', equipment: 'Barbell', sets: [] }] });
    useWorkoutStore.getState().startWorkout();
    expect(useWorkoutStore.getState().activeWorkoutId).toBe('existing-id');
    expect(useWorkoutStore.getState().exercises).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// endWorkout
// ─────────────────────────────────────────────────────────────────────────────

describe('endWorkout', () => {
  it('clears all workout state', () => {
    useWorkoutStore.setState({ activeWorkoutId: 'id1', exercises: [{ id: 'ex1', name: 'Squat', muscleGroup: 'Quads', equipment: 'Barbell', sets: [] }] });
    useWorkoutStore.getState().endWorkout();
    const state = useWorkoutStore.getState();
    expect(state.activeWorkoutId).toBeNull();
    expect(state.exercises).toHaveLength(0);
    expect(state.isSaving).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addExercise
// ─────────────────────────────────────────────────────────────────────────────

describe('addExercise', () => {
  it('adds an exercise with correct fields', () => {
    useWorkoutStore.getState().addExercise('Bench Press', 'Chest', 'Barbell');
    const { exercises } = useWorkoutStore.getState();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('Bench Press');
    expect(exercises[0].muscleGroup).toBe('Chest');
    expect(exercises[0].equipment).toBe('Barbell');
    expect(exercises[0].sets).toEqual([]);
    expect(exercises[0].id).toBeTruthy();
  });

  it('defaults equipment to Bodyweight when omitted', () => {
    useWorkoutStore.getState().addExercise('Pull-Up', 'Back');
    expect(useWorkoutStore.getState().exercises[0].equipment).toBe('Bodyweight');
  });

  it('adds multiple exercises preserving order', () => {
    useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell');
    useWorkoutStore.getState().addExercise('Deadlift', 'Back', 'Barbell');
    const { exercises } = useWorkoutStore.getState();
    expect(exercises[0].name).toBe('Squat');
    expect(exercises[1].name).toBe('Deadlift');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// replaceExercise
// ─────────────────────────────────────────────────────────────────────────────

describe('replaceExercise', () => {
  it('replaces name and muscle group by exercise id', () => {
    useWorkoutStore.getState().addExercise('Bench Press', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().replaceExercise(id, 'Incline Press', 'Chest', 'Dumbbell');
    const ex = useWorkoutStore.getState().exercises[0];
    expect(ex.name).toBe('Incline Press');
    expect(ex.equipment).toBe('Dumbbell');
  });

  it('does not affect other exercises', () => {
    useWorkoutStore.getState().addExercise('Bench Press', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().replaceExercise(id, 'Dips', 'Chest', 'Bodyweight');
    expect(useWorkoutStore.getState().exercises[1].name).toBe('Squat');
  });

  it('preserves the authored prescription but resets movement-specific performance', () => {
    useWorkoutStore.getState().addExercise('Bench Press', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.setState({
      exercises: [{
        ...useWorkoutStore.getState().exercises[0],
        sets: [
          {
            reps: 10,
            weight: 185,
            completed: true,
            skipped: true,
            type: 'M',
            rir: 2,
            reportedRir: 0,
            targetReps: 10,
          },
        ],
      }],
    });

    useWorkoutStore.getState().replaceExercise(id, 'Incline Press', 'Chest', 'Dumbbell');

    expect(useWorkoutStore.getState().exercises[0].sets).toEqual([{
      reps: 0,
      weight: 0,
      completed: false,
      type: 'M',
      rir: 2,
      targetReps: 10,
    }]);
  });

  it('updates muscle priority and clears an exercise-specific pain warning', () => {
    useWorkoutStore.getState().addExercise('Bench Press', 'Chest', 'Barbell');
    const exercise = useWorkoutStore.getState().exercises[0];
    useWorkoutStore.setState({
      activeProgramMusclePriorities: { Chest: 'maintain', Back: 'emphasize' },
      exercises: [{ ...exercise, musclePriority: 'maintain', painWarning: 'Avoid this pressing variation.' }],
    });

    useWorkoutStore.getState().replaceExercise(exercise.id, 'Chest-Supported Row', 'Back', 'Dumbbell');

    const replaced = useWorkoutStore.getState().exercises[0];
    expect(replaced.musclePriority).toBe('emphasize');
    expect(replaced.painWarning).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeExercise
// ─────────────────────────────────────────────────────────────────────────────

describe('removeExercise', () => {
  it('removes the specified exercise', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().removeExercise(id);
    const { exercises } = useWorkoutStore.getState();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('Squat');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// moveExerciseUp / moveExerciseDown
// ─────────────────────────────────────────────────────────────────────────────

describe('moveExerciseUp / moveExerciseDown', () => {
  it('moves an exercise up', () => {
    useWorkoutStore.getState().addExercise('A', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('B', 'Back', 'Barbell');
    const idB = useWorkoutStore.getState().exercises[1].id;
    useWorkoutStore.getState().moveExerciseUp(idB);
    expect(useWorkoutStore.getState().exercises[0].name).toBe('B');
  });

  it('does not move first exercise up', () => {
    useWorkoutStore.getState().addExercise('A', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('B', 'Back', 'Barbell');
    const idA = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().moveExerciseUp(idA);
    expect(useWorkoutStore.getState().exercises[0].name).toBe('A');
  });

  it('moves an exercise down', () => {
    useWorkoutStore.getState().addExercise('A', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('B', 'Back', 'Barbell');
    const idA = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().moveExerciseDown(idA);
    expect(useWorkoutStore.getState().exercises[0].name).toBe('B');
  });

  it('does not move last exercise down', () => {
    useWorkoutStore.getState().addExercise('A', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('B', 'Back', 'Barbell');
    const idB = useWorkoutStore.getState().exercises[1].id;
    useWorkoutStore.getState().moveExerciseDown(idB);
    expect(useWorkoutStore.getState().exercises[1].name).toBe('B');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addSet / updateSet / removeSet
// ─────────────────────────────────────────────────────────────────────────────

describe('addSet', () => {
  it('adds a set with default values', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.weight).toBe(135);
    expect(set.reps).toBe(8);
    expect(set.completed).toBe(false);
  });

  it('adds a RIR set with reps=0 on week 1', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135, 2);
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(0);
    expect(set.rir).toBe(2);
  });
});

describe('updateSet', () => {
  it('updates a specific set by index', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().updateSet(id, 0, { reps: 10, completed: true });
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(10);
    expect(set.completed).toBe(true);
  });

  it('auto-matches weight on subsequent sets when flag is true', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().updateSet(id, 0, { weight: 145 }, true);
    const sets = useWorkoutStore.getState().exercises[0].sets;
    expect(sets[1].weight).toBe(145);
    expect(sets[2].weight).toBe(145);
  });

  it('does not auto-match weight when flag is false', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().updateSet(id, 0, { weight: 145 }, false);
    expect(useWorkoutStore.getState().exercises[0].sets[1].weight).toBe(135);
  });
});

describe('removeSet', () => {
  it('removes set at the given index', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().addSet(id, 145);
    useWorkoutStore.getState().removeSet(id, 0);
    expect(useWorkoutStore.getState().exercises[0].sets).toHaveLength(1);
    expect(useWorkoutStore.getState().exercises[0].sets[0].weight).toBe(145);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// skipSet / skipSets / skipAllSets
// ─────────────────────────────────────────────────────────────────────────────

describe('skipSet', () => {
  it('marks a single set as skipped', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().skipSet(id, 0);
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.skipped).toBe(true);
    expect(set.completed).toBe(false);
  });
});

describe('skipSets', () => {
  it('skips all non-completed sets for a single exercise', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().updateSet(id, 0, { completed: true });
    useWorkoutStore.getState().skipSets(id);
    const sets = useWorkoutStore.getState().exercises[0].sets;
    expect(sets[0].completed).toBe(true);
    expect(sets[0].skipped).toBeFalsy();
    expect(sets[1].skipped).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canFinish integration — derived from store state, tested here for regression
// ─────────────────────────────────────────────────────────────────────────────

describe('canFinish logic (post-skipAllSets)', () => {
  const getCanFinish = () => {
    const { exercises } = useWorkoutStore.getState();
    const exerciseDone = (ex: any) =>
      ex.sets.length === 0 || ex.sets.every((s: any) => s.completed || s.skipped);
    const allSkipped =
      exercises.length > 0 &&
      exercises.every(exerciseDone) &&
      exercises.some((ex: any) => ex.sets.length > 0) &&
      exercises.every((ex: any) => ex.sets.length === 0 || ex.sets.every((s: any) => s.skipped && !s.completed));
    return (
      exercises.length > 0 &&
      exercises.every(exerciseDone) &&
      (exercises.some((ex: any) => ex.sets.some((s: any) => s.completed)) || allSkipped)
    );
  };

  it('canFinish is false before any sets are done', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    expect(getCanFinish()).toBe(false);
  });

  it('canFinish is true after skipAllSets', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().skipAllSets();
    expect(getCanFinish()).toBe(true);
  });

  it('canFinish is true when an exercise has no sets (trivially done)', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell');
    const id2 = useWorkoutStore.getState().exercises[1].id;
    useWorkoutStore.getState().addSet(id2, 225);
    useWorkoutStore.getState().skipAllSets();
    expect(getCanFinish()).toBe(true);
  });

  it('canFinish is true when all sets are completed (normal finish)', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().updateSet(id, 0, { completed: true });
    expect(getCanFinish()).toBe(true);
  });

  it('canFinish is false when some sets are neither completed nor skipped', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().updateSet(id, 0, { completed: true });
    expect(getCanFinish()).toBe(false);
  });
});

describe('skipAllSets', () => {
  it('skips all incomplete sets across all exercises', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell');
    const [id1, id2] = useWorkoutStore.getState().exercises.map((e) => e.id);
    useWorkoutStore.getState().addSet(id1, 135);
    useWorkoutStore.getState().addSet(id1, 135);
    useWorkoutStore.getState().addSet(id2, 225);
    useWorkoutStore.getState().updateSet(id1, 0, { completed: true });
    useWorkoutStore.getState().skipAllSets();
    const { exercises } = useWorkoutStore.getState();
    expect(exercises[0].sets[0].completed).toBe(true);
    expect(exercises[0].sets[0].skipped).toBeFalsy();
    expect(exercises[0].sets[1].skipped).toBe(true);
    expect(exercises[1].sets[0].skipped).toBe(true);
  });

  it('does not skip already-completed sets', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().addSet(id, 135);
    useWorkoutStore.getState().updateSet(id, 0, { completed: true });
    useWorkoutStore.getState().skipAllSets();
    expect(useWorkoutStore.getState().exercises[0].sets[0].completed).toBe(true);
    expect(useWorkoutStore.getState().exercises[0].sets[0].skipped).toBeFalsy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// queueFeedback / queueSoreness
// ─────────────────────────────────────────────────────────────────────────────

describe('queueFeedback', () => {
  it('adds feedback entry', () => {
    useWorkoutStore.getState().queueFeedback('Chest', 'none', 'high', 'moderate');
    const { pendingFeedback } = useWorkoutStore.getState();
    expect(pendingFeedback).toHaveLength(1);
    expect(pendingFeedback[0].muscleGroup).toBe('Chest');
    expect(pendingFeedback[0].pump).toBe('high');
  });

  it('replaces existing feedback for same muscle group', () => {
    useWorkoutStore.getState().queueFeedback('Chest', 'none', 'high', 'moderate');
    useWorkoutStore.getState().queueFeedback('Chest', 'mild', 'low', 'high');
    const { pendingFeedback } = useWorkoutStore.getState();
    expect(pendingFeedback).toHaveLength(1);
    expect(pendingFeedback[0].pump).toBe('low');
  });
});

describe('queueSoreness', () => {
  it('adds soreness to existing feedback entry', () => {
    useWorkoutStore.getState().queueFeedback('Back', 'none', 'medium', 'moderate');
    useWorkoutStore.getState().queueSoreness('Back', 'high');
    const { pendingFeedback } = useWorkoutStore.getState();
    expect(pendingFeedback[0].soreness).toBe('high');
    expect(pendingFeedback[0].pump).toBe('medium');
  });

  it('creates new entry if no existing feedback', () => {
    useWorkoutStore.getState().queueSoreness('Quads', 'moderate');
    const { pendingFeedback } = useWorkoutStore.getState();
    expect(pendingFeedback[0].soreness).toBe('moderate');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setExerciseNote
// ─────────────────────────────────────────────────────────────────────────────

describe('setExerciseNote', () => {
  it('sets note on the correct exercise', () => {
    useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
    const id = useWorkoutStore.getState().exercises[0].id;
    useWorkoutStore.getState().setExerciseNote(id, 'Keep elbows tucked');
    expect(useWorkoutStore.getState().exercises[0].note).toBe('Keep elbows tucked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// startFromProgramDay
// ─────────────────────────────────────────────────────────────────────────────

describe('startFromProgramDay', () => {
  it('pre-loads exercises and sets from template', () => {
    useWorkoutStore.getState().startFromProgramDay(
      'day-uuid',
      'PPL',
      [{ name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', targetSets: 3, targetRepsMin: 8, targetWeight: 135, rir: 2 }],
      1, 1, 'Push',
    );
    const { exercises, activeProgramDayId, activeProgramName } = useWorkoutStore.getState();
    expect(activeProgramDayId).toBe('day-uuid');
    expect(activeProgramName).toBe('PPL');
    expect(exercises[0].name).toBe('Bench Press');
    expect(exercises[0].sets).toHaveLength(3);
  });

  it('pre-fills rep count on week 2+', () => {
    useWorkoutStore.getState().startFromProgramDay(
      'day-2',
      'PPL',
      [{ name: 'Squat', muscleGroup: 'Quads', equipment: 'Barbell', targetSets: 3, targetRepsMin: 6, targetWeight: 225, rir: 1 }],
      2, 1, null,
    );
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(6);
  });

  // The rep band doesn't move week to week under double progression (only load
  // does), so pre-filling the floor made week 2 look like a regression from
  // whatever the user actually hit last week — which is usually already above
  // the floor. Pre-fill the ceiling instead: it's the number double progression
  // is actually asking the user to chase.
  it('pre-fills the top of the rep band, not the floor, on week 2+', () => {
    useWorkoutStore.getState().startFromProgramDay(
      'day-3',
      'PPL',
      [{ name: 'Squat', muscleGroup: 'Quads', equipment: 'Barbell', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, targetWeight: 225, rir: 1 }],
      2, 1, null,
    );
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(10);
  });

  it('leaves reps=0 on week 1 for RIR sets', () => {
    useWorkoutStore.getState().startFromProgramDay(
      'day-1',
      'PPL',
      [{ name: 'Squat', muscleGroup: 'Quads', equipment: 'Barbell', targetSets: 2, targetRepsMin: 8, targetWeight: 185, rir: 2 }],
      1, 1, null,
    );
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(0);
  });

  it('does not override an active workout with completed sets', () => {
    useWorkoutStore.setState({
      activeWorkoutId: 'existing',
      exercises: [{ id: 'ex1', name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell', sets: [{ id: 's1', reps: 5, weight: 100, rir: 2, completed: true }] }],
    });
    useWorkoutStore.getState().startFromProgramDay('day-x', 'New', [], 1, 1, null);
    expect(useWorkoutStore.getState().activeWorkoutId).toBe('existing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// startQuickWorkout
// ─────────────────────────────────────────────────────────────────────────────

describe('startQuickWorkout', () => {
  it('starts a session with no program/day linkage', () => {
    useWorkoutStore.getState().startQuickWorkout('Upper · Push', [
      { name: 'Bench Press', muscleGroup: 'Chest', musclePriority: 'grow', equipment: 'Barbell', targetSets: 3, targetRepsMin: 6, targetRepsMax: 9, targetWeight: 135, rir: 2, isFirstSession: false },
    ]);
    const state = useWorkoutStore.getState();
    expect(state.activeProgramDayId).toBeNull();
    expect(state.activeProgramId).toBeNull();
    expect(state.activeProgramWeek).toBeNull();
    expect(state.activeProgramName).toBe('Quick Workout');
    expect(state.activeProgramDayLabel).toBe('Upper · Push');
    expect(state.exercises[0].name).toBe('Bench Press');
    expect(state.exercises[0].sets).toHaveLength(3);
  });

  it('pre-fills reps and weight when isFirstSession is false', () => {
    useWorkoutStore.getState().startQuickWorkout('Upper · Push', [
      { name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', targetSets: 2, targetRepsMin: 6, targetRepsMax: 9, targetWeight: 135, rir: 2, isFirstSession: false },
    ]);
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(9);
    expect(set.weight).toBe(135);
  });

  it('leaves reps and weight blank when isFirstSession is true', () => {
    useWorkoutStore.getState().startQuickWorkout('Upper · Push', [
      { name: 'Cable Fly', muscleGroup: 'Chest', equipment: 'Cable', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15, targetWeight: 0, rir: 2, isFirstSession: true },
    ]);
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(0);
    expect(set.weight).toBe(0);
  });

  // The key divergence from startFromProgramDay: that action's blank-vs-
  // prefilled choice is one flag for the whole session (Week 1 vs Week 2+).
  // A Quick Workout mixes exercises with and without history in the same
  // session, so each exercise must resolve isFirstSession independently.
  it('mixes first-session and history-backed exercises independently in one session', () => {
    useWorkoutStore.getState().startQuickWorkout('Upper · Push', [
      { name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', targetSets: 1, targetRepsMin: 6, targetRepsMax: 9, targetWeight: 135, rir: 2, isFirstSession: false },
      { name: 'Cable Fly', muscleGroup: 'Chest', equipment: 'Cable', targetSets: 1, targetRepsMin: 10, targetRepsMax: 15, targetWeight: 0, rir: 2, isFirstSession: true },
    ]);
    const [bench, fly] = useWorkoutStore.getState().exercises;
    expect(bench.sets[0].reps).toBe(9);
    expect(bench.sets[0].weight).toBe(135);
    expect(fly.sets[0].reps).toBe(0);
    expect(fly.sets[0].weight).toBe(0);
  });

  it('resolves Bodyweight equipment from the profile bodyWeight even on a first session', () => {
    useWorkoutStore.getState().startQuickWorkout('Upper · Pull', [
      { name: 'Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight', targetSets: 2, targetRepsMin: 8, targetRepsMax: 15, targetWeight: 0, rir: 2, isFirstSession: true },
    ]);
    // useProfileStore is mocked at the top of this file with bodyWeight: 180.
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.weight).toBe(180);
  });

  it('does not override an active workout with completed sets', () => {
    useWorkoutStore.setState({
      activeWorkoutId: 'existing',
      exercises: [{ id: 'ex1', name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell', sets: [{ id: 's1', reps: 5, weight: 100, rir: 2, completed: true }] }],
    });
    useWorkoutStore.getState().startQuickWorkout('Upper · Push', [
      { name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', targetSets: 1, targetRepsMin: 6, targetRepsMax: 9, targetWeight: 135, rir: 2, isFirstSession: false },
    ]);
    expect(useWorkoutStore.getState().activeWorkoutId).toBe('existing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// finishWorkout — happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('finishWorkout — happy path', () => {
  const buildCompletedWorkout = () => {
    useWorkoutStore.setState({
      activeWorkoutId: 'wid-1',
      activeProgramDayId: 'day-1',
      activeProgramName: 'PPL',
      activeProgramWeek: 1,
      activeProgramDayNumber: 1,
      activeProgramDayLabel: 'Push',
      exercises: [
        {
          id: 'ex-1',
          name: 'Bench Press',
          muscleGroup: 'Chest',
          equipment: 'Barbell',
          sets: [
            { reps: 8, weight: 135, completed: true },
            { reps: 8, weight: 135, completed: true },
          ],
        },
      ],
      pendingFeedback: [],
      isSaving: false,
    });
  };

  it('enqueues a workout payload with exercise and set data', async () => {
    buildCompletedWorkout();

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    expect(enqueueWorkout).toHaveBeenCalledTimes(1);
    const payload = (enqueueWorkout as jest.Mock).mock.calls[0][0];
    expect(payload.workoutId).toBeTruthy();
    expect(payload.programDayId).toBe('day-1');
    expect(payload.exercises).toHaveLength(1);
    expect(payload.exercises[0].sets).toHaveLength(2);
  });

  it('resets store state after successful save', async () => {
    buildCompletedWorkout();
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    const { activeWorkoutId, exercises, isSaving } = useWorkoutStore.getState();
    expect(activeWorkoutId).toBeNull();
    expect(exercises).toHaveLength(0);
    expect(isSaving).toBe(false);
  });

  it('calls markDayComplete for the finished day', async () => {
    buildCompletedWorkout();

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    expect(markDayComplete).toHaveBeenCalledWith('day-1');
  });

  // Regression test: getNextProgramWorkout() (called by the workout screen's
  // auto-load-next-workout effect the instant activeWorkoutId goes null) picks
  // the next day by querying program_days.completed. If clearWorkoutState() ran
  // before the day was actually marked complete, that effect would re-fetch the
  // day just finished instead of advancing, and the screen would "blank out"
  // into a fresh copy of it. markDayComplete must be awaited first.
  it('marks the day complete before clearing workout state', async () => {
    buildCompletedWorkout();
    let activeWorkoutIdWhenMarked: string | null | undefined;
    (markDayComplete as jest.Mock).mockImplementationOnce(async () => {
      activeWorkoutIdWhenMarked = useWorkoutStore.getState().activeWorkoutId;
    });

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    expect(activeWorkoutIdWhenMarked).toBe('wid-1');
  });

  // Bug fix regression: the workout screen's auto-load-next-workout effect
  // (app/workout.tsx) fires the instant activeWorkoutId goes null, but
  // computeAndSaveProgressionTargets (next week's program_day_targets) only
  // runs inside drainPendingWorkouts, which resolves *after* that. Without a
  // signal to wait on, the effect could fetch before the write landed and
  // pre-fill the next session's weight as 0. isSyncingWorkout is that signal
  // — it must be true for the duration of drainPendingWorkouts and false once
  // finishWorkout resolves.
  it('sets isSyncingWorkout while drainPendingWorkouts is in flight, clears it after', async () => {
    buildCompletedWorkout();
    let syncingDuringDrain: boolean | undefined;
    (drainPendingWorkouts as jest.Mock).mockImplementationOnce(async () => {
      syncingDuringDrain = useWorkoutStore.getState().isSyncingWorkout;
      return 1;
    });

    expect(useWorkoutStore.getState().isSyncingWorkout).toBe(false);

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    expect(syncingDuringDrain).toBe(true);
    expect(useWorkoutStore.getState().isSyncingWorkout).toBe(false);
  });

  it('clears isSyncingWorkout even if drainPendingWorkouts throws', async () => {
    buildCompletedWorkout();
    (drainPendingWorkouts as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('unexpected sync failure');
    });

    await act(async () => {
      await expect(useWorkoutStore.getState().finishWorkout()).rejects.toThrow();
    });

    expect(useWorkoutStore.getState().isSyncingWorkout).toBe(false);
  });

  it('enqueues a payload with skipped sets so the drain can handle day-skipping', async () => {
    useWorkoutStore.setState({
      activeWorkoutId: 'wid-2',
      activeProgramDayId: 'day-2',
      activeProgramName: 'PPL',
      activeProgramWeek: 1,
      activeProgramDayNumber: 1,
      activeProgramDayLabel: null,
      exercises: [
        {
          id: 'ex-2',
          name: 'Squat',
          muscleGroup: 'Quads',
          equipment: 'Barbell',
          sets: [
            { reps: 0, weight: 225, completed: false, skipped: true },
          ],
        },
      ],
      pendingFeedback: [],
      isSaving: false,
    });

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    expect(enqueueWorkout).toHaveBeenCalledTimes(1);
    const payload = (enqueueWorkout as jest.Mock).mock.calls[0][0];
    expect(payload.programDayId).toBe('day-2');
    const allSkipped = payload.exercises.every((ex: any) =>
      ex.sets.every((s: any) => !s.completed)
    );
    expect(allSkipped).toBe(true);

    // All sets skipped — finishWorkout calls skipProgramDay rather than markDayComplete
    expect(skipProgramDay).toHaveBeenCalledWith('day-2');
    expect(markDayComplete).not.toHaveBeenCalled();
  });

  it('does not call markDayComplete when no program day is active', async () => {
    useWorkoutStore.setState({
      activeWorkoutId: 'wid-3',
      activeProgramDayId: null,
      activeProgramName: null,
      activeProgramWeek: null,
      activeProgramDayNumber: null,
      activeProgramDayLabel: null,
      exercises: [
        {
          id: 'ex-3',
          name: 'Bench',
          muscleGroup: 'Chest',
          equipment: 'Barbell',
          sets: [{ reps: 8, weight: 135, completed: true }],
        },
      ],
      pendingFeedback: [],
      isSaving: false,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    expect(markDayComplete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// finishWorkout — error paths
// ─────────────────────────────────────────────────────────────────────────────

describe('finishWorkout — error paths', () => {
  it('throws when enqueuing fails and resets isSaving', async () => {
    useWorkoutStore.setState({
      activeWorkoutId: 'wid-err',
      activeProgramDayId: null,
      activeProgramName: null,
      activeProgramWeek: null,
      activeProgramDayNumber: null,
      activeProgramDayLabel: null,
      exercises: [
        {
          id: 'ex-err',
          name: 'Bench',
          muscleGroup: 'Chest',
          equipment: 'Barbell',
          sets: [{ reps: 8, weight: 135, completed: true }],
        },
      ],
      pendingFeedback: [],
      isSaving: false,
    });

    (enqueueWorkout as jest.Mock).mockRejectedValueOnce(new Error('storage error'));

    let didThrow = false;
    try {
      await act(async () => {
        await useWorkoutStore.getState().finishWorkout();
      });
    } catch {
      didThrow = true;
    }

    expect(didThrow).toBe(true);
    expect(useWorkoutStore.getState().isSaving).toBe(false);
  });

  it('does not run twice when already saving (isSaving guard)', async () => {
    useWorkoutStore.setState({
      isSaving: true,
      exercises: [{ id: 'ex', name: 'Bench', muscleGroup: 'Chest', equipment: 'Barbell', sets: [{ reps: 8, weight: 135, completed: true }] }],
    });

    await useWorkoutStore.getState().finishWorkout();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('does nothing when exercises list is empty', async () => {
    useWorkoutStore.setState({ exercises: [], isSaving: false });
    await useWorkoutStore.getState().finishWorkout();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// skipDay
// ─────────────────────────────────────────────────────────────────────────────

describe('skipDay', () => {
  it('calls skipProgramDay and clears state', async () => {
    useWorkoutStore.setState({ activeWorkoutId: 'wid', activeProgramDayId: 'day-skip', exercises: [] });

    await act(async () => {
      await useWorkoutStore.getState().skipDay('day-skip');
    });

    expect(skipProgramDay).toHaveBeenCalledWith('day-skip');
    expect(useWorkoutStore.getState().activeWorkoutId).toBeNull();
    expect(useWorkoutStore.getState().activeProgramDayId).toBeNull();
  });

  it('still clears state even if skipProgramDay throws', async () => {
    (skipProgramDay as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    await act(async () => {
      await useWorkoutStore.getState().skipDay('day-fail');
    });

    expect(useWorkoutStore.getState().activeWorkoutId).toBeNull();
  });
});
