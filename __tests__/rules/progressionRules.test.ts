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
  it('does not taper for beginner users', () => {
    // Beginner with grow priority — no taper should apply
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
