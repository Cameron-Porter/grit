jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } } }) },
    from: jest.fn(),
  },
}));

import { supabase } from '../supabase';
import { getWeeklyCompletedSetsByMuscle } from '../history';

const mockFrom = supabase.from as jest.Mock;

const makeChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
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
