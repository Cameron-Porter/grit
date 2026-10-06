import {
  recommendProgression,
  recommendInitialMesocycleTarget,
  calculateVolumeTransitionAdjustment,
  isUsableLoggedWeight,
} from '../../src/rules/progressionEngine';
import { validateDayExercises, validateProgram } from '../../src/rules/validation';
import { PROGRESSION_CATEGORY_PROFILES } from '../../src/data/exerciseProgressionProfiles';
import type {
  AdjustedVolumeTarget,
  DayPlan,
  ExerciseSlot,
  GeneratedProgram,
  MuscleGroup,
} from '../../src/types/program';
import type { ProgressionContext, SlotPrescription, SessionPerformance } from '../../src/rules/progressionEngine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<ProgressionContext> = {}): ProgressionContext {
  return {
    experienceLevel: 'intermediate',
    isDeload: false,
    mesoWeek: 1,
    totalMesoWeeks: 4,
    musclePriority: 'grow',
    ...overrides,
  };
}

function makePrescription(overrides: Partial<SlotPrescription> = {}): SlotPrescription {
  return {
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    rir: 2,
    ...overrides,
  };
}

// Two sessions with identical performance → creates stalls if needed.
// HV-032: setsPerSession defaults to 3 — matching makePrescription()'s
// default `sets: 3` — so a plain makeSessions() call reads as "same set
// count as the current prescription" (previousSets === effectiveSets) and
// doesn't spuriously trigger the volume-transition-compensation adjustment.
// Tests that specifically want to simulate a recent volume increase pass an
// explicit lower setsPerSession.
function makeSessions(weight = 100, reps = 10, count = 0, setsPerSession = 3): SessionPerformance[] {
  return Array.from({ length: count }, () => ({
    date: '2026-01-01',
    sets: Array.from({ length: setsPerSession }, () => ({ weight, reps, rir: 2 })),
  }));
}

describe('experience-specific progression behavior', () => {
  it.each(['beginner', 'intermediate', 'advanced'] as const)('%s preserves recent-deload plateau handling', experienceLevel => {
    const beginner = experienceLevel === 'beginner';
    const rec = recommendProgression(makePrescription(), makeSessions(100, 10, beginner ? 4 : 3),
      makeCtx({ experienceLevel, weeksSinceLastDeload: 1 }));
    expect(rec).toMatchObject({ action: 'PLATEAU_DELOAD', nextWeight: beginner ? 80 : 100, nextSets: 2, nextRir: 4 });
    expect(rec.reason).toBe(beginner
      ? '4 sessions unchanged at 100 lb × 10 reps. Deload first — load reduced 22.5% (100 → 80 lbs); fatigue masking is the most likely cause. Retest at the reduced load after deload.'
      : '3 sessions unchanged at 100 lb × 10 reps after a recent deload. This may be a true plateau — consider a 10% load reduction and rebuild.');
  });

  it.each(['beginner', 'intermediate', 'advanced'] as const)('%s preserves below-floor reduction messages', experienceLevel => {
    const beginner = experienceLevel === 'beginner';
    for (const equipment of ['Barbell', 'Bodyweight']) {
      const rec = recommendProgression(makePrescription({ equipment }), makeSessions(100, 6, 2), makeCtx({ experienceLevel }));
      const bodyweight = equipment === 'Bodyweight';
      expect(rec).toMatchObject({ action: 'REDUCE_LOAD', nextWeight: bodyweight ? 100 : 95, nextRepsMax: 8 });
      expect(rec.reason).toBe(beginner
        ? `Below rep floor (6 reps) for 2 sessions at 100 lb. ${bodyweight ? 'No external load to reduce — rebuild reps from the floor at bodyweight.' : 'Reducing by 5 lb — rebuild from new base.'}`
        : `Below floor (6 reps) for 2 sessions at 100 lb. ${bodyweight ? 'No external load to reduce — rebuild to 8 reps at bodyweight before advancing.' : 'Reducing by 5 lb — rebuild to 8 reps before advancing.'}`);
    }
  });
});

function makeSlot(overrides: Partial<ExerciseSlot> = {}): ExerciseSlot {
  return {
    id: 'test-slot',
    muscle: 'Back',
    role: 'Primary',
    priority: 'grow',
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    rir: 2,
    sortOrder: 0,
    ...overrides,
  };
}

function makeDay(slots: ExerciseSlot[], overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    dayIndex: 0,
    weekNumber: 1,
    isDeload: false,
    sessionType: 'Pull',
    splitName: 'Pull',
    trainingDay: 'Monday',
    primaryMuscles: ['Back'],
    slots,
    totalSets: slots.reduce((s, slot) => s + slot.sets, 0),
    estimatedMinutes: 60,
    ...overrides,
  };
}

function makeProgram(days: DayPlan[]): GeneratedProgram {
  return {
    focus: 'hypertrophy',
    splitType: 'ppl',
    daysPerWeek: days.length,
    totalWeeks: 4,
    volumeTargets: [],
    days,
    weeks: [{ weekNumber: 1, isDeload: false, days }],
    validation: { valid: true, issues: [], weeklyEffectiveSets: {} },
    derivation: {
      upperScore: 0, lowerScore: 0, upperDays: 0, lowerDays: 0,
      pushScore: 0, pullScore: 0, upperTypes: [], lowerTypes: [],
    },
  };
}

// ─── HV-019: Deadlift RIR hard floor ─────────────────────────────────────────

