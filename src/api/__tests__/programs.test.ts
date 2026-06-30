jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } } }) },
    from: jest.fn(),
  },
}));

import { supabase } from '../supabase';
import {
  createProgram,
  deleteProgram,
  getPrograms,
  getProgramDays,
  markDayComplete,
  skipProgramDay,
  unskipProgramDay,
  getNextProgramWorkout,
} from '../programs';

const mockFrom = supabase.from as jest.Mock;

const makeChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
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
// getPrograms
// ─────────────────────────────────────────────────────────────────────────────

describe('getPrograms', () => {
  it('returns programs for the current user', async () => {
    const programs = [{ id: 'p1', name: 'PPL', total_weeks: 4, days_per_week: 3, is_current: true }];
    mockFrom.mockReturnValue(makeChain({ data: programs, error: null }));
    const result = await getPrograms();
    expect(result).toEqual([{ ...programs[0], completedDays: 0, totalDays: 0 }]);
    expect(mockFrom).toHaveBeenCalledWith('programs');
  });

  it('returns empty array when no programs', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await getPrograms()).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: new Error('DB fail') }));
    await expect(getPrograms()).rejects.toThrow('DB fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getProgramDays
// ─────────────────────────────────────────────────────────────────────────────

describe('getProgramDays', () => {
  it('returns days for the given program', async () => {
    const days = [
      { id: 'd1', program_id: 'p1', week_number: 1, day_number: 1, completed: false, skipped: false },
      { id: 'd2', program_id: 'p1', week_number: 1, day_number: 2, completed: false, skipped: false },
    ];
    mockFrom.mockReturnValue(makeChain({ data: days, error: null }));
    const result = await getProgramDays('p1');
    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('program_days');
  });

  it('returns empty array when no days', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await getProgramDays('p1')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markDayComplete
// ─────────────────────────────────────────────────────────────────────────────

describe('markDayComplete', () => {
  it('updates completed=true and sets completed_at', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    await markDayComplete('day-1');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    expect(eqMock).toHaveBeenCalledWith('id', 'day-1');
  });

  it('throws on error', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: new Error('fail') });
    mockFrom.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: eqMock }) });
    await expect(markDayComplete('bad-id')).rejects.toThrow('fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// skipProgramDay
// ─────────────────────────────────────────────────────────────────────────────

describe('skipProgramDay', () => {
  it('sets skipped=true, completed=false, completed_at=null', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    await skipProgramDay('day-x');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true, completed: false, completed_at: null }),
    );
  });

  it('throws on error', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: new Error('skip fail') });
    mockFrom.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: eqMock }) });
    await expect(skipProgramDay('bad')).rejects.toThrow('skip fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// unskipProgramDay
// ─────────────────────────────────────────────────────────────────────────────

describe('unskipProgramDay', () => {
  it('sets skipped=false', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    await unskipProgramDay('day-y');
    expect(updateMock).toHaveBeenCalledWith({ skipped: false });
  });

  it('throws on error', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: new Error('unskip fail') });
    mockFrom.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: eqMock }) });
    await expect(unskipProgramDay('bad')).rejects.toThrow('unskip fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteProgram
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteProgram', () => {
  it('calls delete on the programs table', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ delete: deleteMock });

    await deleteProgram('p1');
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('id', 'p1');
  });

  it('throws on error', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: new Error('delete fail') });
    mockFrom.mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: eqMock }) });
    await expect(deleteProgram('bad')).rejects.toThrow('delete fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getNextProgramWorkout
// ─────────────────────────────────────────────────────────────────────────────

describe('getNextProgramWorkout', () => {
  it('returns null when no current program', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    expect(await getNextProgramWorkout()).toBeNull();
  });

  it('skips completed and skipped days when finding next workout', async () => {
    const programs = [{ id: 'p1', name: 'PPL', total_weeks: 4, days_per_week: 3, is_current: true }];
    const days = [
      { id: 'd1', program_id: 'p1', week_number: 1, day_number: 1, completed: true, skipped: false },
      { id: 'd2', program_id: 'p1', week_number: 1, day_number: 2, completed: false, skipped: true },
      { id: 'd3', program_id: 'p1', week_number: 1, day_number: 3, completed: false, skipped: false },
    ];
    const templateDay = { id: 'td3' };
    const exercises = [{ id: 'pe1', program_day_id: 'td3', exercise_name: 'Squat', sort_order: 0 }];

    mockFrom
      .mockReturnValueOnce(makeChain({ data: programs, error: null }))    // getPrograms
      .mockReturnValueOnce(makeChain({ data: days, error: null }))        // getProgramDays
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null })) // getTemplateDayExercises: find week-1 day
      .mockReturnValueOnce(makeChain({ data: exercises, error: null }));  // getProgramExercises

    const result = await getNextProgramWorkout();
    expect(result?.day.id).toBe('d3');
    expect(result?.exercises).toHaveLength(1);
  });

  it('returns null when all days are completed or skipped', async () => {
    const programs = [{ id: 'p1', name: 'PPL', total_weeks: 1, days_per_week: 2, is_current: true }];
    const days = [
      { id: 'd1', program_id: 'p1', week_number: 1, day_number: 1, completed: true, skipped: false },
      { id: 'd2', program_id: 'p1', week_number: 1, day_number: 2, completed: false, skipped: true },
    ];
    mockFrom
      .mockReturnValueOnce(makeChain({ data: programs, error: null }))
      .mockReturnValueOnce(makeChain({ data: days, error: null }));

    expect(await getNextProgramWorkout()).toBeNull();
  });
});
