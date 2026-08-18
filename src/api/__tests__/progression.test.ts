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
  refreshUpcomingProgressionTargets,
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
    is: jest.fn().mockReturnThis(),
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
  it('emphasize ramps MEV -> MAV, divided by frequency', () => {
    // Chest: mev=8, mrv=22 — frequency 2 -> per-session week1=4, peak=11
    const anchors = resolveMusclePerSessionAnchors('Chest', 'emphasize', 2);
    expect(anchors).toEqual({ week1: 4, peak: 8, deload: 3 });
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
    const programDays = [{ id: 'history-day-1' }];
    const workouts = [{ id: 'w1', completed_at: '2026-01-01T00:00:00Z', program_name: 'Test', program_day_id: 'history-day-1' }];

    const week1Days = [{ id: 'template-day-1' }];
    const week1MuscleExercises = [{ program_day_id: 'template-day-1', muscle_group: 'Chest' }];

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce(makeChain({ data: dayRow, error: null }))              // program_days (dayRow)
      .mockReturnValueOnce(makeChain({ data: programRow, error: null }))          // programs
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))         // program_days (template day lookup)
      .mockReturnValueOnce(makeChain({ data: templateExercises, error: null }))   // program_exercises (template)
      .mockReturnValueOnce(makeChain({ data: nextDayRow, error: null }))          // program_days (next week day)
      .mockReturnValueOnce(makeChain({ data: programDays, error: null }))         // program_days (history scope)
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
    // (only one day in the week-1 template): week1=MEV(8), peak=MAV(16).
    // progressFraction = (3-1)/(5-1) = 0.5 -> round(8 + (16-8)*0.5) = 12,
    // then HV-023 caps a single exercise's sets at 5 (see volumeRamp.ts) —
    // this is the only exercise for Chest this session, so it absorbs the
    // full (capped) target. Still proves the override reached the saved
    // row and isn't the flat template+weekBonus fallback: that path would
    // give target_sets(4) + weekBonus(mesoWeek-1=2) = 6, not 5.
    expect(savedRows[0].target_sets).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAndSaveProgressionTargets — VA-015 soreness reaches the HV-021