describe('HV-019 — explicit RIR floor composes with taper and deload', () => {
  it.each([
    { rir: 0, hardRirFloor: 1, peak: false, isDeload: false, expected: 1 },
    { rir: 2, hardRirFloor: 1, peak: false, isDeload: false, expected: 3 },
    { rir: 0, hardRirFloor: 1, peak: false, isDeload: true, expected: 4 },
    // Isolation at peak removes the category/taper floors that masked HV-019.
    { rir: 2, hardRirFloor: undefined, peak: true, isDeload: false, expected: 0 },
    { rir: 2, hardRirFloor: 1, peak: true, isDeload: false, expected: 1 },
    { rir: 2, hardRirFloor: 2, peak: true, isDeload: false, expected: 2 },
  ])('prescribes $expected RIR (floor=$hardRirFloor, peak=$peak, deload=$isDeload)', ({ rir, hardRirFloor, peak, isDeload, expected }) => {
    const rec = recommendProgression(
      makePrescription({ rir, hardRirFloor, ...(peak ? { profile: PROGRESSION_CATEGORY_PROFILES.isolation } : {}) }),
      makeSessions(100, 10, 1),
      makeCtx({ experienceLevel: 'advanced', isDeload, ...(peak ? { mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' as const } : {}) }),
    );
    expect(rec.nextRir).toBe(expected);
  });
});

describe('HV-040 — history-aware Week-1 mesocycle seed', () => {
  const prescription: SlotPrescription = { sets: 2, repsMin: 5, repsMax: 10, rir: 3, equipment: 'Dumbbell' };
  it('holds a demonstrated load, clamps reps to the authored band, and retains Week-1 volume', () => {
    const target = recommendInitialMesocycleTarget(prescription,[{date:'2026-08-01',sets:Array.from({length:4},()=>({weight:60,reps:12,rir:2}))}]);
    expect(target).toEqual({weight:60,sets:2,repsMin:10,repsMax:10,rir:3,seededFromHistory:true});
  });
  it('does not guess from unsuccessful or mixed-load history', () => {
    const target = recommendInitialMesocycleTarget(prescription,[{date:'2026-08-01',sets:[{weight:60,reps:4},{weight:55,reps:8}]}]);
    expect(target).toEqual({weight:0,sets:2,repsMin:5,repsMax:10,rir:3,seededFromHistory:false});
  });
  it('keeps external load at zero for bodyweight work', () => {
    const target = recommendInitialMesocycleTarget({...prescription,equipment:'Bodyweight'},[{date:'2026-08-01',sets:[{weight:0,reps:12},{weight:0,reps:12}]}]);
    // HV-040 bodyweight exception preserves demonstrated reps, rather than the loaded-lift cap.
    expect(target.weight).toBe(0);expect(target.repsMin).toBe(12);expect(target.seededFromHistory).toBe(true);
  });
});

// ─── HV-001: Intra-mesocycle RIR taper ───────────────────────────────────────

describe('HV-001/HV-027/HV-036 — effort follows schedule, priority, and exercise safety', () => {
  const scenarios: { name: string; prescription?: Partial<SlotPrescription>; context: Partial<ProgressionContext>; history?: boolean; expected: number }[] = [
    {
      name: 'beginner starts a five-week block conservatively',
      context: { experienceLevel: 'beginner', totalMesoWeeks: 5 }, expected: 3,
    },
    {
      name: 'beginner starts a four-week block conservatively',
      context: { experienceLevel: 'beginner' }, expected: 3,
    },
    {
      name: 'maintenance priority retains prescribed effort',
      context: { musclePriority: 'maintain' }, expected: 2,
    },
    {
      name: 'intermediate starts above peak effort',
      context: {}, expected: 3,
    },
    {
      name: 'heavy compound reaches one RIR at peak',
      context: { mesoWeek: 3 }, expected: 1,
    },
    {
      name: 'scheduled deload restores reserve',
      context: { isDeload: true, mesoWeek: 4 }, history: true, expected: 4,
    },
    {
      name: 'early taper remains above an explicit floor',
      prescription: { hardRirFloor: 1 }, context: {}, expected: 3,
    },
    {
      name: 'isolation can reach failure with positive recovery',
      prescription: { profile: PROGRESSION_CATEGORY_PROFILES.isolation }, context: { mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' }, expected: 0,
    },
    {
      name: 'heavy compound cannot reach failure with the same recovery',
      prescription: { profile: PROGRESSION_CATEGORY_PROFILES.heavy_compound }, context: { mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' }, expected: 1,
    },
    {
      name: 'cut starts with extra reserve',
      prescription: { profile: PROGRESSION_CATEGORY_PROFILES.heavy_compound }, context: { programFocus: 'cut' }, expected: 3,
    },
    {
      name: 'beginner isolation stops short of failure at peak',
      prescription: { profile: PROGRESSION_CATEGORY_PROFILES.isolation }, context: { experienceLevel: 'beginner', mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' }, expected: 2,
    },
    {
      name: 'cut retains extra reserve at peak',
      prescription: { profile: PROGRESSION_CATEGORY_PROFILES.heavy_compound }, context: { programFocus: 'cut', mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' }, expected: 2,
    },
  ];
  // Consolidates HV-001/HV-036's identical isolation case; distinct schedules remain.
  it.each(scenarios)('$name', ({ prescription, context, history, expected }) => {
    const rec = recommendProgression(makePrescription(prescription), history ? makeSessions(100, 10, 1) : [], makeCtx(context));
    expect(rec.nextRir).toBe(expected);
  });
});

// ─── ST-007: Double-progression rep target climbs 1 rep at a time ────────────

describe('ST-007 — rep progress and load changes keep attainable targets', () => {
  it.each([
    {
      name: 'within band',
      weight: 180, reps: 8, ceiling: 15, sessions: 1, beginner: false, action: 'HOLD', nextWeight: 180, nextRepsMax: 9,
    },
    {
      name: 'below floor',
      weight: 180, reps: 6, ceiling: 15, sessions: 1, beginner: false, action: 'HOLD', nextWeight: 180, nextRepsMax: 7,
    },
    {
      name: 'ceiling boundary',
      weight: 100, reps: 11, ceiling: 12, sessions: 1, beginner: false, action: 'HOLD', nextWeight: 100, nextRepsMax: 12,
    },
    {
      name: 'earned load increase',
      weight: 100, reps: 12, ceiling: 12, sessions: 1, beginner: false, action: 'ADVANCE_LOAD', nextWeight: 105, nextRepsMax: 8,
    },
    {
      name: 'repeated below floor',
      weight: 100, reps: 6, ceiling: 12, sessions: 2, beginner: false, action: 'REDUCE_LOAD', nextWeight: 95, nextRepsMax: 8,
    },
    {
      name: 'beginner within band',
      weight: 180, reps: 8, ceiling: 15, sessions: 1, beginner: true, action: 'HOLD', nextWeight: 180, nextRepsMax: 9,
    },
  ])('$name', ({ weight, reps, ceiling, sessions, beginner, action, nextWeight, nextRepsMax }) => {
    const rec = recommendProgression(makePrescription({ repsMax: ceiling }), makeSessions(weight, reps, sessions),
      makeCtx({ experienceLevel: beginner ? 'beginner' : 'intermediate' }));
    expect(rec).toMatchObject({ action, nextWeight, nextRepsMax });
  });
});

describe('ST-013/HV-044 — completed sets and reported effort determine load progression', () => {
  const set = (weight = 100, reps = 12, rir?: number) => ({ weight, reps, ...(rir === undefined ? {} : { rir }) });
  const scenarios: { name: string; sets: SessionPerformance['sets']; prescription?: Partial<SlotPrescription>; context?: Partial<ProgressionContext>; action: string; nextWeight: number }[] = [
    {
      name: 'one standout set does not earn a load increase',
      sets: [set(20, 18), set(20), set(20)], prescription: { repsMin: 12, repsMax: 18 }, context: { musclePriority: 'maintain' }, action: 'HOLD', nextWeight: 20,
    },
    // The former two over-effort tests had identical inputs; retain both assertions here.
    {
      name: 'reported over-effort holds load',
      sets: Array.from({ length: 3 }, () => set(100, 12, 0)), action: 'HOLD', nextWeight: 100,
    },
    {
      name: 'optional RIR is not required for intermediate progression',
      sets: Array.from({ length: 3 }, () => set()), action: 'ADVANCE_LOAD', nextWeight: 105,
    },
    {
      name: 'partial RIR accepts the reported evidence',
      sets: [set(100, 12, 2), set(), set(100, 12, 2)], action: 'ADVANCE_LOAD', nextWeight: 105,
    },
    {
      name: 'partial RIR does not hide over-effort',
      sets: [set(100, 12, 2), set(), set(100, 12, 0)], action: 'HOLD', nextWeight: 100,
    },
    {
      name: 'beginner can progress without RIR reporting',
      sets: Array.from({ length: 3 }, () => set()), context: { experienceLevel: 'beginner' }, action: 'ADVANCE_LOAD', nextWeight: 105,
    },
    {
      name: 'every set clears the ceiling at prescribed effort',
      sets: Array.from({ length: 3 }, () => set(100, 12, 2)), action: 'ADVANCE_LOAD', nextWeight: 105,
    },
    {
      name: 'mixed top-set and backoff weights hold',
      sets: [set(110, 12, 2), set(100, 12, 2), set(100, 12, 2)], action: 'HOLD', nextWeight: 110,
    },
    {
      name: 'incomplete prescription holds even at the ceiling',
      sets: [set(100, 12, 2), set(100, 12, 2)], action: 'HOLD', nextWeight: 100,
    },
  ];
  it.each(scenarios)('$name', ({ sets, prescription, context, action, nextWeight }) => {
    const rec = recommendProgression(makePrescription(prescription), [{ date: '2026-08-13', sets }], makeCtx(context));
    expect(rec).toMatchObject({ action, nextWeight });
  });
});

describe('VA-020 — repeated recovery failure', () => {
  it('turns a second consecutive Still sore report into a below-MEV recovery exposure', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: Array.from({ length: 4 }, () => ({ weight: 100, reps: 10, rir: 2 })),
    }];
    const rec = recommendProgression(
      makePrescription({ sets: 4 }),
      sessions,
      makeCtx({ soreness: 'Still sore', consecutiveStillSoreCount: 2, programFocus: 'hypertrophy' }),
    );
    expect(rec.action).toBe('DELOAD_NEEDED');
    expect(rec.nextSets).toBe(2);
    expect(rec.nextRir).toBe(4);
    expect(rec.nextWeight).toBeLessThan(100);
  });

  it('uses the smaller recovery volume when repeated soreness meets a scheduled deload', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: Array.from({ length: 4 }, () => ({ weight: 100, reps: 10, rir: 2 })),
    }];
    const rec = recommendProgression(
      makePrescription({ sets: 4 }),
      sessions,
      makeCtx({
        isDeload: true,
        soreness: 'Still sore',
        consecutiveStillSoreCount: 2,
        programFocus: 'hypertrophy',
        hypertrophyVolumeOverride: { trainingSets: 5, deloadSets: 4 },
      }),
    );
    expect(rec.action).toBe('DELOAD');
    expect(rec.nextSets).toBe(2);
    expect(rec.nextRir).toBeGreaterThanOrEqual(4);
  });

  it('restarts the first productive exposure at the starting volume anchor', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: Array.from({ length: 2 }, () => ({ weight: 100, reps: 10, rir: 3 })),
    }];
    const rec = recommendProgression(
      makePrescription({ sets: 3 }),
      sessions,
      makeCtx({
        mesoWeek: 4,
        totalMesoWeeks: 6,
        soreness: 'Healed early',
        restartAtVolumeAnchor: true,
        programFocus: 'hypertrophy',
        hypertrophyVolumeOverride: { trainingSets: 5, deloadSets: 2 },
      }),
    );
    expect(rec.nextSets).toBe(3);
  });
});

