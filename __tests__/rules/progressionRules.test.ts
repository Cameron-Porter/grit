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

describe('HV-019 — deadlift RIR hard floor', () => {
  it('floors nextRir to hardRirFloor when taper would go below it', () => {
    const prescription = makePrescription({ rir: 0, hardRirFloor: 1 });
    const ctx = makeCtx({ experienceLevel: 'advanced' });
    const rec = recommendProgression(prescription, makeSessions(100, 10, 1), ctx);
    expect(rec.nextRir).toBeGreaterThanOrEqual(1);
  });

  it('does not lower nextRir when rir is already above the floor', () => {
    const prescription = makePrescription({ rir: 2, hardRirFloor: 1 });
    const ctx = makeCtx({ experienceLevel: 'advanced' });
    const rec = recommendProgression(prescription, makeSessions(100, 10, 1), ctx);
    // nextRir should be >= 1 (floor) and the taper/hold logic applies normally
    expect(rec.nextRir).toBeGreaterThanOrEqual(1);
  });

  it('deload week still produces high RIR regardless of floor', () => {
    const prescription = makePrescription({ rir: 0, hardRirFloor: 1 });
    const ctx = makeCtx({ isDeload: true, experienceLevel: 'advanced' });
    const rec = recommendProgression(prescription, makeSessions(100, 10, 1), ctx);
    expect(rec.nextRir).toBeGreaterThanOrEqual(4);
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
    expect(target.weight).toBe(0);expect(target.repsMin).toBe(10);expect(target.seededFromHistory).toBe(true);
  });
});

// ─── HV-001: Intra-mesocycle RIR taper ───────────────────────────────────────

describe('HV-001 — intra-mesocycle RIR taper', () => {
  // HV-027: beginners now taper too (previously excluded entirely), but to a
  // gentler floor of 2 instead of 0 — Hypertrophy Made Simple's beginner RIR
  // table tapers 4-5 RIR down to 2 RIR, not to failure.
  it('tapers for beginner users but stops at floor 2 where intermediate/advanced would continue to 1', () => {
    // 6-week meso (5 training + 1 deload), week 1: trainingWeeks = 5,
    // weeksRemaining = 5 - 1 = 4. Raw taper: 5 - 4 = 1.
    // Beginner floor (HV-027) clamps this back up to 2; intermediate/advanced
    // (floor 0) would let it through as 1 (see the intermediate test below).
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'beginner', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 5 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(3);
  });

  it('same schedule taper for an intermediate user is not clamped at 2', () => {
    const prescription = makePrescription({ rir: 2, profile: PROGRESSION_CATEGORY_PROFILES.isolation });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(0);
  });

  it('does not taper beginners below their RIR-2 floor early in the meso', () => {
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'beginner', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 4 });
    // No sessions → FIRST_SESSION, which returns base nextRir unchanged
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(3);
  });

  it('does not taper for maintain priority muscles', () => {
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'maintain', mesoWeek: 1, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(2);
  });

  it('applies taper for intermediate grow muscle in a 4-week meso (3 training + 1 deload)', () => {
    // Week 1 of 4-week meso: trainingWeeks = 3, weeksRemaining = 3 - 1 = 2
    // base.nextRir = 2 - 2 = 0 → Math.max(0, 0) = 0, then HV-036's category
    // failure floor applies: makePrescription() carries no profile, so
    // recommendProgression defaults to the heavy_compound profile
    // (failurePolicy: 'avoid', floor 1) — true 0-RIR failure never applies
    // to a heavy compound by default, even at peak week. See the
    // 'isolation exercises can reach true 0-RIR' test below (HV-036) for the
    // failurePolicy: 'allowed' counterpart that verifies the taper itself
    // still reaches 0 pre-floor.
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(3);
  });

  it('taper on week 3 of 4-week meso produces 0 weeksRemaining', () => {
    // Week 3: trainingWeeks = 3, weeksRemaining = 3 - 3 = 0 → nextRir = 2 - 0 = 2
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 3, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(1);
  });

  it('deload week bypasses taper and caps at RIR 4', () => {
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', isDeload: true, mesoWeek: 4, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, makeSessions(100, 10, 1), ctx);
    expect(rec.nextRir).toBeGreaterThanOrEqual(4);
  });

  it('integration: deadlift + taper to 0 is floored back to 1 by HV-019', () => {
    // Week 1 of 4-week meso, grow, intermediate → taper reduces to 0, floor raises to 1
    const prescription = makePrescription({ rir: 2, hardRirFloor: 1 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(3);
  });
});

// ─── ST-007: Double-progression rep target climbs 1 rep at a time ────────────