// landmark-override set count
//
// Before this fix, the HV-021 override path always advanced with mesoWeek
// regardless of reported recovery — soreness only ever gated the flat
// per-exercise ramp (VA-013 in progressionEngine.ts), which the override
// wins outright over for any hypertrophy-focus muscle. That meant a
// hypertrophy program's actual saved set counts never responded to
// soreness at all. rampSets (volumeRamp.ts) now accepts the muscle's
// reported soreness and shifts which week's ramp step applies.
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAndSaveProgressionTargets — VA-015 soreness reaches the HV-021 override', () => {
  it('resets to the Week 1 anchor when the muscle reported "Still sore"', async () => {
    const dayRow = { program_id: 'program-1', week_number: 1, day_number: 1 };
    const programRow = {
      total_weeks: 6,
      focus: 'hypertrophy',
      muscle_priorities: { Chest: 'grow' },
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

    const workoutFeedback = [{ muscle_group: 'Chest', soreness: 'Still sore' }];
    // Mid-band session, 4 sets logged (matches the template's target_sets so
    // VA-013's own baseSetCount safety cap — which uses last actual sets
    // logged, not the template value, see the "Use actual sets logged last
    // session" comment above — doesn't confound this test with a second,
    // lower ceiling of its own). Action HOLD, nonzero nextWeight either way.
    const workoutSets = [0, 1, 2, 3].map((set_index) => ({ workout_id: 'w1', weight: 135, reps: 8, set_index }));
    const programDays = [{ id: 'history-day-1' }];
    const workouts = [{ id: 'w1', completed_at: '2026-01-01T00:00:00Z', program_name: 'Test', program_day_id: 'history-day-1' }];

    // Chest trained on 2 days/week -> frequency 2 -> 'grow' anchors
    // (MEV 8 -> MAV 16) / 2 = week1: 4, peak: 8.
    const week1Days = [{ id: 'template-day-1' }, { id: 'template-day-2' }];
    const week1MuscleExercises = [
      { program_day_id: 'template-day-1', muscle_group: 'Chest' },
      { program_day_id: 'template-day-2', muscle_group: 'Chest' },
    ];

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce(makeChain({ data: dayRow, error: null }))               // program_days (dayRow)
      .mockReturnValueOnce(makeChain({ data: programRow, error: null }))           // programs
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))          // program_days (template day lookup)
      .mockReturnValueOnce(makeChain({ data: templateExercises, error: null }))    // program_exercises (template)
      .mockReturnValueOnce(makeChain({ data: nextDayRow, error: null }))           // program_days (next week day)
      .mockReturnValueOnce(makeChain({ data: workoutFeedback, error: null }))      // workout_feedback (getMuscleSorenessForWorkout)
      .mockReturnValueOnce(makeChain({ data: [{ id: 'history-day-1' }], error: null })) // program_days (soreness streak scope)
      .mockReturnValueOnce(makeChain({ data: [{ id: 'w1', completed_at: '2026-01-01T00:00:00Z' }], error: null })) // workouts (soreness streak)
      .mockReturnValueOnce(makeChain({ data: [{ workout_id: 'w1', muscle_group: 'Chest', soreness: 'Still sore' }], error: null })) // workout_feedback (streak)
      .mockReturnValueOnce(makeChain({ data: programDays, error: null }))          // program_days (history scope)
      .mockReturnValueOnce(makeChain({ data: workoutSets, error: null }))          // workout_sets (getExerciseAllSessions)
      .mockReturnValueOnce(makeChain({ data: workouts, error: null }))             // workouts (getExerciseAllSessions)
      .mockReturnValueOnce(makeChain({ data: week1Days, error: null }))            // program_days (getMuscleWeeklyFrequency)
      .mockReturnValueOnce(makeChain({ data: week1MuscleExercises, error: null })) // program_exercises (getMuscleWeeklyFrequency)
      .mockReturnValueOnce({ upsert: upsertMock })                                 // program_day_targets upsert
      .mockReturnValueOnce(makeChain({ data: [], error: null }));                  // program_days (later-days lookup, section 2)

    await computeAndSaveProgressionTargets('day-1', 'intermediate', 'workout-1');

    const savedRows = upsertMock.mock.calls[0][0];
    // Baseline (no soreness) at nextWeek=2 of 5 training weeks would be
    // round(4 + (8-4) * (2-1)/(5-1)) = 5. 'Still sore' resets the ramp step
    // to the Week 1 anchor instead: round(4) = 4.
    expect(savedRows[0].target_sets).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAndSaveProgressionTargets — role reaches getLoadIncrementAmount
//
// Originally a regression test for the bug where program_exercises never
// retained its Primary/Secondary/Accessory role, so every exercise's
// next-week load increment silently defaulted to 'Primary' sizing regardless
// of the exercise's actual role.
//
// ST-011 (2026-08-04, supersedes ST-010): this test used to assert that a
// 20 lb Dumbbell Lateral Raise advances to 25 lb (a flat 5 lb, i.e. a 25%
// jump) as *correct* — that assertion was itself the literal bug the
// percentage-based/equipment-gated load-increment rework (ST-011 in
// progressionEngine.ts) exists to fix. Dumbbell Lateral Raise derives to the
// 'isolation' progression category (equipment_limited strategy, 10% gate) —
// 2.5 lb (the smallest realistic increment under 100 lb) is 12.5% of 20 lb,
// above the gate, so load now holds and reps extend past the ceiling instead.
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAndSaveProgressionTargets — role-aware load increment', () => {
  it('holds load and extends reps instead of forcing a 20 -> 25 lb jump for an isolation exercise', async () => {
    const dayRow = { program_id: 'program-1', week_number: 1, day_number: 1 };
    const programRow = {
      total_weeks: 6,
      focus: 'general',
      muscle_priorities: { Shoulders: 'grow' },
    };
    const templateDay = { id: 'template-day-1' };
    const templateExercises = [
      {
        id: 'pe-1',
        program_day_id: 'template-day-1',
        exercise_name: 'Dumbbell Lateral Raise',
        muscle_group: 'Shoulders',
        equipment: 'Dumbbell',
        sort_order: 0,
        target_sets: 3,
        target_reps_min: 10,
        target_reps_max: 15,
        target_weight: 20,
        rir: 2,
        role: 'Accessory',
      },
    ];
    const nextDayRow = { id: 'next-day-1' };

    // Hit the rep ceiling last time (15 reps at 20 lb) -> ceiling-hit branch fires.
    const workoutSets = [{ workout_id: 'w1', weight: 20, reps: 15, set_index: 0, reported_rir: 2 }];
    const programDays = [{ id: 'history-day-1' }];
    const workouts = [{ id: 'w1', completed_at: '2026-01-01T00:00:00Z', program_name: 'Test', program_day_id: 'history-day-1' }];

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce(makeChain({ data: dayRow, error: null }))            // program_days (dayRow)
      .mockReturnValueOnce(makeChain({ data: programRow, error: null }))        // programs
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))       // program_days (template day lookup)
      .mockReturnValueOnce(makeChain({ data: templateExercises, error: null })) // program_exercises (template)
      .mockReturnValueOnce(makeChain({ data: nextDayRow, error: null }))        // program_days (next week day)
      .mockReturnValueOnce(makeChain({ data: programDays, error: null }))       // program_days (history scope)
      .mockReturnValueOnce(makeChain({ data: workoutSets, error: null }))       // workout_sets (getExerciseAllSessions)
      .mockReturnValueOnce(makeChain({ data: workouts, error: null }))          // workouts (getExerciseAllSessions)
      .mockReturnValueOnce({ upsert: upsertMock })                             // program_day_targets upsert
      .mockReturnValueOnce(makeChain({ data: [], error: null }));              // program_days (later-days lookup, section 2)

    await computeAndSaveProgressionTargets('day-1', 'intermediate');

    const savedRows = upsertMock.mock.calls[0][0];
    expect(savedRows).toHaveLength(1);
    // Held at 20 lb, not forced to 25 (or even 22.5) — experienced accessory
    // isolation work now adds lengthened partials instead of extending the
    // straight-rep target past the authored ceiling.
    expect(savedRows[0].target_weight).toBe(20);
    expect(savedRows[0].target_reps_max).toBe(15);
    expect(savedRows[0].ai_rationale).toContain('3–5 lengthened partials');
  });
});