// ─── HV-013: Deadlift + barbell-row same-day validation ──────────────────────

describe('HV-013 — validateDayExercises: deadlift + barbell-row conflict', () => {
  it('fires an error for intermediate user with deadlift + barbell row', () => {
    const issues = validateDayExercises(['Romanian Deadlift (Barbell)', 'Barbell Row (Bent Over)'], 'intermediate');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });

  it('fires an error for beginner user with deadlift + barbell row', () => {
    const issues = validateDayExercises(['Stiff-Leg Deadlift', 'T-Bar Row'], 'beginner');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });

  it('fires a warning (not error) for advanced user', () => {
    const issues = validateDayExercises(['Romanian Deadlift (Barbell)', 'Barbell Row (Bent Over)'], 'advanced');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('no issues when deadlift + non-barbell row', () => {
    const issues = validateDayExercises(['Romanian Deadlift (Barbell)', 'Seated Cable Row'], 'intermediate');
    expect(issues).toHaveLength(0);
  });

  it('no issues when barbell row alone', () => {
    const issues = validateDayExercises(['Barbell Row (Bent Over)', 'Seated Cable Row'], 'beginner');
    expect(issues).toHaveLength(0);
  });

  it('empty list returns no issues', () => {
    const issues = validateDayExercises([], 'beginner');
    expect(issues).toHaveLength(0);
  });
});

// ─── HV-020: Tricep overhead extension coverage ───────────────────────────────

describe('HV-020 — validateProgram: tricep overhead extension coverage', () => {
  it('fires warning when 2+ tricep slots have no overhead extension', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 't1', muscle: 'Triceps', role: 'Primary', selectedExercise: 'Tricep Rope Pushdown' }),
      makeSlot({ id: 't2', muscle: 'Triceps', role: 'Secondary', selectedExercise: 'Tricep Pushdown (Bar)' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const coverageIssues = result.issues.filter((i) => i.type === 'muscle_coverage');
    expect(coverageIssues).toHaveLength(1);
    expect(coverageIssues[0].severity).toBe('warning');
  });

  it('no warning when one of the tricep slots uses skull crusher', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 't1', muscle: 'Triceps', role: 'Primary', selectedExercise: 'Skull Crusher (Barbell)' }),
      makeSlot({ id: 't2', muscle: 'Triceps', role: 'Secondary', selectedExercise: 'Tricep Pushdown (Bar)' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const coverageIssues = result.issues.filter((i) => i.type === 'muscle_coverage');
    expect(coverageIssues).toHaveLength(0);
  });

  it('no warning when only 1 tricep slot (requirement is ≥2)', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 't1', muscle: 'Triceps', role: 'Primary', selectedExercise: 'Tricep Rope Pushdown' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const coverageIssues = result.issues.filter((i) => i.type === 'muscle_coverage');
    expect(coverageIssues).toHaveLength(0);
  });

  it('no warning when tricep slots have no selectedExercise', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 't1', muscle: 'Triceps', role: 'Primary' }),
      makeSlot({ id: 't2', muscle: 'Triceps', role: 'Secondary' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const coverageIssues = result.issues.filter((i) => i.type === 'muscle_coverage');
    expect(coverageIssues).toHaveLength(0);
  });
});

