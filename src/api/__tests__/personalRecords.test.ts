jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } } }) },
    from: jest.fn(),
  },
}));

import { supabase } from '../supabase';
import { getAllPRs, getPRForExercise, upsertPR, createManualPR } from '../personalRecords';

const mockFrom = supabase.from as jest.Mock;

const makeChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
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
// getAllPRs
// ─────────────────────────────────────────────────────────────────────────────

describe('getAllPRs', () => {
  it('returns all PR records', async () => {
    const records = [
      { id: 'pr1', exercise_name: 'Bench Press', weight: 225, reps: 5, achieved_at: '2026-01-01', updated_at: '2026-01-01' },
    ];
    mockFrom.mockReturnValue(makeChain({ data: records, error: null }));
    const result = await getAllPRs();
    expect(result).toEqual(records);
    expect(mockFrom).toHaveBeenCalledWith('personal_records');
  });

  it('returns empty array when no PRs', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await getAllPRs()).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: new Error('fetch fail') }));
    await expect(getAllPRs()).rejects.toThrow('fetch fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPRForExercise
// ─────────────────────────────────────────────────────────────────────────────

describe('getPRForExercise', () => {
  it('returns the PR for the given exercise', async () => {
    const pr = { id: 'pr1', exercise_name: 'Squat', weight: 315, reps: 5, achieved_at: '2026-01-01', updated_at: '2026-01-01' };
    mockFrom.mockReturnValue(makeChain({ data: pr, error: null }));
    const result = await getPRForExercise('Squat');
    expect(result?.exercise_name).toBe('Squat');
  });

  it('returns null when no PR exists', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await getPRForExercise('Unknown Exercise')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createManualPR
// ─────────────────────────────────────────────────────────────────────────────

describe('createManualPR', () => {
  it('inserts a new PR when no existing record', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const noExistChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(noExistChain)
      .mockReturnValueOnce({ insert: insertMock });

    await createManualPR('Bench Press', 225, 5);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ exercise_name: 'Bench Press', weight: 225, reps: 5, user_id: 'user-abc' }),
    );
  });

  it('updates weight/reps when PR already exists', async () => {
    const existing = { id: 'existing-pr-1' };
    const existChain = makeChain({ data: existing, error: null });
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom
      .mockReturnValueOnce(existChain)
      .mockReturnValueOnce({ update: updateMock });

    await createManualPR('Bench Press', 235, 3);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ weight: 235, reps: 3 }));
    expect(eqMock).toHaveBeenCalledWith('id', 'existing-pr-1');
  });

  it('throws when insert fails (RLS or network error)', async () => {
    const noExistChain = makeChain({ data: null, error: null });
    const insertMock = jest.fn().mockResolvedValue({ error: new Error('RLS violation') });
    mockFrom
      .mockReturnValueOnce(noExistChain)
      .mockReturnValueOnce({ insert: insertMock });

    await expect(createManualPR('Bench Press', 225, 5)).rejects.toThrow('RLS violation');
  });

  it('throws when update fails', async () => {
    const existing = { id: 'pr-id' };
    const existChain = makeChain({ data: existing, error: null });
    const eqMock = jest.fn().mockResolvedValue({ error: new Error('update fail') });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom
      .mockReturnValueOnce(existChain)
      .mockReturnValueOnce({ update: updateMock });

    await expect(createManualPR('Squat', 300, 5)).rejects.toThrow('update fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// upsertPR
// ─────────────────────────────────────────────────────────────────────────────

describe('upsertPR', () => {
  it('inserts when no existing PR', async () => {
    const noExistChain = makeChain({ data: null, error: null });
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom
      .mockReturnValueOnce(noExistChain)
      .mockReturnValueOnce({ insert: insertMock });

    await upsertPR('Deadlift', 405, 1);
    expect(insertMock).toHaveBeenCalled();
  });

  it('updates when new weight exceeds existing', async () => {
    const existing = { id: 'pr1', weight: 300, reps: 5 };
    const existChain = makeChain({ data: existing, error: null });
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom
      .mockReturnValueOnce(existChain)
      .mockReturnValueOnce({ update: updateMock });

    await upsertPR('Deadlift', 315, 5);
    expect(eqMock).toHaveBeenCalledWith('id', 'pr1');
  });

  it('does NOT update when new weight is lower than existing', async () => {
    const existing = { id: 'pr1', weight: 405, reps: 1 };
    mockFrom.mockReturnValue(makeChain({ data: existing, error: null }));

    await upsertPR('Deadlift', 315, 5);
    // Only one call to from() — the existence check; no update chain
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('updates bodyweight PRs based on reps, not weight', async () => {
    const existing = { id: 'pr1', weight: 0, reps: 10 };
    const existChain = makeChain({ data: existing, error: null });
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom
      .mockReturnValueOnce(existChain)
      .mockReturnValueOnce({ update: updateMock });

    await upsertPR('Pull-Up', 0, 15, true);
    expect(eqMock).toHaveBeenCalled();
  });

  it('does NOT update bodyweight PRs when new reps are lower', async () => {
    const existing = { id: 'pr1', weight: 0, reps: 20 };
    mockFrom.mockReturnValue(makeChain({ data: existing, error: null }));

    await upsertPR('Pull-Up', 0, 15, true);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