describe('computeAndSaveProgressionTargets — zero-load bodyweight persistence', () => {
  it('upserts a zero-weight bodyweight recommendation with its rep progression intact', async () => {
    const dayRow = { program_id: 'program-1', week_number: 1, day_number: 1 };
    const programRow = { total_weeks: 6, focus: 'general', muscle_priorities: { Back: 'grow' } };
    const templateDay = { id: 'template-day-1' };
    const templateExercises = [{
      id: 'pe-1', program_day_id: 'template-day-1', exercise_name: 'Pull-Up', muscle_group: 'Back',
      equipment: 'Bodyweight', sort_order: 0, target_sets: 3, target_reps_min: 8,
      target_reps_max: 12, target_weight: 0, rir: 2, role: 'Primary',
    }];
    const workoutSets = Array.from({ length: 3 }, (_, set_index) => ({
      workout_id: 'w1', weight: 0, reps: 12, set_index, reported_rir: 2,
    }));
    const workouts = [{ id: 'w1', completed_at: '2026-01-01T00:00:00Z', program_day_id: 'history-day-1' }];
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    const responsesByTable: Record<string, any[]> = {
      program_days: [
        makeChain({ data: dayRow, error: null }),
        makeChain({ data: templateDay, error: null }),
        makeChain({ data: { id: 'next-day-1' }, error: null }),
        makeChain({ data: [{ id: 'history-day-1' }], error: null }),
        makeChain({ data: [], error: null }),
      ],
      programs: [makeChain({ data: programRow, error: null })],
      program_exercises: [makeChain({ data: templateExercises, error: null })],
      workout_sets: [makeChain({ data: workoutSets, error: null })],
      workouts: [makeChain({ data: workouts, error: null })],
      program_day_targets: [{ upsert: upsertMock }],
    };
    const callCounts: Record<string, number> = {};
    mockFrom.mockImplementation((table: string) => {
      const index = callCounts[table] ?? 0;
      callCounts[table] = index + 1;
      return responsesByTable[table][index];
    });

    await computeAndSaveProgressionTargets('day-1', 'intermediate');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock.mock.calls[0][0]).toEqual([
      expect.objectContaining({ exercise_name: 'Pull-Up', target_weight: 0, target_reps_max: 13 }),
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAndSaveProgressionTargets — RC-010 whole-session set cap
//
// Regression test for the gap where each exercise's sets were computed
// independently (HV-021 ramps toward MRV per muscle, capped only per
// exercise by HV-023) with nothing checking the day's new total against
// the SESSION_MAX_SETS ceiling — a real session was observed at 22 sets
// after several emphasize-priority exercises each ramped up simultaneously.
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAndSaveProgressionTargets — RC-010 whole-session set cap', () => {
  it('trims the total back to the session cap, taking sets from the lower-priority exercise first', async () => {
    const dayRow = { program_id: 'program-1', week_number: 10, day_number: 1 };
    const programRow = {
      total_weeks: 20,
      focus: 'general',
      muscle_priorities: { Chest: 'emphasize', Shoulders: 'maintain' },
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
        target_sets: 15,
        target_reps_min: 6,
        target_reps_max: 12,
        target_weight: 135,
        rir: 2,
        role: 'Primary',
      },
      {
        id: 'pe-2',
        program_day_id: 'template-day-1',
        exercise_name: 'Machine Shoulder Press',
        muscle_group: 'Shoulders',
        equipment: 'Machine',
        sort_order: 1,
        target_sets: 20,
        target_reps_min: 6,
        target_reps_max: 12,
        target_weight: 100,
        rir: 2,
        role: 'Primary',
      },
    ];
    const nextDayRow = { id: 'next-day-1' };

    // Mid-band single session for both -> HOLD, nextSets passes through
    // effectiveSets unchanged (no plateau/bad-session halving). Set count
    // must match each exercise's target_sets here: prescription.sets comes
    // from lastActualSets (how many sets were actually logged last time),
    // not target_sets directly — see the "Use actual sets logged last
    // session" comment in computeAndSaveProgressionTargets.
    const benchSets = Array.from({ length: 15 }, (_, i) => ({ workout_id: 'w-bench', weight: 135, reps: 8, set_index: i }));
    const benchWorkouts = [{ id: 'w-bench', completed_at: '2026-01-01T00:00:00Z', program_name: 'Test', program_day_id: 'history-day-1' }];
    const shoulderSets = Array.from({ length: 20 }, (_, i) => ({ workout_id: 'w-shoulder', weight: 100, reps: 8, set_index: i }));
    const shoulderWorkouts = [{ id: 'w-shoulder', completed_at: '2026-01-01T00:00:00Z', program_name: 'Test', program_day_id: 'history-day-1' }];

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    // Bench and Shoulder's getExerciseAllSessions calls run concurrently
    // (Promise.all over templateExercises), so the exact interleaving of
    // their workout_sets/workouts calls relative to EACH OTHER isn't
    // guaranteed — only that each exercise's own calls happen in its own
    // order, and that calls to the same table happen in array order across
    // exercises. Dispatch per-table (not by strict global call order) so
    // this test doesn't depend on the exact interleaving.
    const responsesByTable: Record<string, any[]> = {
      program_days: [
        makeChain({ data: dayRow, error: null }),        // dayRow lookup
        makeChain({ data: templateDay, error: null }),   // template day lookup
        makeChain({ data: nextDayRow, error: null }),     // next week day lookup
        makeChain({ data: [{ id: 'history-day-1' }], error: null }), // Bench history scope
        makeChain({ data: [{ id: 'history-day-1' }], error: null }), // Shoulder history scope
        makeChain({ data: [], error: null }),              // later-days lookup (section 2)
      ],
      programs: [makeChain({ data: programRow, error: null })],
      program_exercises: [makeChain({ data: templateExercises, error: null })],
      workout_sets: [
        makeChain({ data: benchSets, error: null }),
        makeChain({ data: shoulderSets, error: null }),
      ],
      workouts: [
        makeChain({ data: benchWorkouts, error: null }),
        makeChain({ data: shoulderWorkouts, error: null }),
      ],
      program_day_targets: [{ upsert: upsertMock }],
    };
    const callCounts: Record<string, number> = {};
    mockFrom.mockImplementation((table: string) => {
      const idx = callCounts[table] ?? 0;
      callCounts[table] = idx + 1;
      return responsesByTable[table][idx];
    });

    await computeAndSaveProgressionTargets('day-1', 'intermediate');

    const savedRows = upsertMock.mock.calls[0][0];
    expect(savedRows).toHaveLength(2);

    // dayRow.week_number=10 -> nextWeek=11 -> weekBonus = mesoWeek-1 = 10.
    // Bench (Chest/emphasize): 15 + 10 = 25, uncapped by HV-023 since this is
    // the plain (non-hypertrophy-override) path, not the HV-021 landmark ramp.
    // Shoulder (Shoulders/maintain): stays flat at its template 20, no bonus.
    // Uncapped total = 45, 21 over the 24-set session cap. capSessionSets
    // trims the lower-priority (maintain) exercise first, down to its 1-set
    // floor (19 of the 21 needed), then takes the remaining 2 from Bench
    // (25 -> 23).
    const bench = savedRows.find((r: any) => r.exercise_name === 'Bench Press');
    const shoulder = savedRows.find((r: any) => r.exercise_name === 'Machine Shoulder Press');
    expect(bench.target_sets + shoulder.target_sets).toBe(24);
    expect(shoulder.target_sets).toBe(1);
    expect(bench.target_sets).toBe(23);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshUpcomingProgressionTargets — TEMPORARY, pairs with
// backfillWeek1ExerciseRoles in src/api/programs.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshUpcomingProgressionTargets', () => {
  it('returns early without running progression when there are no completed days', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));
    await refreshUpcomingProgressionTargets('program-1', 'intermediate');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('runs computeAndSaveProgressionTargets for each completed day', async () => {
    const completedDays = [{ id: 'day-1' }];
    mockFrom
      .mockReturnValueOnce(makeChain({ data: completedDays, error: null }))             // program_days (completed=true)
      .mockReturnValueOnce(makeChain({ data: [], error: null }))                        // workouts (day -> workout lookup for soreness)
      .mockReturnValueOnce(makeChain({ data: { program_id: 'program-1', week_number: 1, day_number: 1 }, error: null })) // program_days (dayRow)
      .mockReturnValueOnce(makeChain({ data: { total_weeks: 1, focus: 'general', muscle_priorities: {} }, error: null })) // programs
      .mockReturnValueOnce(makeChain({ data: { id: 'template-day-1' }, error: null }))  // program_days (template day lookup)
      .mockReturnValueOnce(makeChain({ data: [], error: null }));                       // program_exercises (template) -> empty, short-circuits

    await refreshUpcomingProgressionTargets('program-1', 'intermediate');

    // 1 (completed-days lookup) + 1 (workouts lookup) + 4
    // (computeAndSaveProgressionTargets's own calls up to its early-return on
    // an empty template) = 6.
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it('VA-013/VA-018: threads each completed day\'s workout id through so soreness feedback is not silently dropped on refresh', async () => {
    // Regression test: refreshUpcomingProgressionTargets used to call
    // computeAndSaveProgressionTargets with no workoutId at all, so a
    // "still sore" report from workout_feedback never trimmed volume during
    // a refresh — only logged weight/reps history was reconsidered. This
    // pins that the day -> workout link is now resolved and passed through,
    // by asserting the soreness-driven set trim actually lands on the saved
    // row. Chest is 'emphasize' at nextWeek=2, so the un-trimmed target would
    // ramp above the week-1 template (4 -> 5, baseSetCount + weekBonus); VA-013's
    // trim floors back down to 4 rather than baseSetCount - 1 — proof the
    // trim only has visible effect once there's a weekBonus to trim from
    // (this is pre-existing VA-013 behavior: it never drops below the
    // template's own baseSetCount).
    const completedDays = [{ id: 'day-1' }];
    const relatedWorkouts = [{ id: 'workout-1', program_day_id: 'day-1', completed_at: '2026-01-08T00:00:00Z' }];
    const dayRow = { program_id: 'program-1', week_number: 1, day_number: 1 };
    const programRow = { total_weeks: 6, focus: 'general', muscle_priorities: { Chest: 'emphasize' } };
    const templateDay = { id: 'template-day-1' };
    const templateExercises = [{
      id: 'pe-1',
      program_day_id: 'template-day-1',
      exercise_name: 'Barbell Bench Press',
      muscle_group: 'Chest',
      equipment: 'Barbell',
      sort_order: 0,
      target_sets: 4,
      target_reps_min: 6,
      target_reps_max: 12,
      target_weight: 200,
      rir: 2,
      role: 'Primary',
    }];
    const nextDayRow = { id: 'next-day-1' };
    const workoutSets = [
      { workout_id: 'workout-1', weight: 200, reps: 10, set_index: 0 },
      { workout_id: 'workout-1', weight: 200, reps: 10, set_index: 1 },
      { workout_id: 'workout-1', weight: 200, reps: 10, set_index: 2 },
      { workout_id: 'workout-1', weight: 200, reps: 10, set_index: 3 },
    ];
    const programDays = [{ id: 'history-day-1' }];
    const workouts = [{ id: 'workout-1', completed_at: '2026-01-08T00:00:00Z', program_name: 'Test', program_day_id: 'history-day-1' }];
    const feedback = [{ muscle_group: 'Chest', soreness: 'Still sore' }];

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce(makeChain({ data: completedDays, error: null }))       // program_days (completed=true)
      .mockReturnValueOnce(makeChain({ data: relatedWorkouts, error: null }))     // workouts (day -> workout lookup)
      .mockReturnValueOnce(makeChain({ data: dayRow, error: null }))              // program_days (dayRow)
      .mockReturnValueOnce(makeChain({ data: programRow, error: null }))          // programs
      .mockReturnValueOnce(makeChain({ data: templateDay, error: null }))         // program_days (template day lookup)
      .mockReturnValueOnce(makeChain({ data: templateExercises, error: null }))   // program_exercises (template)
      .mockReturnValueOnce(makeChain({ data: nextDayRow, error: null }))          // program_days (next week day)
      .mockReturnValueOnce(makeChain({ data: feedback, error: null }))            // workout_feedback (getMuscleSorenessForWorkout) -- awaited before session history
      .mockReturnValueOnce(makeChain({ data: [{ id: 'history-day-1' }], error: null })) // program_days (soreness streak scope)
      .mockReturnValueOnce(makeChain({ data: [{ id: 'workout-1', completed_at: '2026-01-08T00:00:00Z' }], error: null })) // workouts (soreness streak)
      .mockReturnValueOnce(makeChain({ data: [{ workout_id: 'workout-1', muscle_group: 'Chest', soreness: 'Still sore' }], error: null })) // feedback (streak)
      .mockReturnValueOnce(makeChain({ data: programDays, error: null }))          // program_days (history scope)
      .mockReturnValueOnce(makeChain({ data: workoutSets, error: null }))         // workout_sets (getExerciseAllSessions)
      .mockReturnValueOnce(makeChain({ data: workouts, error: null }))            // workouts (getExerciseAllSessions)
      .mockReturnValueOnce({ upsert: upsertMock })                                // program_day_targets upsert
      .mockReturnValueOnce(makeChain({ data: [], error: null }));                 // program_days (later-days lookup, section 2)

    await refreshUpcomingProgressionTargets('program-1', 'intermediate');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const savedRows = upsertMock.mock.calls[0][0];
    // Without the soreness trim, emphasize would ramp to baseSetCount(4) +
    // weekBonus(1) = 5 sets. The still-sore report pulls it back to 4 — proof
    // the workout's feedback was actually read and applied during the
    // refresh, not silently dropped.
    expect(savedRows[0].target_sets).toBe(4);
  });
});