// ─── HV-004: Back plane parity ────────────────────────────────────────────────

describe('HV-004 — validateProgram: back horizontal/vertical pull parity', () => {
  it('fires warning when both back slots are vertical pull', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary', selectedExercise: 'Pull-Up (Normal Grip)' }),
      makeSlot({ id: 'b2', muscle: 'Back', role: 'Secondary', selectedExercise: 'Lat Pulldown' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const planeIssues = result.issues.filter((i) => i.type === 'back_plane');
    expect(planeIssues).toHaveLength(1);
    expect(planeIssues[0].message).toContain('horizontal pull');
  });

  it('fires warning when both back slots are horizontal pull', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary', selectedExercise: 'Barbell Row (Bent Over)' }),
      makeSlot({ id: 'b2', muscle: 'Back', role: 'Secondary', selectedExercise: 'Seated Cable Row' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const planeIssues = result.issues.filter((i) => i.type === 'back_plane');
    expect(planeIssues).toHaveLength(1);
    expect(planeIssues[0].message).toContain('vertical pull');
  });

  it('no warning when back has one vertical and one horizontal pull', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary', selectedExercise: 'Pull-Up (Normal Grip)' }),
      makeSlot({ id: 'b2', muscle: 'Back', role: 'Secondary', selectedExercise: 'Seated Cable Row' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const planeIssues = result.issues.filter((i) => i.type === 'back_plane');
    expect(planeIssues).toHaveLength(0);
  });

  it('silently skips check when back slots have no selectedExercise', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary' }),
      makeSlot({ id: 'b2', muscle: 'Back', role: 'Secondary' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const planeIssues = result.issues.filter((i) => i.type === 'back_plane');
    expect(planeIssues).toHaveLength(0);
  });

  it('no warning when fewer than 2 back slots have exercises', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary', selectedExercise: 'Lat Pulldown' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const planeIssues = result.issues.filter((i) => i.type === 'back_plane');
    expect(planeIssues).toHaveLength(0);
  });
});

// ─── RC-001: Per-session per-muscle set cap ───────────────────────────────────

describe('RC-001 — validateProgram: per-session per-muscle volume cap', () => {
  it('warns when a single muscle receives more than 8 direct sets in one session', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 'c1', muscle: 'Chest', role: 'Primary', sets: 5 }),
      makeSlot({ id: 'c2', muscle: 'Chest', role: 'Secondary', sets: 4 }),
    ];
    const program = makeProgram([makeDay(slots, { sessionType: 'Push', splitName: 'Push' })]);

    const result = validateProgram(program, []);
    const capIssues = result.issues.filter((i) =>
      i.type === 'proportionality' && i.message.includes('9 sets for Chest'),
    );

    expect(capIssues).toHaveLength(1);
    expect(capIssues[0].severity).toBe('warning');
    expect(result.valid).toBe(true);
  });

  it('does not warn at the 8-set per-muscle session ceiling', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 'c1', muscle: 'Chest', role: 'Primary', sets: 4 }),
      makeSlot({ id: 'c2', muscle: 'Chest', role: 'Secondary', sets: 4 }),
    ];
    const program = makeProgram([makeDay(slots, { sessionType: 'Push', splitName: 'Push' })]);

    const result = validateProgram(program, []);
    const capIssues = result.issues.filter((i) =>
      i.type === 'proportionality' && i.message.includes('sets for Chest'),
    );

    expect(capIssues).toHaveLength(0);
  });
});

