import { buildProgram } from '../../src/rules/programBuilder';
import { SESSION_MAX_EXERCISES, SESSION_MAX_SETS } from '../../src/rules/sessionTrimmer';
import { LOWER_SESSION_TYPES } from '../../src/rules/splitDeriver';

const EXAMPLE_CONFIG = {
  name: '5-Day Hypertrophy',
  focus: 'hypertrophy' as const,
  daysPerWeek: 5,
  selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  musclePriorities: {
    Chest: 'emphasize' as const,
    Shoulders: 'emphasize' as const,
    Triceps: 'emphasize' as const,
    Back: 'grow' as const,
    Biceps: 'grow' as const,
    Quads: 'maintain' as const,
    Hamstrings: 'maintain' as const,
    Glutes: 'maintain' as const,
    Calves: 'maintain' as const,
    Abs: 'maintain' as const,
  },
  totalWeeks: 6,
  experienceLevel: 'intermediate' as const,
};

describe('buildProgram — 5-day Chest/Shoulders/Triceps emphasize example', () => {
  const program = buildProgram(EXAMPLE_CONFIG);

  it('returns valid: true', () => {
    expect(program.validation.valid).toBe(true);
  });

  it(`never exceeds ${SESSION_MAX_EXERCISES} exercises per session`, () => {
    for (const day of program.days) {
      expect(day.slots.length).toBeLessThanOrEqual(SESSION_MAX_EXERCISES);
    }
  });

  it('never exceeds 24 sets per session', () => {
    for (const day of program.days) {
      expect(day.totalSets).toBeLessThanOrEqual(SESSION_MAX_SETS);
    }
  });

  it('has no error-severity validation issues', () => {
    const errors = program.validation.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('has exactly 5 training days', () => {
    expect(program.days).toHaveLength(5);
  });

  it('derives push-dominant upper split (3 upper + 2 lower days)', () => {
    // Chest/Shoulders/Triceps all emphasize → push-heavy; all lower maintain → fewer lower days
    expect(program.derivation.upperDays).toBe(3);
    expect(program.derivation.lowerDays).toBe(2);
    expect(program.derivation.pushScore).toBeGreaterThan(program.derivation.pullScore);
  });

  it('no day has more sets than exercises times 5 (sanity cap)', () => {
    for (const day of program.days) {
      expect(day.totalSets).toBeLessThanOrEqual(day.slots.length * 5);
    }
  });

  it('emphasized muscles receive direct work', () => {
    const weeklyDirect: Record<string, number> = {};
    for (const day of program.days) {
      for (const slot of day.slots) {
        weeklyDirect[slot.muscle] = (weeklyDirect[slot.muscle] ?? 0) + slot.sets;
      }
    }
    expect(weeklyDirect['Chest'] ?? 0).toBeGreaterThan(0);
    expect(weeklyDirect['Shoulders'] ?? 0).toBeGreaterThan(0);
    expect(weeklyDirect['Triceps'] ?? 0).toBeGreaterThan(0);
  });

  it('Primary slots appear before Accessory slots for the same muscle', () => {
    for (const day of program.days) {
      const muscleSlots = new Map<string, typeof day.slots>();
      for (const slot of day.slots) {
        const arr = muscleSlots.get(slot.muscle) ?? [];
        arr.push(slot);
        muscleSlots.set(slot.muscle, arr);
      }
      for (const [, slots] of muscleSlots) {
        const lastPrimaryOrder = Math.max(
          ...slots.filter((s) => s.role === 'Primary').map((s) => s.sortOrder),
          -1,
        );
        const firstAccessoryOrder = Math.min(
          ...slots.filter((s) => s.role === 'Accessory').map((s) => s.sortOrder),
          Infinity,
        );
        if (lastPrimaryOrder >= 0 && firstAccessoryOrder < Infinity) {
          expect(lastPrimaryOrder).toBeLessThan(firstAccessoryOrder);
        }
      }
    }
  });

  it('Triceps weekly effective sets reflect overlap from pressing', () => {
    const tricepsTarget = program.volumeTargets.find((t) => t.muscle === 'Triceps')!;
    // With heavy pressing, triceps should receive significant indirect stimulus
    expect(tricepsTarget.estimatedIndirectSets).toBeGreaterThan(4);
    // And therefore need fewer direct sets than raw 18-set target
    expect(tricepsTarget.directSetsNeeded).toBeLessThan(12);
  });

  it('Shoulders indirect sets account for chest pressing overlap', () => {
    const shouldersTarget = program.volumeTargets.find((t) => t.muscle === 'Shoulders')!;
    expect(shouldersTarget.estimatedIndirectSets).toBeGreaterThan(2);
  });

  it('prints program summary to console for manual inspection', () => {
    console.log('\n═══ 5-Day Hypertrophy Example ═══');
    console.log('Split:', program.splitType);
    console.log('Validation:', program.validation.valid ? '✓ PASS' : '✗ FAIL');
    for (const day of program.days) {
      console.log(`\n${day.trainingDay} — ${day.splitName} (${day.slots.length} exercises, ${day.totalSets} sets, ~${day.estimatedMinutes}min)`);
      for (const s of day.slots) {
        console.log(`  ${s.sortOrder + 1}. [${s.muscle}] ${s.role} — ${s.sets}×${s.repsMin}-${s.repsMax} @RIR${s.rir}`);
      }
    }
    console.log('\n── Weekly Effective Sets ──');
    const eff = program.validation.weeklyEffectiveSets;
    for (const t of program.volumeTargets) {
      const e = eff[t.muscle] ?? 0;
      console.log(`  ${t.muscle.padEnd(12)} ${e.toFixed(1).padStart(5)} eff  (target ${String(t.targetEffectiveSets).padStart(2)}, direct ${String(t.directSetsNeeded).padStart(2)}, ~${t.estimatedIndirectSets.toFixed(1)} indirect) [${t.priority}]`);
    }
    if (program.validation.issues.length > 0) {
      console.log('\n── Validation Issues ──');
      for (const i of program.validation.issues) {
        console.log(`  [${i.severity}] ${i.message}`);
      }
    }
    expect(true).toBe(true); // always passes — output is for inspection
  });
});

// ─── Lower body emphasis example ─────────────────────────────────────────────

const LOWER_EMPHASIS_CONFIG = {
  name: '5-Day Lower Emphasis',
  focus: 'hypertrophy' as const,
  daysPerWeek: 5,
  selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  musclePriorities: {
    Chest: 'maintain' as const,
    Back: 'maintain' as const,
    Shoulders: 'maintain' as const,
    Biceps: 'maintain' as const,
    Triceps: 'maintain' as const,
    Quads: 'emphasize' as const,
    Hamstrings: 'emphasize' as const,
    Glutes: 'emphasize' as const,
    Calves: 'maintain' as const,
    Abs: 'maintain' as const,
  },
  totalWeeks: 6,
  experienceLevel: 'intermediate' as const,
};

describe('buildProgram — 5-day lower body emphasis example', () => {
  const program = buildProgram(LOWER_EMPHASIS_CONFIG);

  it('returns valid: true', () => {
    expect(program.validation.valid).toBe(true);
  });

  it('allocates 3 lower days and 2 upper days', () => {
    expect(program.derivation.lowerDays).toBe(3);
    expect(program.derivation.upperDays).toBe(2);
  });

  it('uses LowerQuadFocus, LowerPosteriorChain and LowerGluteQuad session types', () => {
    const types = program.days.map((d) => d.sessionType);
    expect(types).toContain('LowerQuadFocus');
    expect(types).toContain('LowerPosteriorChain');
    expect(types).toContain('LowerGluteQuad');
  });

  it('lower days alternate with upper days (no back-to-back lower)', () => {
    const types = program.days.map((d) => d.sessionType);
    for (let i = 1; i < types.length; i++) {
      const prevIsLower = LOWER_SESSION_TYPES.includes(types[i - 1]);
      const currIsLower = LOWER_SESSION_TYPES.includes(types[i]);
      expect(prevIsLower && currIsLower).toBe(false);
    }
  });

  it(`never exceeds ${SESSION_MAX_EXERCISES} exercises per session`, () => {
    for (const day of program.days) {
      expect(day.slots.length).toBeLessThanOrEqual(SESSION_MAX_EXERCISES);
    }
  });

  it('never exceeds 24 sets per session', () => {
    for (const day of program.days) {
      expect(day.totalSets).toBeLessThanOrEqual(SESSION_MAX_SETS);
    }
  });

  it('Quads, Hamstrings, Glutes each receive direct work', () => {
    const weekly: Record<string, number> = {};
    for (const day of program.days) {
      for (const slot of day.slots) {
        weekly[slot.muscle] = (weekly[slot.muscle] ?? 0) + slot.sets;
      }
    }
    expect(weekly['Quads'] ?? 0).toBeGreaterThan(0);
    expect(weekly['Hamstrings'] ?? 0).toBeGreaterThan(0);
    expect(weekly['Glutes'] ?? 0).toBeGreaterThan(0);
  });

  it('lower muscles train across multiple sessions (≥ 2 each)', () => {
    const muscleSessionCount = new Map<string, number>();
    for (const day of program.days) {
      for (const slot of day.slots) {
        muscleSessionCount.set(slot.muscle, (muscleSessionCount.get(slot.muscle) ?? 0) + 1);
      }
    }
    // With freq=3 for emphasized muscles they should appear in ≥2 sessions
    expect(muscleSessionCount.get('Quads') ?? 0).toBeGreaterThanOrEqual(2);
    expect(muscleSessionCount.get('Hamstrings') ?? 0).toBeGreaterThanOrEqual(2);
    expect(muscleSessionCount.get('Glutes') ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('splitType contains lower-specialized session slugs', () => {
    expect(program.splitType).toContain('lower-quad');
  });

  it('no error-severity validation issues', () => {
    const errors = program.validation.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('prints program summary to console for manual inspection', () => {
    console.log('\n═══ 5-Day Lower Emphasis Example ═══');
    console.log('Split:', program.splitType);
    console.log('Derivation: upper=%d lower=%d (scores U=%d L=%d)',
      program.derivation.upperDays, program.derivation.lowerDays,
      program.derivation.upperScore, program.derivation.lowerScore,
    );
    console.log('Validation:', program.validation.valid ? '✓ PASS' : '✗ FAIL');
    for (const day of program.days) {
      console.log(`\n${day.trainingDay} — ${day.splitName} (${day.slots.length} exercises, ${day.totalSets} sets, ~${day.estimatedMinutes}min)`);
      for (const s of day.slots) {
        console.log(`  ${s.sortOrder + 1}. [${s.muscle}] ${s.role} — ${s.sets}×${s.repsMin}-${s.repsMax} @RIR${s.rir}`);
      }
    }
    console.log('\n── Weekly Effective Sets ──');
    const eff = program.validation.weeklyEffectiveSets;
    for (const t of program.volumeTargets) {
      const e = eff[t.muscle] ?? 0;
      console.log(`  ${t.muscle.padEnd(12)} ${e.toFixed(1).padStart(5)} eff  (target ${String(t.targetEffectiveSets).padStart(2)}, direct ${String(t.directSetsNeeded).padStart(2)}, ~${t.estimatedIndirectSets.toFixed(1)} indirect) [${t.priority}]`);
    }
    if (program.validation.issues.length > 0) {
      console.log('\n── Validation Issues ──');
      for (const i of program.validation.issues) {
        console.log(`  [${i.severity}] ${i.message}`);
      }
    }
    expect(true).toBe(true);
  });
});
