jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-xyz' } } }) },
    from: jest.fn(),
  },
}));

import { supabase } from '../supabase';
import { getExercises, createCustomExercise } from '../exercises';

const mockFrom = supabase.from as jest.Mock;

const makeChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  Object.defineProperty(chain, 'then', {
    get() {
      return (resolve: any) => Promise.resolve(result).then(resolve);
    },
  });
  return chain;
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getExercises
// ─────────────────────────────────────────────────────────────────────────────

describe('getExercises', () => {
  it('returns all exercises ordered by muscle group then name', async () => {
    const exercises = [
      { id: 'e1', name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell', is_custom: false },
      { id: 'e2', name: 'Squat', muscle_group: 'Quads', equipment: 'Barbell', is_custom: false },
    ];
    mockFrom.mockReturnValue(makeChain({ data: exercises, error: null }));
    const result = await getExercises();
    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('exercises');
  });

  it('returns empty array when no exercises', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await getExercises()).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: new Error('exercises fetch fail') }));
    await expect(getExercises()).rejects.toThrow('exercises fetch fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createCustomExercise
// ─────────────────────────────────────────────────────────────────────────────

describe('createCustomExercise', () => {
  it('inserts with is_custom=true and user_id from auth', async () => {
    const newExercise = { id: 'ce1', name: 'My Curl', muscle_group: 'Biceps', equipment: 'Dumbbell', is_custom: true, description: null };
    const singleMock = jest.fn().mockResolvedValue({ data: newExercise, error: null });
    const selectMock = jest.fn().mockReturnValue({ single: singleMock });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    mockFrom.mockReturnValue({ insert: insertMock });

    const result = await createCustomExercise('My Curl', 'Biceps', 'Dumbbell');

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ is_custom: true, user_id: 'user-xyz' }),
    );
    expect(result).toEqual(newExercise);
  });

  it('throws when insert fails (RLS)', async () => {
    const singleMock = jest.fn().mockResolvedValue({ data: null, error: new Error('insert denied') });
    const selectMock = jest.fn().mockReturnValue({ single: singleMock });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    mockFrom.mockReturnValue({ insert: insertMock });

    await expect(createCustomExercise('Bad Exercise', 'Chest', 'Barbell')).rejects.toThrow('insert denied');
  });
});
