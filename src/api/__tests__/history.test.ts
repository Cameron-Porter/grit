jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } } }) },
    from: jest.fn(),
  },
}));

import { supabase } from '../supabase';
import { getWeeklyCompletedSetsByMuscle, getMuscleSorenessForWorkout, getExerciseAllSessions, getConsecutiveStillSoreByMuscle } from '../history';

const mockFrom = supabase.from as jest.Mock;

const makeChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };
  Object.defineProperty(chain, 'then', {
    get() {
      return (resolve: any) => Promise.resolve(result).then(resolve);
    },
  });
  return chain;
};

beforeEach(() => jest.clearAllMocks());

describe('getWeeklyCompletedSetsByMuscle', () => {
  it('sums completed sets per muscle across every finished workout in the week', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [{ id: 'day-1' }, { id: 'day-2' }], error: null })) // program_days
      .mockReturnValueOnce(makeChain({ data: [{ id: 'workout-1' }, { id: 'workout-2' }], error: null })) // workouts
      .mockReturnValueOnce(makeChain({
        data: [
          { muscle_group: 'Chest' },
          { muscle_group: 'Chest' },
          { muscle_group: 'Chest' },
          { muscle_group: 'Triceps' },
        ],
        error: null,
      })); // workout_sets

    const result = await getWeeklyCompletedSetsByMuscle('program-1', 2);
    expect(result).toEqual({ Chest: 3, Triceps: 1 });
  });

  it('only queries the requested program week, not other weeks', async () => {
    const daysChain = makeChain({ data: [{ id: 'day-1' }], error: null });
    mockFrom
      .mockReturnValueOnce(daysChain)
      .mockReturnValueOnce(makeChain({ data: [], error: null }));

    await getWeeklyCompletedSetsByMuscle('program-1', 3);
    expect(daysChain.eq).toHaveBeenCalledWith('program_id', 'program-1');
    expect(daysChain.eq).toHaveBeenCalledWith('week_number', 3);
  });

  it('returns {} when no program days exist for that week', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));
    const result = await getWeeklyCompletedSetsByMuscle('program-1', 5);
    expect(result).toEqual({});
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns {} when no workouts have been finished yet this week', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [{ id: 'day-1' }], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }));
    const result = await getWeeklyCompletedSetsByMuscle('program-1', 1);
    expect(result).toEqual({});
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('returns {} without hitting Supabase when unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null } });
    const result = await getWeeklyCompletedSetsByMuscle('program-1', 1);
    expect(result).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// VA-013: soreness lookup for a single already-finished workout, used to feed
// ProgressionContext.soreness in src/api/progression.ts.
describe('getMuscleSorenessForWorkout', () => {
  it('keys soreness by muscle group for the given workout', async () => {
    mockFrom.mockReturnValueOnce(makeChain({
      data: [
        { muscle_group: 'Chest', soreness: 'Still sore' },
        { muscle_group: 'Back', soreness: 'Not sore' },
      ],
      error: null,
    }));

    const result = await getMuscleSorenessForWorkout('workout-1');
    expect(result).toEqual({ Chest: 'Still sore', Back: 'Not sore' });
  });

  it('returns {} without hitting Supabase when unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null } });
    const result = await getMuscleSorenessForWorkout('workout-1');
    expect(result).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns {} when the query yields no rows', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }));
    const result = await getMuscleSorenessForWorkout('workout-1');
    expect(result).toEqual({});
  });
});

describe('getExerciseAllSessions', () => {
  it('returns reported RIR and excludes soft-deleted workouts', async () => {
    const setsChain = makeChain({
      data: [{ workout_id: 'workout-1', weight: 135, reps: 10, set_index: 0, reported_rir: 1 }],
      error: null,
    });
    const workoutsChain = makeChain({
      data: [{ id: 'workout-1', completed_at: '2026-08-01T00:00:00Z', program_name: 'Mid Summer', program_day_id: 'day-1' }],
      error: null,
    });
    mockFrom
      .mockReturnValueOnce(setsChain)
      .mockReturnValueOnce(workoutsChain);

    const result = await getExerciseAllSessions('Bench Press');

    expect(setsChain.select).toHaveBeenCalledWith('workout_id, weight, reps, set_index, reported_rir');
    expect(workoutsChain.is).toHaveBeenCalledWith('deleted_at', null);
    expect(result[0].sets[0].reported_rir).toBe(1);
  });
});

describe('getConsecutiveStillSoreByMuscle', () => {
  it('counts the current program-scoped streak and stops at another response', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [{ id: 'day-1' }, { id: 'day-2' }], error: null }))
      .mockReturnValueOnce(makeChain({
        data: [
          { id: 'workout-3', completed_at: '2026-08-03T00:00:00Z' },
          { id: 'workout-2', completed_at: '2026-08-02T00:00:00Z' },
          { id: 'workout-1', completed_at: '2026-08-01T00:00:00Z' },
        ],
        error: null,
      }))
      .mockReturnValueOnce(makeChain({
        data: [
          { workout_id: 'workout-3', muscle_group: 'Chest', soreness: 'Still sore' },
          { workout_id: 'workout-2', muscle_group: 'Chest', soreness: 'Still sore' },
          { workout_id: 'workout-1', muscle_group: 'Chest', soreness: 'Just in time' },
          { workout_id: 'workout-3', muscle_group: 'Back', soreness: 'Not sore' },
        ],
        error: null,
      }));

    await expect(getConsecutiveStillSoreByMuscle('program-1')).resolves.toEqual({
      consecutiveStillSore: { Chest: 2 },
      restartAtAnchor: { Chest: false, Back: false },
    });
  });

  it('marks the first recovered response after two failures for an anchor restart', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [{ id: 'day-1' }], error: null }))
      .mockReturnValueOnce(makeChain({
        data: [
          { id: 'w3', completed_at: '2026-08-03T00:00:00Z' },
          { id: 'w2', completed_at: '2026-08-02T00:00:00Z' },
          { id: 'w1', completed_at: '2026-08-01T00:00:00Z' },
        ], error: null,
      }))
      .mockReturnValueOnce(makeChain({ data: [
        { workout_id: 'w3', muscle_group: 'Chest', soreness: 'Healed early' },
        { workout_id: 'w2', muscle_group: 'Chest', soreness: 'Still sore' },
        { workout_id: 'w1', muscle_group: 'Chest', soreness: 'Still sore' },
      ], error: null }));

    await expect(getConsecutiveStillSoreByMuscle('program-1')).resolves.toEqual({
      consecutiveStillSore: {},
      restartAtAnchor: { Chest: true },
    });
  });
});
