jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } } }) },
    from: jest.fn(),
  },
}));

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

import { supabase } from '../supabase';
import {
  computeAndSaveProgressionTargets,
  getMuscleWeeklyFrequency,
  resolveMusclePerSessionAnchors,
} from '../progression';

const mockFrom = supabase.from as jest.Mock;

const makeChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
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
// resolveMusclePerSessionAnchors — pure, mirrors VA-011/HV-021's mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveMusclePerSessionAnchors', () => {
  it('emphasize ramps MEV -> MRV, divided by frequency', () => {
    // Chest: mev=8, mrv=22 — frequency 2 -> per-session week1=4, peak=11
    const anchors = resolveMusclePerSessionAnchors('Chest', 'emphasize', 2);
    expect(anchors).toEqual({ week1: 4, peak: 11, deload: 3 });
  });

  it('grow ramps MEV -> MAV, divided by frequency', () => {
    // Chest: mev=8, mav=16 — frequency 2 -> per-session week1=4, peak=8
    const anchors = resolveMusclePerSessionAnchors('Chest', 'grow', 2);
    expect(anchors).toEqual({ week1: 4, peak: 8, deload: 3 });
  });

  it('maintain is flat at MV', () => {
    const anchors = resolveMusclePerSessionAnchors('Chest', 'maintain', 1);
    expect(anchors).toEqual({ week1: 6, peak: 6, deload: 6 });
  });

  it('mev tier (undefined priority) is flat at MEV', () => {
    const anchors = resolveMusclePerSessionAnchors('Chest', undefined, 1);
    expect(anchors).toEqual({ week1: 8, peak: 8, deload: 6 });
  });

  it('returns null for a muscle with no landmark or a zero frequency', () => {
    expect(resolveMusclePerSessionAnchors('NotAMuscle', 'grow', 2)).toBeNull();
    expect(resolveMusclePerSessionAnchors('Chest', 'grow', 0)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMuscleWeeklyFrequency
// ─────────────────────────────────────────────────────────────────────────────

describe('getMuscleWeeklyFrequency', () => {
  it('counts distinct week-1 days per muscle group', () => {
    const days = [{ id: 'day-1' }, { id: 'day-2' }, { id: 'day-3' }];
    const exercises = [
      { program_day_id: 'day-1', muscle_group: 'Chest' },
      { program_day_id: 'day-1', muscle_group: 'Shoulders' },
      { program_day_id: 'day-2', muscle_group: 'Chest' },
      { program_day_id: 'day-3', muscle_group: 'Back' },
    ];
    mockFrom
      .mockReturnValueOnce(makeChain({ data: days, error: null }))
      .mockReturnValueOnce(makeChain({ data: exercises, error: null }));

    return getMuscleWeeklyFrequency('program-1').then((result) => {
      expect(result).toEqual({ Chest: 2, Shoulders: 1, Back: 1 });
    });
  });

  it('returns {} when the program has no week-1 days', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));
    const result = await getMuscleWeeklyFrequency('program-1');
    expect(result).toEqual({});
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAndSaveProgressionTargets — HV-021 wiring, end to end
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAndSaveProgressionTargets — hypertrophy muscle-level override reaches saved targets', () => {
  it('passes a landmark-derived (not flat +1/week) set count through to the saved target', async () => {
    const dayRow = { program_id: 'program-1', week_number: 2, day_number: 1 };
    const programRow = {
      total_weeks: 6,
      focus: 'hypertrophy',
      muscle_priorities: { Chest: 'emphasize' },
    };
    const templateDay = { id: 'template-day-1' };
    const templateExercises = [
      {
        id: 'pe-1',
        program_day_id: 'template-day-1',
        exercise_name: 'Bench Press',
        muscle_group: 'Chest',
        equipment: 'Barbell',
        sort_order: 0,
        target_sets: 4,
        target_reps_min: 6,
        target_reps_max: 10,
        target_weight: 135,
        rir: 2,
      },
    ];
    const nextDayRow = { id: 'next-day-1' };

    // A single mid-band session (not at floor or ceiling) -> action HOLD, keeps nextWeight nonzero.
    const workoutSets = [{ workout_id: 'w1', weight: 135, reps: 8, set_index: 0 }];
    const workouts = [{ id: 'w1', completed_at: '2026-01-01T00:00:00Z', program_name: 'Test' }];

    const week1Days = [{ id: 'template-day-1' }];
    const week1MuscleExercises = [{ program_day_id: 'template-day-1', muscle_group: 'Chest' }];

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce(makeChain({ data: dayRow, error: null }))              // program_days (dayRow)
      .mockReturnValueOnce(makeChain({ data: programRow, error: null }))          // programs
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))         // program_days (template day lookup)
      .mockReturnValueOnce(makeChain({ data: templateExercises, error: null }))   // program_exercises (template)
      .mockReturnValueOnce(makeChain({ data: nextDayRow, error: null }))          // program_days (next week day)
      .mockReturnValueOnce(makeChain({ data: workoutSets, error: null }))         // workout_sets (getExerciseAllSessions)
      .mockReturnValueOnce(makeChain({ data: workouts, error: null }))            // workouts (getExerciseAllSessions)
      .mockReturnValueOnce(makeChain({ data: week1Days, error: null }))           // program_days (getMuscleWeeklyFrequency)
      .mockReturnValueOnce(makeChain({ data: week1MuscleExercises, error: null })) // program_exercises (getMuscleWeeklyFrequency)
      .mockReturnValueOnce({ upsert: upsertMock })                                // program_day_targets upsert
      .mockReturnValueOnce(makeChain({ data: [], error: null }));                 // program_days (later-days lookup, section 2)

    await computeAndSaveProgressionTargets('day-1', 'intermediate');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const savedRows = upsertMock.mock.calls[0][0];
    expect(savedRows).toHaveLength(1);

    // dayRow.week_number=2 -> computing targets for nextWeek=3, of a 6-week
    // program (5 training weeks + 1 deload). Chest/emphasize, frequency 1
    // (only one day in the week-1 template): week1=MEV(8), peak=MRV(22).
    // progressFraction = (3-1)/(5-1) = 0.5 -> round(8 + (22-8)*0.5) = 15.
    // This is a landmark-anchored number, not a flat template+weekBonus value —
    // proving the override actually reached the saved row.
    expect(savedRows[0].target_sets).toBe(15);
  });
});