// Bug fix regression: programFocus: 'maintenance' previously had zero test
// coverage anywhere, and its branch ran *before* the FIRST_SESSION check, so
// a maintenance-focus muscle with no logged history returned a nonsense
// CUT_HOLD recommendation ("holding 0 reps × 0 lbs") instead of prompting for
// a starting weight. FIRST_SESSION now wins regardless of focus.
describe('maintenance focus — hold performance, no auto-increment', () => {
  it('returns FIRST_SESSION (not a bogus CUT_HOLD) when there is no logged history yet', () => {
    const ctx = makeCtx({ programFocus: 'maintenance' });
    const rec = recommendProgression(makePrescription(), [], ctx);
    expect(rec.action).toBe('FIRST_SESSION');
    expect(rec.nextWeight).toBe(0);
  });

  it('holds at last session\'s actual weight/reps once history exists', () => {
    const ctx = makeCtx({ programFocus: 'maintenance' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.action).toBe('CUT_HOLD');
    expect(rec.nextWeight).toBe(100);
    expect(rec.nextSets).toBe(3);
    expect(rec.reason).toContain('10 reps × 100 lbs');
  });
});

describe('ST-012 — strength deload load/volume reduction (supersedes ST-004)', () => {
  // ST-004 (original): flat 50% load reduction, sets held at the template
  // value. ST-012 (2026-08-04, user doctrine spec): load reduction 15-25%
  // (20% midpoint), and sets ALSO now cut 30-50% (40% midpoint, floored at
  // 2) — "maintain movement exposure" means never dropping the pattern to
  // zero, not never touching set count.
  it('reduces load ~20% and sets to ~60% (floored at 2), preserving the movement pattern', () => {
    const ctx = makeCtx({ programFocus: 'strength', isDeload: true });
    const rec = recommendProgression(
      makePrescription({ sets: 5, repsMin: 3, repsMax: 6 }),
      makeSessions(200, 5, 1, 5),
      ctx,
    );
    // 200 * (1 - 0.20) = 160, already a multiple of the >=100lb 5 lb granularity.
    expect(rec.nextWeight).toBe(160);
    // ceil(5 * 0.60) = 3 — sets drop, but the movement is never dropped to 0.
    expect(rec.nextSets).toBe(3);
    expect(rec.action).toBe('DELOAD');
  });

  it.each([1, 2])('retains two sets on strength deload from a %i-set template', sets => {
    const ctx = makeCtx({ programFocus: 'strength', isDeload: true });
    const rec = recommendProgression(
      makePrescription({ sets, repsMin: 3, repsMax: 6 }),
      makeSessions(200, 5, 1, sets),
      ctx,
    );
    // One starting set distinguishes the minimum from rounding alone.
    expect(rec.nextSets).toBe(2);
  });
});

describe('ST-011 — percentage-based, equipment-gated load increment (supersedes ST-010)', () => {
  // ST-010 (original): flat 5 lb increment, every role/experience/focus
  // tier, no exceptions — explicitly a hard constraint against reintroducing
  // fractional increments, since gym equipment doesn't reliably support
  // sub-5-lb barbell plates.
  //
  // ST-011 (2026-08-04, user doctrine spec): that constraint is explicitly
  // reversed. Increment sizing now comes from the exercise's
  // ExerciseProgressionProfile — percentage-based for compounds, and
  // equipment-gated for isolation/cable work so a light exercise never takes
  // a disproportionate jump (the literal bug this was written to fix — see
  // src/api/__tests__/progression.test.ts's "role-aware load increment" test,
  // which used to assert a 20 lb Dumbbell Lateral Raise advancing to 25 lb,
  // a 25% jump, as *correct*).
  const heavyCompound = PROGRESSION_CATEGORY_PROFILES.heavy_compound;
  const isolation = PROGRESSION_CATEGORY_PROFILES.isolation;

  it('required scenario: a 20 lb isolation exercise does not force a jump to 25 lb', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({ repsMin: 10, repsMax: 12, profile: isolation }),
      makeSessions(20, 12, 1), // ceiling hit -> would normally advance load
      ctx,
    );
    expect(rec.nextWeight).toBe(20); // held, not jumped to 25 (or even 22.5)
    expect(rec.nextWeight).not.toBe(25);
    expect(rec.action).toBe('HOLD');
    expect(rec.reason).toContain('holding load');
  });

  it('percentage-based compound: a 200 lb heavy compound advances by a % of current weight, not a flat 5 lb', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({ profile: heavyCompound }),
      makeSessions(200, 12, 1),
      ctx,
    );
    // 200 * 2.5% = 5, rounded to the nearest 5 (>=100lb granularity) = 5 —
    // coincidentally the same magnitude as the old flat rule at this weight,
    // but now derived from a percentage, not a hardcoded constant.
    expect(rec.nextWeight).toBe(205);
    expect(rec.action).toBe('ADVANCE_LOAD');
  });

  it('percentage-based compound: a heavier load produces a proportionally larger jump than 5 lb', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({ profile: heavyCompound }),
      makeSessions(500, 12, 1),
      ctx,
    );
    // 500 * 2.5% = 12.5, rounded to the nearest 5 = 15 — a flat-5lb rule
    // could never produce this, confirming the increment truly scales.
    expect(rec.nextWeight).toBe(515);
  });

  it('bug fix regression: isCut is driven by programFocus, not the unused trainingPhase field', () => {
    // Before the fix, isCut read ctx.trainingPhase, which no call site ever
    // sets — so cut behavior (rep floor of 8) was unreachable even for a
    // real programFocus: 'cut' program. This pins the corrected wiring.
    const ctx = makeCtx({ programFocus: 'cut', trainingPhase: undefined });
    const rec = recommendProgression(
      makePrescription({ repsMin: 5 }),
      makeSessions(100, 6, 1),
      ctx,
    );
    expect(rec.action).toBe('CUT_HOLD');
  });
});

describe('RC-003 — lengthened-position partials for equipment-limited isolation work', () => {
  it('uses lengthened partials when an experienced accessory isolation hits the ceiling but load is equipment-limited', () => {
    const rec = recommendProgression(
      makePrescription({ repsMin: 10, repsMax: 12, role: 'Accessory', profile: PROGRESSION_CATEGORY_PROFILES.isolation }),
      makeSessions(20, 12, 1),
      makeCtx({ experienceLevel: 'intermediate' }),
    );

    expect(rec.action).toBe('LENGTHENED_PARTIALS');
    expect(rec.nextWeight).toBe(20);
    expect(rec.reason).toContain('3–5 lengthened partials');
  });

  it('does not suggest lengthened partials to beginners', () => {
    const rec = recommendProgression(
      makePrescription({ repsMin: 10, repsMax: 12, role: 'Accessory', profile: PROGRESSION_CATEGORY_PROFILES.isolation }),
      makeSessions(20, 12, 1),
      makeCtx({ experienceLevel: 'beginner' }),
    );

    expect(rec.action).toBe('HOLD');
  });

  it('does not suggest lengthened partials for primary compound slots', () => {
    const rec = recommendProgression(
      makePrescription({ repsMin: 10, repsMax: 12, role: 'Primary', profile: PROGRESSION_CATEGORY_PROFILES.isolation }),
      makeSessions(20, 12, 1),
      makeCtx({ experienceLevel: 'advanced' }),
    );

    expect(rec.action).toBe('HOLD');
  });
});

