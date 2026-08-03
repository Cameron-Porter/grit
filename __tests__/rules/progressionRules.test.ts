import { recommendProgression } from '../../src/rules/progressionEngine';
import { validateDayExercises, validateProgram } from '../../src/rules/validation';
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

// Two sessions with identical performance → creates stalls if needed
function makeSessions(weight = 100, reps = 10, count = 0): SessionPerformance[] {
  return Array.from({ length: count }, () => ({
    date: '2026-01-01',
    sets: [{ weight, reps }],
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
    const prescription = makePrescription({ rir: 5 });
    const ctx = makeCtx({ experienceLevel: 'beginner', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 6 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(2);
  });

  it('same schedule taper for an intermediate user is not clamped at 2', () => {
    const prescription = makePrescription({ rir: 5 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 6 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(1);
  });

  it('does not taper beginners below their RIR-2 floor early in the meso', () => {
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'beginner', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 4 });
    // No sessions → FIRST_SESSION, which returns base nextRir unchanged
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(2);
  });

  it('does not taper for maintain priority muscles', () => {
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'maintain', mesoWeek: 1, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(2);
  });

  it('applies taper for intermediate grow muscle in a 4-week meso (3 training + 1 deload)', () => {
    // Week 1 of 4-week meso: trainingWeeks = 3, weeksRemaining = 3 - 1 = 2
    // base.nextRir = 2 - 2 = 0 → Math.max(0, 0) = 0
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 1, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(0);
  });

  it('taper on week 3 of 4-week meso produces 0 weeksRemaining', () => {
    // Week 3: trainingWeeks = 3, weeksRemaining = 3 - 3 = 0 → nextRir = 2 - 0 = 2
    const prescription = makePrescription({ rir: 2 });
    const ctx = makeCtx({ experienceLevel: 'intermediate', musclePriority: 'grow', mesoWeek: 3, totalMesoWeeks: 4 });
    const rec = recommendProgression(prescription, [], ctx);
    expect(rec.nextRir).toBe(2);
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
    expect(rec.nextRir).toBe(1);
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

describe('ST-004 — strength deload load reduction', () => {
  it('drops load to 50% of last session, holding sets and reps', () => {
    const ctx = makeCtx({ programFocus: 'strength', isDeload: true });
    const rec = recommendProgression(
      makePrescription({ sets: 5, repsMin: 3, repsMax: 6 }),
      makeSessions(200, 5, 1),
      ctx,
    );
    expect(rec.nextWeight).toBe(100);
    expect(rec.nextSets).toBe(5);
    expect(rec.action).toBe('DELOAD');
  });
});

describe('ST-010 — flat 5 lb load increment, no exceptions', () => {
  // Cut-phase halving (5 -> 2.5 lb) and isolation/accessory micro-loading
  // (2.5 lb, formerly 1.25 lb) were both removed per explicit user direction
  // — fractional-plate increments aren't reliably available on gym
  // equipment. getLoadIncrement now returns a flat 5 lb for every role,
  // experience level, and focus, cut included. This is a hard constraint,
  // not a gap to fill back in with a new fractional tier.
  it('does not halve the increment for cut focus', () => {
    const ctx = makeCtx({ programFocus: 'cut' });
    const rec = recommendProgression(
      makePrescription(),
      makeSessions(100, 12, 1), // ceiling hit -> would advance load if not cut
      ctx,
    );
    // Cut disables auto-advance (CUT_HOLD), but loadIncrement is still
    // reported for the UI — that's what this test is pinning.
    expect(rec.loadIncrement).toBe(5);
  });

  it('does not go below 5 lb for isolation-accessory work under cut focus', () => {
    const ctx = makeCtx({ programFocus: 'cut' });
    const rec = recommendProgression(
      makePrescription({ role: 'Accessory', exerciseType: 'isolation' }),
      makeSessions(50, 12, 1),
      ctx,
    );
    expect(rec.loadIncrement).toBe(5);
  });

  it('bug fix regression: isCut is driven by programFocus, not the unused trainingPhase field', () => {
    // Before the fix, isCut read ctx.trainingPhase, which no call site ever
    // sets — so cut behavior (rep floor of 8, CUT_HOLD) was unreachable even
    // for a real programFocus: 'cut' program. This pins the corrected wiring.
    const ctx = makeCtx({ programFocus: 'cut', trainingPhase: undefined });
    const rec = recommendProgression(
      makePrescription({ repsMin: 5 }),
      makeSessions(100, 6, 1),
      ctx,
    );
    expect(rec.action).toBe('CUT_HOLD');
  });

  it('does not affect non-cut focuses', () => {
    const ctx = makeCtx({ programFocus: 'hypertrophy' });
    const rec = recommendProgression(
      makePrescription(),
      makeSessions(100, 12, 1),
      ctx,
    );
    expect(rec.loadIncrement).toBe(5);
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
    expect(rec.nextSets).toBe(3);
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

  it('never drops sets below the base count even when sore (holds, does not cut)', () => {
    const ctx = makeCtx({ musclePriority: 'maintain', mesoWeek: 3, soreness: 'Still sore' });
    const rec = recommendProgression(makePrescription({ sets: 4 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(4); // 'maintain' already holds at baseSetCount — unaffected
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

describe('VA-014 — graduated soreness-based ramp step', () => {
  // musclePriority 'emphasize' + mesoWeek 3 normally adds weekBonus=2 above
  // baseSetCount (3) => 5 (the 'Healed early' / no-signal case, pinned above
  // in VA-013's "does not cap" tests). VA-014 shifts that ramp step itself
  // based on soreness instead of always taking the mesoWeek-driven step.

  it('takes an extra ramp step when the muscle reported "Not sore" (under-dosed signal)', () => {
    const ctx = makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, soreness: 'Not sore' });
    const rec = recommendProgression(makePrescription({ sets: 3 }), makeSessions(100, 10, 1), ctx);
    expect(rec.nextSets).toBe(6); // 3 + weekBonus(3) instead of the normal 2
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
