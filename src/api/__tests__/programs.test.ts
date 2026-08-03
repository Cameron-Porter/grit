jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } } }) },
    from: jest.fn(),
  },
}));

import { supabase } from '../supabase';
import {
  backfillWeek1ExerciseRoles,
  createProgram,
  deleteProgram,
  getPrograms,
  getProgramDays,
  markDayComplete,
  skipProgramDay,
  unskipProgramDay,
  getNextProgramWorkout,
  getFutureScheduledSetsByMuscle,
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
    gt: jest.fn().mockReturnThis(),
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
// backfillWeek1ExerciseRoles — TEMPORARY one-time role-inference fix
// ─────────────────────────────────────────────────────────────────────────────

describe('backfillWeek1ExerciseRoles', () => {
  it('infers Primary for the first compound per muscle, Secondary for the next, Accessory for isolation regardless of order', async () => {
    const day1Chain = makeChain({ data: [{ id: 'day-1' }], error: null });
    const exercisesChain = makeChain({
      data: [
        { id: 'pe-1', program_day_id: 'day-1', muscle_group: 'Chest', exercise_name: 'Barbell Bench Press', sort_order: 0 },
        { id: 'pe-2', program_day_id: 'day-1', muscle_group: 'Chest', exercise_name: 'Dumbbell Flyes', sort_order: 1 },
        { id: 'pe-3', program_day_id: 'day-1', muscle_group: 'Chest', exercise_name: 'Incline Dumbbell Press', sort_order: 2 },
      ],
      error: null,
    });
    const update1 = makeChain({ error: null });
    const update2 = makeChain({ error: null });
    const update3 = makeChain({ error: null });

    mockFrom
      .mockReturnValueOnce(day1Chain)
      .mockReturnValueOnce(exercisesChain)
      .mockReturnValueOnce(update1)
      .mockReturnValueOnce(update2)
      .mockReturnValueOnce(update3);

    const updated = await backfillWeek1ExerciseRoles('program-1');

    expect(updated).toBe(3);
    expect(update1.update).toHaveBeenCalledWith({ role: 'Primary' });
    expect(update2.update).toHaveBeenCalledWith({ role: 'Accessory' });
    expect(update3.update).toHaveBeenCalledWith({ role: 'Secondary' });
  });

  it('does not guess a role for an unmatched exercise name, and does not let it steal the Primary slot from a later real compound', async () => {
    // Regression test: originally reproduced with "Incline Dumbbell Flyes",
    // which at the time didn't match anything in exerciseDatabase.ts. That
    // gap has since been closed (see the fixture's ch-11 entry), so this now
    // uses a deliberately fictional name that will never resolve, to keep
    // testing the unmatched-name path itself. Before the underlying fix, an
    // unmatched name defaulted to "assume compound", claiming Chest's
    // Primary slot ahead of the real compound (Dumbbell Bench Press) later
    // in the day and wrongly bumping it to Secondary.
    const day1Chain = makeChain({ data: [{ id: 'day-1' }], error: null });
    const exercisesChain = makeChain({
      data: [
        { id: 'pe-1', program_day_id: 'day-1', muscle_group: 'Chest', exercise_name: 'Nonexistent Cable Squeeze Press', sort_order: 0 },
        { id: 'pe-2', program_day_id: 'day-1', muscle_group: 'Chest', exercise_name: 'Dumbbell Bench Press', sort_order: 1 },
      ],
      error: null,
    });
    const update1 = makeChain({ error: null });

    mockFrom
      .mockReturnValueOnce(day1Chain)
      .mockReturnValueOnce(exercisesChain)
      .mockReturnValueOnce(update1); // only ONE update call — pe-1 is skipped entirely

    const updated = await backfillWeek1ExerciseRoles('program-1');

    expect(updated).toBe(1);
    // Dumbbell Bench Press (matched, real compound) correctly gets Primary —
    // not bumped to Secondary by the unmatched exercise ahead of it.
    expect(update1.update).toHaveBeenCalledWith({ role: 'Primary' });
  });

  it('returns 0 when the program has no Week 1 days', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));
    const updated = await backfillWeek1ExerciseRoles('program-1');
    expect(updated).toBe(0);
  });

  it('returns 0 without hitting Supabase when unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null } });
    const updated = await backfillWeek1ExerciseRoles('program-1');
    expect(updated).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
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
      .mockReturnValueOnce(makeChain({ data: exercises, error: null }))   // getProgramExercises
      .mockReturnValueOnce(makeChain({ data: [], error: null }));         // getProgramDayTargets (none saved yet)

    const result = await getNextProgramWorkout();
    expect(result?.day.id).toBe('d3');
    expect(result?.exercises).toHaveLength(1);
  });

  // Bug fix regression: getNextProgramWorkout used to return the raw week-1
  // template exercises, whose target_weight is always null (addProgramExercise
  // never sets it). app/workout.tsx's auto-load-next-workout effect — the path
  // that fires the instant a workout finishes — read that null straight through
  // to `?? 0`, so every non-Bodyweight exercise's weight field zeroed out on
  // the very next workout even though computeAndSaveProgressionTargets had
  // already computed a real weight into program_day_targets. Now merged in,
  // the same way day/[dayId].tsx's handleStartWorkout already did it.
  it('merges program_day_targets over the null template target_weight', async () => {
    const programs = [{ id: 'p1', name: 'PPL', total_weeks: 4, days_per_week: 3, is_current: true }];
    const days = [
      { id: 'd1', program_id: 'p1', week_number: 2, day_number: 1, completed: false, skipped: false },
    ];
    const templateDay = { id: 'td1' };
    const exercises = [
      { id: 'pe1', program_day_id: 'td1', exercise_name: 'Dumbbell Overhead Press', sort_order: 0, target_sets: 3, target_reps_min: 5, target_reps_max: 10, target_weight: null, rir: 3 },
    ];
    const dayTargets = [
      { exercise_name: 'Dumbbell Overhead Press', target_sets: 5, target_reps_min: 5, target_reps_max: 5, target_weight: 60, rir: 2, ai_rationale: 'Hit ceiling.' },
    ];

    mockFrom
      .mockReturnValueOnce(makeChain({ data: programs, error: null }))
      .mockReturnValueOnce(makeChain({ data: days, error: null }))
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))
      .mockReturnValueOnce(makeChain({ data: exercises, error: null }))
      .mockReturnValueOnce(makeChain({ data: dayTargets, error: null })); // getProgramDayTargets

    const result = await getNextProgramWorkout();
    expect(result?.exercises[0].target_weight).toBe(60);
    expect(result?.exercises[0].target_sets).toBe(5);
  });

  it('falls back to the template values when no program_day_targets row exists for an exercise', async () => {
    const programs = [{ id: 'p1', name: 'PPL', total_weeks: 4, days_per_week: 3, is_current: true }];
    const days = [
      { id: 'd1', program_id: 'p1', week_number: 1, day_number: 1, completed: false, skipped: false },
    ];
    const templateDay = { id: 'td1' };
    const exercises = [
      { id: 'pe1', program_day_id: 'td1', exercise_name: 'Squat', sort_order: 0, target_sets: 3, target_weight: null },
    ];

    mockFrom
      .mockReturnValueOnce(makeChain({ data: programs, error: null }))
      .mockReturnValueOnce(makeChain({ data: days, error: null }))
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))
      .mockReturnValueOnce(makeChain({ data: exercises, error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null })); // no program_day_targets yet (first-ever week)

    const result = await getNextProgramWorkout();
    expect(result?.exercises[0].target_weight).toBeNull();
    expect(result?.exercises[0].target_sets).toBe(3);
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

