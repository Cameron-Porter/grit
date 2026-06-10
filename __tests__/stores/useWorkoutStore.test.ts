import { act } from '@testing-library/react-native';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';

// Reset store between tests
beforeEach(() => {
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
});

describe('startWorkout', () => {
  it('creates a new workout id and clears exercises', () => {
    act(() => useWorkoutStore.getState().startWorkout());
    const { activeWorkoutId, exercises } = useWorkoutStore.getState();
    expect(activeWorkoutId).toBeTruthy();
    expect(exercises).toEqual([]);
  });

  it('does not reset if workout already active with exercises', () => {
    act(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise('Bench Press', 'Chest', 'Barbell');
    });
    const idBefore = useWorkoutStore.getState().activeWorkoutId;
    act(() => useWorkoutStore.getState().startWorkout());
    expect(useWorkoutStore.getState().activeWorkoutId).toBe(idBefore);
  });
});

describe('addExercise / addSet', () => {
  beforeEach(() => act(() => useWorkoutStore.getState().startWorkout()));

  it('adds an exercise with empty sets', () => {
    act(() => useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell'));
    const { exercises } = useWorkoutStore.getState();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('Squat');
    expect(exercises[0].sets).toEqual([]);
  });

  it('adds a set with default values', () => {
    act(() => {
      useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell');
      const id = useWorkoutStore.getState().exercises[0].id;
      useWorkoutStore.getState().addSet(id, 100);
    });
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.weight).toBe(100);
    expect(set.reps).toBe(8);
    expect(set.completed).toBe(false);
  });

  it('adds a set with RIR placeholder', () => {
    act(() => {
      useWorkoutStore.getState().addExercise('Squat', 'Quads', 'Barbell');
      const id = useWorkoutStore.getState().exercises[0].id;
      useWorkoutStore.getState().addSet(id, 100, 3);
    });
    const set = useWorkoutStore.getState().exercises[0].sets[0];
    expect(set.reps).toBe(0);
    expect(set.rir).toBe(3);
  });
});

describe('updateSet', () => {
  let exerciseId: string;

  beforeEach(() => {
    act(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise('Bench Press', 'Chest', 'Barbell');
      exerciseId = useWorkoutStore.getState().exercises[0].id;
      useWorkoutStore.getState().addSet(exerciseId, 100);
      useWorkoutStore.getState().addSet(exerciseId, 100);
      useWorkoutStore.getState().addSet(exerciseId, 100);
    });
  });

  it('updates the target set only when autoMatchWeight is false', () => {
    act(() => useWorkoutStore.getState().updateSet(exerciseId, 0, { weight: 110 }, false));
    const sets = useWorkoutStore.getState().exercises[0].sets;
    expect(sets[0].weight).toBe(110);
    expect(sets[1].weight).toBe(100);
    expect(sets[2].weight).toBe(100);
  });

  it('auto-matches subsequent sets with same weight when enabled', () => {
    act(() => useWorkoutStore.getState().updateSet(exerciseId, 0, { weight: 120 }, true));
    const sets = useWorkoutStore.getState().exercises[0].sets;
    expect(sets[0].weight).toBe(120);
    expect(sets[1].weight).toBe(120);
    expect(sets[2].weight).toBe(120);
  });

  it('does not update sets BEFORE the changed set when auto-match is on', () => {
    act(() => {
      useWorkoutStore.getState().updateSet(exerciseId, 0, { weight: 90 }, false);
      useWorkoutStore.getState().updateSet(exerciseId, 1, { weight: 130 }, true);
    });
    const sets = useWorkoutStore.getState().exercises[0].sets;
    expect(sets[0].weight).toBe(90);  // before changed index — not touched
    expect(sets[1].weight).toBe(130); // changed set
    expect(sets[2].weight).toBe(130); // after, same old weight as set[1] (100) → auto-matched
  });

  it('does not overwrite sets that already had a different weight', () => {
    act(() => {
      useWorkoutStore.getState().updateSet(exerciseId, 1, { weight: 115 }, false); // set different weight first
      useWorkoutStore.getState().updateSet(exerciseId, 0, { weight: 120 }, true);
    });
    const sets = useWorkoutStore.getState().exercises[0].sets;
    expect(sets[1].weight).toBe(115); // was changed independently — not overwritten
    expect(sets[2].weight).toBe(120); // still matched (same old weight 100)
  });

  it('marks set as completed', () => {
    act(() => useWorkoutStore.getState().updateSet(exerciseId, 0, { completed: true }));
    expect(useWorkoutStore.getState().exercises[0].sets[0].completed).toBe(true);
  });
});