describe('ST-007 — rep target advances by 1, not straight to the ceiling', () => {
  // Regression case: a wide-band bodyweight exercise (Pull-Up, 8–15 reps) that
  // only got 8 reps last session must not prescribe 15 next session.
  it('within-band hold targets last reps + 1, not the full ceiling', () => {
    const prescription = makePrescription({ repsMin: 8, repsMax: 15 });
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(prescription, makeSessions(180, 8, 1), ctx);
    expect(rec.action).toBe('HOLD');
    expect(rec.nextRepsMax).toBe(9);
    expect(rec.nextRepsMax).not.toBe(15);
  });

  it('below-floor hold targets last reps + 1, not the full ceiling', () => {
    const prescription = makePrescription({ repsMin: 8, repsMax: 15 });
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(prescription, makeSessions(180, 6, 1), ctx);
    expect(rec.action).toBe('HOLD');
    expect(rec.nextRepsMax).toBe(7);
  });

  it('caps the target at the true ceiling instead of overshooting', () => {
    const prescription = makePrescription({ repsMin: 8, repsMax: 12 });
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(prescription, makeSessions(100, 11, 1), ctx);
    expect(rec.nextRepsMax).toBe(12);
  });

  it('resets the target to the floor after ADVANCE_LOAD, not the old ceiling', () => {
    const prescription = makePrescription({ repsMin: 8, repsMax: 12 });
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(prescription, makeSessions(100, 12, 1), ctx);
    expect(rec.action).toBe('ADVANCE_LOAD');
    expect(rec.nextRepsMax).toBe(8);
  });

  it('resets the target to the floor after REDUCE_LOAD', () => {
    const prescription = makePrescription({ repsMin: 8, repsMax: 12 });
    const ctx = makeCtx({ experienceLevel: 'intermediate' });
    const rec = recommendProgression(prescription, makeSessions(100, 6, 2), ctx);
    expect(rec.action).toBe('REDUCE_LOAD');
    expect(rec.nextRepsMax).toBe(8);
  });

  it('applies the same +1 targeting for beginner linear progression', () => {
    const prescription = makePrescription({ repsMin: 8, repsMax: 15 });
    const ctx = makeCtx({ experienceLevel: 'beginner' });
    const rec = recommendProgression(prescription, makeSessions(180, 8, 1), ctx);
    expect(rec.action).toBe('HOLD');
    expect(rec.nextRepsMax).toBe(9);
  });
});

