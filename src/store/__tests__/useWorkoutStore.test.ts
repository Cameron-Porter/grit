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

jest.mock('../useProfileStore', () => ({
  useProfileStore: {
    getState: jest.fn().mockReturnValue({ bodyWeight: 180, experienceLevel: 'intermediate' }),
  },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { supabase } from '../../api/supabase';
import { markDayComplete, skipProgramDay } from '../../api/programs';
import { computeAndSaveProgressionTargets } from '../../api/progression';
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

  it('inserts a workout row and workout_sets', async () => {
    buildCompletedWorkout();
    const insertMock = jest.fn().mockReturnThis();
    const chain = {
      insert: insertMock,
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      then: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    // First from('workouts') returns error: null
    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ ...chain, insert: jest.fn().mockResolvedValue({ error: null }) })
      .mockReturnValueOnce({ ...chain, insert: jest.fn().mockResolvedValue({ error: null }) })
      .mockReturnValue({ ...chain, insert: jest.fn().mockResolvedValue({ error: null }) });

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

    expect(supabase.from).toHaveBeenCalledWith('workouts');
    expect(supabase.from).toHaveBeenCalledWith('workout_sets');
    expect(markDayComplete).toHaveBeenCalledWith('day-1');
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

  it('calls skipProgramDay when all sets are skipped', async () => {
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

    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    await act(async () => {
      await useWorkoutStore.getState().finishWorkout();
    });

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
  it('throws when workout insert fails and resets isSaving', async () => {
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

    (supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: new Error('DB error') }),
    });

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