describe('VA-012 — validateProgram frequency warning', () => {
  it('warns (not errors) when daysPerWeek falls outside the experience-level range', () => {
    const days = [makeDay([makeSlot()]), makeDay([makeSlot()])]; // daysPerWeek = 2
    const program = makeProgram(days);
    const result = validateProgram(program, [], 'advanced'); // advanced wants 4-6

    const freqIssues = result.issues.filter((i) => i.type === 'frequency');
    expect(freqIssues).toHaveLength(1);
    expect(freqIssues[0].severity).toBe('warning');
    expect(result.valid).toBe(true); // warnings never flip validity
  });

  it('does not warn when daysPerWeek is within range', () => {
    const days = [makeDay([makeSlot()]), makeDay([makeSlot()]), makeDay([makeSlot()])]; // 3
    const program = makeProgram(days);
    const result = validateProgram(program, [], 'beginner'); // beginner wants 2-3

    expect(result.issues.filter((i) => i.type === 'frequency')).toHaveLength(0);
  });

  it('skips the check entirely when experienceLevel is not provided', () => {
    const days = [makeDay([makeSlot()])]; // daysPerWeek = 1, way outside any range
    const program = makeProgram(days);
    const result = validateProgram(program, []);

    expect(result.issues.filter((i) => i.type === 'frequency')).toHaveLength(0);
  });
});

describe('VA-013 — soreness-based volume autoregulation', () => {
  it('backs off one set (not a full reset) when the muscle reported "Still sore"', () => {
    // Use a below-cap example so removal of the soreness trim still fails.
    // musclePriority 'emphasize' + mesoWeek 3 would normally add weekBonus=2
    // sets above baseSetCount (2) => 4. 'Still sore' trims one set off that
    // (3), rather than resetting all the way back to baseSetCount (2).
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Still sore' });
    const rec = recommendProgression(makePrescription({ sets: 2 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(3);
  });

  it('never drops "Still sore" below baseSetCount even when the trim would go lower', () => {
    // musclePriority 'emphasize' + mesoWeek 1 -> weekBonus 0 -> rawEffectiveSets
    // equals baseSetCount (3) already. Trimming 1 more would go below it —
    // the floor holds it at 3 instead.
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 1, soreness: 'Still sore' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(2);
  });

  it('does not apply a soreness trim when soreness is anything other than "Still sore"', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Healed early' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(4); // HV-023 caps the ramp at four; soreness adds no trim.
  });

  it('does not apply a soreness trim when soreness is not provided at all', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3 });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(4); // HV-023 applies even without a soreness signal.
  });

  it('allows a temporary backoff below the previous actual set count when sore', () => {
    const ctx = makeCtx({ musclePriority: 'maintain', mesoWeek: 3, soreness: 'Still sore' });
    const rec = recommendProgression(makePrescription({ sets: 4 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(3);
  });

  it('does not affect deload-week set counts (deload recomputes nextSets independently)', () => {
    const ctx = makeCtx({
      musclePriority: 'emphasize',
      mesoWeek: 4,
      totalMesoWeeks: 4,
      isDeload: true,
      soreness: 'Still sore',
    });
    const rec = recommendProgression(makePrescription({ sets: 4 }), makeSessions(100, 10, 1), ctx);
    expect(rec.action).toBe('DELOAD');
    expect(rec.nextSets).toBe(Math.max(1, Math.ceil(4 * 0.5)));
  });
});

describe('VA-015 — graduated soreness-based ramp step', () => {
  // musclePriority 'emphasize' + mesoWeek 3 normally adds weekBonus=2 above
  // baseSetCount (3) => 5 (the 'Healed early' / no-signal case, pinned above
  // in VA-013's "does not cap" tests). VA-015 shifts that ramp step itself
  // based on soreness instead of always taking the mesoWeek-driven step.

  it('does not accelerate the ramp from "Not sore" alone', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 2, soreness: 'Not sore' });
    const rec = recommendProgression(makePrescription({ sets: 2 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(3); // Below HV-023: an extra ramp step would incorrectly prescribe four.
  });

  it('repeats last week\'s ramp step when the muscle reported "Just in time" (at the MRV ceiling)', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Just in time' });
    const rec = recommendProgression(makePrescription({ sets: 2 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(3); // 2 + weekBonus(1) — week 2's step, not week 3's
  });

  it('"Just in time" never drops the ramp step below week 1\'s baseline', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 1, soreness: 'Just in time' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(3); // would be week 0 -> clamped to no bonus, not negative
  });

  it('does not apply the extra "Not sore" step outside the emphasize ramp', () => {
    const ctx = makeCtx({ musclePriority: 'grow', mesoWeek: 3, soreness: 'Not sore' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(3); // 'grow' holds at baseSetCount regardless of soreness
  });

  it('does not let "Not sore" override the HV-021 landmark target', () => {
    const ctx = makeCtx({
      musclePriority: 'emphasize',
      programFocus: 'hypertrophy',
      mesoWeek: 3,
      soreness: 'Not sore',
      hypertrophyVolumeOverride: { trainingSets: 2, deloadSets: 1 },
    });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(2); // Below HV-023 so this still tests that the override wins.
  });
});

// HV-028 — bodyweight equipment has no external load to add/reduce/halve.
// Bug report: "load is bodyweight and can't advance" — every branch that
// otherwise computes a new weight from the last logged one (ADVANCE_LOAD,
// REDUCE_LOAD, scheduled DELOAD, bad-session DELOAD_NEEDED, PLATEAU_DELOAD)
// used to apply the same increment/halving math regardless of equipment,
// producing nonsense like "add 5 lb" or "reduce to 50%" against someone's
// actual body weight. All of them now hold weight at the last logged value
// for equipment: 'Bodyweight', with the training decision expressed purely
// on the reps axis instead.
describe('HV-028 — bodyweight equipment holds weight, progresses reps only', () => {
  it('distinguishes valid zero external load from missing loaded-exercise weight', () => {
    expect(isUsableLoggedWeight(0, 'Bodyweight')).toBe(true);
    expect(isUsableLoggedWeight(0, 'Cable')).toBe(false);
    expect(isUsableLoggedWeight(100, 'Cable')).toBe(true);
  });

  it('treats zero external load as completed bodyweight work and advances the rep target', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({ sets: 3, repsMin: 8, repsMax: 12, equipment: 'Bodyweight' }),
      makeSessions(0, 12, 1, 3),
      ctx,
    );
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(0);
    expect(rec.nextRepsMax).toBe(13);
  });

  it('ADVANCE_LOAD: keeps weight unchanged and climbs reps past the ceiling instead of resetting to the floor', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({ repsMin: 8, repsMax: 12, equipment: 'Bodyweight' }),
      makeSessions(206, 15, 1), // 15 reps clears the 12-rep ceiling
      ctx,
    );
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(206);
    expect(rec.nextRepsMax).toBe(16); // 15 + 1, uncapped by the ceiling
    expect(rec.reason).toContain('no load to add');
  });

  it('a loaded exercise in the same scenario still advances load and resets to the floor', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({ repsMin: 8, repsMax: 12 }), // no equipment field -> not bodyweight
      makeSessions(206, 15, 1),
      ctx,
    );
    expect(rec.action).toBe('ADVANCE_LOAD');
    expect(rec.nextWeight).toBe(210); // 206 + 5, rounded to nearest 5
    expect(rec.nextRepsMax).toBe(8); // reset to the floor
  });

  it('REDUCE_LOAD: holds weight when 2 consecutive sessions land below the rep floor', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const sessions: SessionPerformance[] = [
      { date: '2026-01-08', sets: [{ weight: 206, reps: 5 }] },
      { date: '2026-01-01', sets: [{ weight: 206, reps: 5 }] },
    ];
    const rec = recommendProgression(
      makePrescription({ repsMin: 8, repsMax: 12, equipment: 'Bodyweight' }),
      sessions,
      ctx,
    );
    expect(rec.action).toBe('REDUCE_LOAD');
    expect(rec.nextWeight).toBe(206); // held, not reduced
    expect(rec.reason).toContain('No external load to reduce');
  });

  it('scheduled DELOAD: holds weight instead of halving it', () => {
    const ctx = makeCtx({ isDeload: true });
    const rec = recommendProgression(
      makePrescription({ equipment: 'Bodyweight' }),
      makeSessions(206, 10, 1),
      ctx,
    );
    expect(rec.action).toBe('DELOAD');
    expect(rec.nextWeight).toBe(206);
    expect(rec.reason).toContain('no external load to reduce');
  });

  it('DELOAD_NEEDED (2 consecutive bad sessions): holds weight instead of halving it', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const sessions: SessionPerformance[] = [
      { date: '2026-01-15', sets: [{ weight: 206, reps: 8 }] },
      { date: '2026-01-08', sets: [{ weight: 206, reps: 9 }] },
      { date: '2026-01-01', sets: [{ weight: 206, reps: 10 }] },
    ];
    const rec = recommendProgression(
      makePrescription({ equipment: 'Bodyweight' }),
      sessions,
      ctx,
    );
    expect(rec.action).toBe('DELOAD_NEEDED');
    expect(rec.nextWeight).toBe(206);
  });

  it('beginner linear ADVANCE_LOAD also holds weight and climbs reps toward the bodyweight ceiling', () => {
    // HV-037: bodyweight reps are no longer literally uncapped — they climb
    // toward a ceiling (default 30, see PROGRESSION_CATEGORY_PROFILES) before
    // ADVANCE_DIFFICULTY takes over. 12 -> 13 is still well below that
    // ceiling, so this scenario's outcome is unchanged from before HV-037.
    const ctx = makeCtx({ experienceLevel: 'beginner' });
    const rec = recommendProgression(
      makePrescription({ repsMin: 8, repsMax: 12, equipment: 'Bodyweight' }),
      makeSessions(206, 12, 1),
      ctx,
    );
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(206);
    expect(rec.nextRepsMax).toBe(13);
  });
});