describe('ST-013 — whole-prescription and actual-effort load gate', () => {
  it('does not add load when only the best set reaches the ceiling', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: [
        { weight: 20, reps: 18 },
        { weight: 20, reps: 12 },
        { weight: 20, reps: 12 },
      ],
    }];
    const rec = recommendProgression(
      makePrescription({ repsMin: 12, repsMax: 18, sets: 3 }),
      sessions,
      makeCtx({ musclePriority: 'maintain' }),
    );
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(20);
  });

  it('holds when actual RIR shows the completed prescription was too hard', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: Array.from({ length: 3 }, () => ({ weight: 100, reps: 12, rir: 0 })),
    }];
    const rec = recommendProgression(makePrescription({ rir: 2 }), sessions, makeCtx());
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(100);
  });

  it('holds an intermediate load increase when no actual RIR was reported', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: Array.from({ length: 3 }, () => ({ weight: 100, reps: 12 })),
    }];
    const rec = recommendProgression(makePrescription({ rir: 2 }), sessions, makeCtx({ experienceLevel: 'intermediate' }));
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(100);
  });

  it('holds when effort reporting is only partial', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: [
        { weight: 100, reps: 12, rir: 2 },
        { weight: 100, reps: 12 },
        { weight: 100, reps: 12, rir: 2 },
      ],
    }];
    const rec = recommendProgression(makePrescription({ rir: 2 }), sessions, makeCtx({ experienceLevel: 'intermediate' }));
    expect(rec.action).toBe('HOLD');
  });

  it('retains beginner linear progression when RIR has not been learned yet', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: Array.from({ length: 3 }, () => ({ weight: 100, reps: 12 })),
    }];
    const rec = recommendProgression(makePrescription({ rir: 2 }), sessions, makeCtx({ experienceLevel: 'beginner' }));
    expect(rec.action).toBe('ADVANCE_LOAD');
  });

  it('advances after every working set clears the ceiling at acceptable actual RIR', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: Array.from({ length: 3 }, () => ({ weight: 100, reps: 12, rir: 2 })),
    }];
    const rec = recommendProgression(makePrescription({ rir: 2 }), sessions, makeCtx());
    expect(rec.action).toBe('ADVANCE_LOAD');
  });

  it('holds mixed top-set and backoff loading until set roles are modeled', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: [
        { weight: 110, reps: 12, rir: 2 },
        { weight: 100, reps: 12, rir: 2 },
        { weight: 100, reps: 12, rir: 2 },
      ],
    }];
    const rec = recommendProgression(makePrescription({ rir: 2 }), sessions, makeCtx());
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(110);
  });

  it('holds when fewer than the prescribed working sets were completed', () => {
    const sessions: SessionPerformance[] = [{
      date: '2026-08-13',
      sets: [{ weight: 100, reps: 12, rir: 2 }, { weight: 100, reps: 12, rir: 2 }],
    }];
    const rec = recommendProgression(makePrescription({ sets: 3 }), sessions, makeCtx());
    expect(rec.action).toBe('HOLD');
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
    const issues = validateDayExercises(['Romanian Deadlift', 'Barbell Row'], 'intermediate');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });

  it('fires an error for beginner user with deadlift + barbell row', () => {
    const issues = validateDayExercises(['Stiff-Leg Deadlift', 'T-Bar Row'], 'beginner');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });

  it('fires a warning (not error) for advanced user', () => {
    const issues = validateDayExercises(['Romanian Deadlift', 'Barbell Row'], 'advanced');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('no issues when deadlift + non-barbell row', () => {
    const issues = validateDayExercises(['Romanian Deadlift', 'Seated Cable Row'], 'intermediate');
    expect(issues).toHaveLength(0);
  });

  it('no issues when barbell row alone', () => {
    const issues = validateDayExercises(['Barbell Row', 'Seated Cable Row'], 'beginner');
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
      makeSlot({ id: 't2', muscle: 'Triceps', role: 'Secondary', selectedExercise: 'Cable Tricep Pushdown' }),
    ];
    const program = makeProgram([makeDay(slots)]);
    const result = validateProgram(program, []);
    const coverageIssues = result.issues.filter((i) => i.type === 'muscle_coverage');
    expect(coverageIssues).toHaveLength(1);
    expect(coverageIssues[0].severity).toBe('warning');
  });

  it('no warning when one of the tricep slots uses skull crusher', () => {
    const slots: ExerciseSlot[] = [
      makeSlot({ id: 't1', muscle: 'Triceps', role: 'Primary', selectedExercise: 'Skull Crusher' }),
      makeSlot({ id: 't2', muscle: 'Triceps', role: 'Secondary', selectedExercise: 'Cable Tricep Pushdown' }),
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
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary', selectedExercise: 'Pull-Up' }),
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
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary', selectedExercise: 'Barbell Row' }),
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
      makeSlot({ id: 'b1', muscle: 'Back', role: 'Primary', selectedExercise: 'Pull-Up' }),
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

  it('never drops sets below 2, even for a small template set count', () => {
    const ctx = makeCtx({ programFocus: 'strength', isDeload: true });
    const rec = recommendProgression(
      makePrescription({ sets: 2, repsMin: 3, repsMax: 6 }),
      makeSessions(200, 5, 1, 2),
      ctx,
    );
    // ceil(2 * 0.60) = 2 — already at the floor, doesn't go lower.
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
    // musclePriority 'emphasize' + mesoWeek 3 would normally add weekBonus=2
    // sets above baseSetCount (3) => 5. 'Still sore' trims one set off that
    // (4), rather than resetting all the way back to baseSetCount (3).
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Still sore' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(4);
  });

  it('never drops "Still sore" below baseSetCount even when the trim would go lower', () => {
    // musclePriority 'emphasize' + mesoWeek 1 -> weekBonus 0 -> rawEffectiveSets
    // equals baseSetCount (3) already. Trimming 1 more would go below it —
    // the floor holds it at 3 instead.
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 1, soreness: 'Still sore' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(2);
  });

  it('does not cap sets when soreness is anything other than "Still sore"', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Healed early' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(5); // 3 + weekBonus(2), uncapped
  });

  it('does not cap sets when soreness is not provided at all', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3 });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(5);
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
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Not sore' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(5);
  });

  it('repeats last week\'s ramp step when the muscle reported "Just in time" (at the MRV ceiling)', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Just in time' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(4); // 3 + weekBonus(1) — week 2's step, not week 3's
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
      hypertrophyVolumeOverride: { trainingSets: 10, deloadSets: 5 },
    });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(10); // override wins outright, untouched by the ramp shift
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

// ─── HV-036: Failure-policy RIR floor by category — required scenario 7 ──────

describe('HV-036 — exercise fatigue profile changes the prescription (failure-policy RIR floor)', () => {
  it('required scenario: a heavy compound never reaches true 0-RIR failure, even at peak week', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' });
    const rec = recommendProgression(
      makePrescription({ rir: 2, profile: PROGRESSION_CATEGORY_PROFILES.heavy_compound }),
      [],
      ctx,
    );
    expect(rec.nextRir).toBe(1);
  });

  it('required scenario: an isolation exercise can reach true 0-RIR failure at peak week — same taper, different category floor', () => {
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 4, totalMesoWeeks: 5, soreness: 'Healed early' });
    const rec = recommendProgression(
      makePrescription({ rir: 2, profile: PROGRESSION_CATEGORY_PROFILES.isolation }),
      [],
      ctx,
    );
    expect(rec.nextRir).toBe(0);
  });

  it('a cut-phase heavy compound floors one RIR higher than a non-cut heavy compound', () => {
    const cutCtx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 4, programFocus: 'cut' });
    const rec = recommendProgression(
      makePrescription({ rir: 2, profile: PROGRESSION_CATEGORY_PROFILES.heavy_compound }),
      [],
      cutCtx,
    );
    expect(rec.nextRir).toBeGreaterThanOrEqual(2);
  });
});