describe('canFinish logic', () => {
  let exerciseId: string;

  beforeEach(() => {
    act(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
      exerciseId = useWorkoutStore.getState().exercises[0].id;
    });
  });

  const canFinish = () => {
    const { exercises } = useWorkoutStore.getState();
    return (
      exercises.length > 0 &&
      exercises.some((ex) => ex.sets.some((s) => s.completed)) &&
      exercises.every((ex) => ex.sets.every((s) => s.completed || s.skipped))
    );
  };

  it('cannot finish with no sets', () => {
    expect(canFinish()).toBe(false);
  });

  it('cannot finish with incomplete sets', () => {
    act(() => useWorkoutStore.getState().addSet(exerciseId, 100));
    expect(canFinish()).toBe(false);
  });

  it('can finish when all sets are completed', () => {
    act(() => {
      useWorkoutStore.getState().addSet(exerciseId, 100);
      useWorkoutStore.getState().updateSet(exerciseId, 0, { completed: true });
    });
    expect(canFinish()).toBe(true);
  });

  it('can finish when sets are completed or skipped', () => {
    act(() => {
      useWorkoutStore.getState().addSet(exerciseId, 100);
      useWorkoutStore.getState().addSet(exerciseId, 100);
      useWorkoutStore.getState().updateSet(exerciseId, 0, { completed: true });
      useWorkoutStore.getState().skipSet(exerciseId, 1);
    });
    expect(canFinish()).toBe(true);
  });

  it('can finish with empty sets on a program exercise (vacuously true)', () => {
    // Program exercise starts with no sets but should not block finish if another exercise is done
    act(() => {
      useWorkoutStore.getState().addExercise('Curl', 'Biceps', 'Dumbbell');
      const curlId = useWorkoutStore.getState().exercises[1].id;
      useWorkoutStore.getState().addSet(exerciseId, 100);
      useWorkoutStore.getState().updateSet(exerciseId, 0, { completed: true });
      // curls has no sets — vacuously all sets done
    });
    expect(canFinish()).toBe(true);
  });
});

describe('queueFeedback / queueSoreness', () => {
  it('queues feedback for a muscle group', () => {
    act(() => useWorkoutStore.getState().queueFeedback('Chest', 'None', 'Amazing', 'Just right'));
    const { pendingFeedback } = useWorkoutStore.getState();
    expect(pendingFeedback).toHaveLength(1);
    expect(pendingFeedback[0]).toMatchObject({ muscleGroup: 'Chest', pump: 'Amazing' });
  });

  it('replaces existing feedback for the same muscle', () => {
    act(() => {
      useWorkoutStore.getState().queueFeedback('Chest', 'None', 'Amazing', 'Just right');
      useWorkoutStore.getState().queueFeedback('Chest', 'Low', 'Low', 'Too much');
    });
    const { pendingFeedback } = useWorkoutStore.getState();
    expect(pendingFeedback).toHaveLength(1);
    expect(pendingFeedback[0].pump).toBe('Low');
  });

  it('preserves soreness field when updating feedback', () => {
    act(() => {
      useWorkoutStore.getState().queueSoreness('Chest', 'Still sore');
      useWorkoutStore.getState().queueFeedback('Chest', 'None', 'Amazing', 'Just right');
    });
    const { pendingFeedback } = useWorkoutStore.getState();
    expect(pendingFeedback[0].soreness).toBe('Still sore');
    expect(pendingFeedback[0].pump).toBe('Amazing');
  });

  it('queues soreness for a new muscle group', () => {
    act(() => useWorkoutStore.getState().queueSoreness('Back', 'Healed early'));
    const entry = useWorkoutStore.getState().pendingFeedback.find((f) => f.muscleGroup === 'Back');
    expect(entry?.soreness).toBe('Healed early');
  });
});

describe('endWorkout', () => {
  it('clears all workout state', () => {
    act(() => {
      useWorkoutStore.getState().startWorkout();
      useWorkoutStore.getState().addExercise('Bench', 'Chest', 'Barbell');
      useWorkoutStore.getState().endWorkout();
    });
    const state = useWorkoutStore.getState();
    expect(state.activeWorkoutId).toBeNull();
    expect(state.exercises).toEqual([]);
    expect(state.pendingFeedback).toEqual([]);
  });
});