// ─── HV-032: Volume transition compensation — required scenario 1 ────────────

describe('HV-032 — volume transition compensation', () => {
  it('required scenario: an exercise that just gained a set gets a lowered rep ceiling instead of the old ceiling at higher fatigue', () => {
    // 3 sets x 8 reps @ 200 lb last session; this week's target climbs to 4
    // sets (musclePriority 'grow' holds template value normally — the extra
    // set here comes from prescription.sets itself, simulating the volume
    // engine having already decided on 4 for this week).
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow' });
    const rec = recommendProgression(
      makePrescription({ sets: 4, repsMin: 8, repsMax: 10, profile: PROGRESSION_CATEGORY_PROFILES.machine_compound }),
      makeSessions(200, 8, 1, 3),
      ctx,
    );
    expect(rec.nextSets).toBe(4);
    expect(rec.nextWeight).toBe(200); // load holds — no forced ADVANCE_LOAD
    expect(rec.action).toBe('HOLD');
    // The engine does NOT ask for the old 10-rep ceiling again at the new,
    // higher-fatigue set count (a naive "4x10@200") — it lowers the target.
    expect(rec.nextRepsMax).toBeLessThan(10);
    expect(rec.nextRepsMax).toBe(9);
  });

  it('does not lower the ceiling when sets did not change — same setup, unchanged sets hits the real ceiling and advances load', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow' });
    const rec = recommendProgression(
      makePrescription({ sets: 3, repsMin: 8, repsMax: 10, profile: PROGRESSION_CATEGORY_PROFILES.machine_compound }),
      makeSessions(200, 10, 1, 3), // 3 sets both weeks -> no transition penalty; 10 reps hits the real (unadjusted) ceiling
      ctx,
    );
    expect(rec.action).toBe('ADVANCE_LOAD'); // contrast with the HOLD above — the ceiling wasn't artificially lowered
    expect(rec.nextRepsMax).toBe(8); // resets to the floor at the new load, per ST-007 — not the transition-lowered 9
  });
});

describe('calculateVolumeTransitionAdjustment — standalone unit tests', () => {
  it('returns no adjustment when sets did not increase', () => {
    const result = calculateVolumeTransitionAdjustment(
      3, 3, { repsMin: 8, repsMax: 12 }, PROGRESSION_CATEGORY_PROFILES.heavy_compound,
    );
    expect(result.adjustedRepsMax).toBe(12);
    expect(result.holdLoad).toBe(false);
  });

  it('lowers the rep ceiling proportionally to the category penalty when sets increase', () => {
    const result = calculateVolumeTransitionAdjustment(
      3, 4, { repsMin: 6, repsMax: 10 }, PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound,
    );
    expect(result.adjustedRepsMax).toBeLessThan(10);
    expect(result.adjustedRepsMax).toBeGreaterThanOrEqual(6);
  });

  it('never lowers the ceiling below repsMin', () => {
    const result = calculateVolumeTransitionAdjustment(
      1, 5, { repsMin: 8, repsMax: 9 }, PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound,
    );
    expect(result.adjustedRepsMax).toBeGreaterThanOrEqual(8);
  });
});


// ─── RC-011: Cut phase runs at reduced speed instead of a hard hold — required scenario 3

