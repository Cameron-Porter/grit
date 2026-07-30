jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../progression', () => ({
  computeAndSaveProgressionTargets: jest.fn(),
}));

jest.mock('../programs', () => ({
  markDayComplete: jest.fn().mockResolvedValue(undefined),
  skipProgramDay: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../store/useProfileStore', () => ({
  useProfileStore: { getState: () => ({ experienceLevel: 'intermediate' }) },
}));

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { computeAndSaveProgressionTargets } from '../progression';
import { enqueueWorkout, drainPendingWorkouts, type PendingWorkoutPayload } from '../pendingWorkouts';

const mockFrom = supabase.from as jest.Mock;
const mockComputeTargets = computeAndSaveProgressionTargets as jest.Mock;

const makeChain = (result: { data: any; error: any }) => ({
  insert: jest.fn().mockResolvedValue(result),
});

const buildPayload = (): PendingWorkoutPayload => ({
  workoutId: 'w1',
  userId: 'user-1',
  name: 'Push Day',
  programName: 'PPL',
  programDayId: 'day-1',
  completedAt: '2026-07-24T00:00:00Z',
  enqueuedAt: '2026-07-24T00:00:00Z',
  exercises: [
    {
      name: 'Bench Press',
      muscleGroup: 'Chest',
      musclePriority: null,
      equipment: 'Barbell',
      note: null,
      sets: [{ reps: 8, weight: 135, rir: 2, completed: true }],
    },
  ],
  feedback: [],
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// drainPendingWorkouts must await progression-target generation before
// resolving — the next week's pre-filled weights/reps depend on it having
// actually written to program_day_targets by the time this promise settles.
// A fire-and-forget call here can be silently dropped if the app backgrounds
// right after the user taps Finish.
// ─────────────────────────────────────────────────────────────────────────────

describe('drainPendingWorkouts — progression target computation', () => {
  it('awaits computeAndSaveProgressionTargets before resolving', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workouts') return makeChain({ data: null, error: null });
      if (table === 'workout_sets') return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    let targetsComputed = false;
    mockComputeTargets.mockImplementation(() =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          targetsComputed = true;
          resolve();
        }, 10),
      ),
    );

    await enqueueWorkout(buildPayload());
    await drainPendingWorkouts();

    expect(targetsComputed).toBe(true);
    // VA-013: workoutId is now threaded through so progression can look up
    // this workout's soreness feedback (see src/api/progression.ts).
    expect(mockComputeTargets).toHaveBeenCalledWith('day-1', 'intermediate', 'w1');
  });

  it('still resolves the queue entry even if progression computation throws', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workouts') return makeChain({ data: null, error: null });
      if (table === 'workout_sets') return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });
    mockComputeTargets.mockRejectedValue(new Error('boom'));

    await enqueueWorkout(buildPayload());
    const synced = await drainPendingWorkouts();

    expect(synced).toBe(1);
  });
});