// ─────────────────────────────────────────────────────────────────────────────
// getFutureScheduledSetsByMuscle
// ─────────────────────────────────────────────────────────────────────────────

describe('getFutureScheduledSetsByMuscle', () => {
  it('sums template target_sets for later not-yet-started days, by muscle', async () => {
    const futureDays = [{ id: 'day-2', day_number: 2 }];
    const templateDay = { id: 'template-day-2' };
    const templateExercises = [
      { exercise_name: 'Overhead Press', muscle_group: 'Shoulders', target_sets: 4 },
      { exercise_name: 'Lateral Raise', muscle_group: 'Shoulders', target_sets: 3 },
    ];

    mockFrom
      .mockReturnValueOnce(makeChain({ data: futureDays, error: null }))       // program_days: future days this week
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))      // getTemplateDayExercises: week-1 day lookup
      .mockReturnValueOnce(makeChain({ data: [], error: null }))               // getProgramDayTargets: no overrides yet
      .mockReturnValueOnce(makeChain({ data: templateExercises, error: null })); // getProgramExercises

    const result = await getFutureScheduledSetsByMuscle('program-1', 2, 1);
    expect(result).toEqual({ Shoulders: 7 });
  });

  it('uses the program_day_targets override instead of the template when one exists', async () => {
    const futureDays = [{ id: 'day-2', day_number: 2 }];
    const templateDay = { id: 'template-day-2' };
    const templateExercises = [
      { exercise_name: 'Overhead Press', muscle_group: 'Shoulders', target_sets: 4 },
    ];
    const overrides = [
      { exercise_name: 'Overhead Press', target_sets: 5, target_reps_min: 5, target_reps_max: 8, target_weight: 95, rir: 2, ai_rationale: null },
    ];

    mockFrom
      .mockReturnValueOnce(makeChain({ data: futureDays, error: null }))
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))
      .mockReturnValueOnce(makeChain({ data: overrides, error: null }))
      .mockReturnValueOnce(makeChain({ data: templateExercises, error: null }));

    const result = await getFutureScheduledSetsByMuscle('program-1', 2, 1);
    expect(result).toEqual({ Shoulders: 5 });
  });

  it('returns {} when there are no remaining days this week', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));
    const result = await getFutureScheduledSetsByMuscle('program-1', 2, 5);
    expect(result).toEqual({});
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns {} without hitting Supabase when unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null } });
    const result = await getFutureScheduledSetsByMuscle('program-1', 2, 1);
    expect(result).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
