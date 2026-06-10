import { useWorkoutStore } from '../../src/store/useWorkoutStore';

beforeEach(() => {
  useWorkoutStore.setState({
    activeWorkoutId: null,
    exercises: [],
    activeProgramDayId: null,
    activeProgramName: null,
    activeProgramWeek: null,
    activeProgramDayNumber: null,
    activeProgramDayLabel: null,
    pendingFeedback: [],
    isSaving: false,
  });
});

// TabsIndex logic: const hasActiveWorkout = !!(activeWorkoutId && exercises.length > 0)
const hasActiveWorkout = () => {
  const { activeWorkoutId, exercises } = useWorkoutStore.getState();
  return !!(activeWorkoutId && exercises.length > 0);
};

describe('TabsIndex redirect logic', () => {
  it('routes to /programs when store has no active workout', () => {
    expect(hasActiveWorkout()).toBe(false);
  });

  it('routes to /workout when activeWorkoutId and exercises are both set', () => {
    useWorkoutStore.setState({
      activeWorkoutId: 'workout-123',
      exercises: [{ id: 'ex-1', name: 'Bench', muscleGroup: 'Chest', equipment: 'Barbell', sets: [] }],
    });
    expect(hasActiveWorkout()).toBe(true);
  });

  it('routes to /programs when activeWorkoutId is set but exercises is empty', () => {
    useWorkoutStore.setState({ activeWorkoutId: 'workout-123', exercises: [] });
    expect(hasActiveWorkout()).toBe(false);
  });

  it('routes to /programs when exercises exist but no activeWorkoutId', () => {
    useWorkoutStore.setState({
      activeWorkoutId: null,
      exercises: [{ id: 'ex-1', name: 'Bench', muscleGroup: 'Chest', equipment: 'Barbell', sets: [] }],
    });
    expect(hasActiveWorkout()).toBe(false);
  });
});