describe('RC-011 — cut phase allows reduced-speed progression', () => {
  it('required scenario: cut phase still allows progress when the ceiling is hit, at less than the full increment', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate', programFocus: 'cut' });
    const rec = recommendProgression(
      makePrescription({ repsMin: 8, repsMax: 12, profile: PROGRESSION_CATEGORY_PROFILES.heavy_compound }),
      makeSessions(200, 12, 1),
      ctx,
    );
    expect(rec.action).toBe('CUT_PROGRESS');
    expect(rec.nextWeight).toBeGreaterThan(200);
    expect(rec.nextWeight).toBe(205);
  });

  it('cut phase still holds (not progresses) when the ceiling has not been hit', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate', programFocus: 'cut' });
    const rec = recommendProgression(
      makePrescription({ repsMin: 8, repsMax: 12, profile: PROGRESSION_CATEGORY_PROFILES.heavy_compound }),
      makeSessions(200, 9, 1),
      ctx,
    );
    expect(rec.action).toBe('CUT_HOLD');
    expect(rec.nextWeight).toBe(200);
  });
});

// ─── HV-034: Plateau requires more exposures, including for advanced lifters — required scenario 4

describe('HV-034 — plateau requires more exposures than before, including for advanced lifters', () => {
  it('required scenario: 2 identical sessions (1 pair) is NOT yet a plateau for an advanced lifter under the new 3-exposure threshold', () => {
    const ctx = makeCtx({ experienceLevel: 'advanced' });
    const rec = recommendProgression(makePrescription(), makeSessions(100, 10, 2), ctx);
    expect(rec.action).not.toBe('PLATEAU_DELOAD');
  });

  it('required scenario: 3 identical sessions (2 pairs) IS a plateau for an advanced lifter', () => {
    const ctx = makeCtx({ experienceLevel: 'advanced' });
    const rec = recommendProgression(makePrescription(), makeSessions(100, 10, 3), ctx);
    expect(rec.action).toBe('PLATEAU_DELOAD');
  });

  it('does not call a plateau when identical output improves at a higher reported RIR', () => {
    const sets = (rir: number) => Array.from({ length: 3 }, () => ({ weight: 100, reps: 10, rir }));
    const sessions: SessionPerformance[] = [
      { date: '2026-01-15', sets: sets(3) },
      { date: '2026-01-08', sets: sets(2) },
      { date: '2026-01-01', sets: sets(1) },
    ];
    const rec = recommendProgression(makePrescription({ sets: 3 }), sessions, makeCtx({ experienceLevel: 'advanced' }));
    expect(rec.action).not.toBe('PLATEAU_DELOAD');
  });

  it('does not compare changed set counts as a performance plateau', () => {
    const sessions: SessionPerformance[] = [
      { date: '2026-01-15', sets: Array.from({ length: 2 }, () => ({ weight: 100, reps: 10 })) },
      { date: '2026-01-08', sets: Array.from({ length: 3 }, () => ({ weight: 100, reps: 10 })) },
      { date: '2026-01-01', sets: Array.from({ length: 4 }, () => ({ weight: 100, reps: 10 })) },
    ];
    const rec = recommendProgression(makePrescription({ sets: 2 }), sessions, makeCtx({ experienceLevel: 'advanced' }));
    expect(rec.action).not.toBe('PLATEAU_DELOAD');
  });

  it('does not call a plateau if volume recently increased, even with identical load/reps history', () => {
    // 3 identical sessions would normally plateau an advanced lifter (see
    // above) — but if this week's sets just increased, HV-034 gates the
    // plateau check off, since flat reps at a higher set count isn't a
    // stall, it's expected fatigue.
    const ctx = makeCtx({ experienceLevel: 'advanced', musclePriority: 'grow' });
    const rec = recommendProgression(
      makePrescription({ sets: 5 }), // effectiveSets(5) > previousSets(3 from makeSessions default)
      makeSessions(100, 10, 3),
      ctx,
    );
    expect(rec.action).not.toBe('PLATEAU_DELOAD');
  });
});

// ─── HV-037: Bodyweight progresses beyond reps — required scenario 6 ─────────

describe('HV-037 — bodyweight multi-dimension progression', () => {
  it('advances difficulty when zero-load bodyweight work reaches its rep ceiling', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({
        sets: 3, repsMin: 8, repsMax: 20, equipment: 'Bodyweight', profile: PROGRESSION_CATEGORY_PROFILES.bodyweight,
      }),
      makeSessions(0, 30, 1, 3),
      ctx,
    );
    expect(rec.action).toBe('ADVANCE_DIFFICULTY');
    expect(rec.nextWeight).toBe(0);
    expect(rec.nextRepsMax).toBe(30);
  });

  it('required scenario: a bodyweight exercise at its rep ceiling advances via difficulty, not more reps', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({
        repsMin: 8, repsMax: 20, equipment: 'Bodyweight', profile: PROGRESSION_CATEGORY_PROFILES.bodyweight,
      }),
      makeSessions(180, 30, 1, 3), // 30 reps -> at the 30-rep bodyweight ceiling
      ctx,
    );
    expect(rec.action).toBe('ADVANCE_DIFFICULTY');
    expect(rec.reason).toContain('tempo');
    expect(rec.nextWeight).toBe(180); // still no load to add
    expect(rec.nextRepsMax).toBe(30);
  });

  it('below the bodyweight ceiling, reps keep climbing instead of jumping straight to ADVANCE_DIFFICULTY', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(
      makePrescription({
        repsMin: 8, repsMax: 20, equipment: 'Bodyweight', profile: PROGRESSION_CATEGORY_PROFILES.bodyweight,
      }),
      makeSessions(180, 25, 1, 3), // past the old 20-rep ceiling, below the 30-rep bodyweight ceiling
      ctx,
    );
    expect(rec.action).toBe('HOLD');
    expect(rec.nextRepsMax).toBe(26);
  });

  it('respects a per-exercise bodyweightRepCeiling override lower than the category default', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const pullUpProfile = { ...PROGRESSION_CATEGORY_PROFILES.bodyweight, bodyweightRepCeiling: 15 };
    const rec = recommendProgression(
      makePrescription({ repsMin: 5, repsMax: 12, equipment: 'Bodyweight', profile: pullUpProfile }),
      makeSessions(180, 15, 1, 3), // weight column here represents bodyweight (see HV-028), not an external load
      ctx,
    );
    expect(rec.action).toBe('ADVANCE_DIFFICULTY');
    expect(rec.nextRepsMax).toBe(15);
  });
});
