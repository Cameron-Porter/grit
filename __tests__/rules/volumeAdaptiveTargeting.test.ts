import { buildProgram } from '../../src/rules/programBuilder';
import { SESSION_MAX_EXERCISES, SESSION_MAX_SETS } from '../../src/rules/sessionTrimmer';
import { DayPlan } from '../../src/types/program';

function weeklyMuscleSets(days: DayPlan[], muscle: string): number {
  return days.reduce(
    (sum, day) => sum + day.slots.filter((s) => s.muscle === muscle).reduce((s2, sl) => s2 + sl.sets, 0),
    0,
  );
}

// HV-021 / VA-011: per-muscle MV/MEV/MAV/MRV landmarks (RP Strength / Israetel
// et al.) should drive actual generated set counts for hypertrophy focus, not
// just an intermediate calculation — proving the two previously-disconnected
// volume systems (session-frequency planning vs. per-slot set counts) are
// unified. These tests fail against the pre-HV-021 code (flat SLOT_ROLE_CONFIGS
// numbers, identical for every muscle) and pass after.

const BASE_CONFIG = {
  name: 'HV-021 differentiation test',
  focus: 'hypertrophy' as const,
  daysPerWeek: 5,
  selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  totalWeeks: 5,
  experienceLevel: 'intermediate' as const,
};

describe('buildProgram — HV-021 per-muscle landmark-driven set counts', () => {
  it('two "grow" muscles with different MAV land on different weekly set totals', () => {
    // Chest MAV=16, Hamstrings MAV=12 (volumeLandmarks.ts) — previously both
    // "grow" muscles would land on the same flat 12 sets/week regardless.
    const program = buildProgram({
      ...BASE_CONFIG,
      musclePriorities: {
        Chest: 'grow', Hamstrings: 'grow',
        Back: 'maintain', Shoulders: 'maintain', Biceps: 'maintain', Triceps: 'maintain',
        Quads: 'maintain', Glutes: 'maintain', Calves: 'maintain', Abs: 'maintain',
      },
    });

    const finalTrainingWeek = program.weeks[program.weeks.length - 2].days;
    const chestSets = weeklyMuscleSets(finalTrainingWeek, 'Chest');
    const hamstringsSets = weeklyMuscleSets(finalTrainingWeek, 'Hamstrings');

    expect(chestSets).not.toBe(hamstringsSets);
    expect(chestSets).toBeGreaterThan(hamstringsSets);
  });

  it('final training week volume exceeds Week 1 for a "grow" muscle (MEV → MAV ramp)', () => {
    const program = buildProgram({
      ...BASE_CONFIG,
      musclePriorities: {
        Chest: 'grow',
        Back: 'maintain', Shoulders: 'maintain', Biceps: 'maintain', Triceps: 'maintain',
        Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain', Calves: 'maintain', Abs: 'maintain',
      },
    });

    const week1Sets = weeklyMuscleSets(program.weeks[0].days, 'Chest');
    const finalWeekSets = weeklyMuscleSets(program.weeks[program.weeks.length - 2].days, 'Chest');

    expect(week1Sets).toBeLessThan(finalWeekSets);
  });

  it('deload week drops to roughly MV, below both Week 1 and the final training week', () => {
    const program = buildProgram({
      ...BASE_CONFIG,
      musclePriorities: {
        Chest: 'emphasize',
        Back: 'maintain', Shoulders: 'maintain', Biceps: 'maintain', Triceps: 'maintain',
        Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain', Calves: 'maintain', Abs: 'maintain',
      },
    });

    const deloadWeek = program.weeks[program.weeks.length - 1];
    expect(deloadWeek.isDeload).toBe(true);

    const week1Sets = weeklyMuscleSets(program.weeks[0].days, 'Chest');
    const finalWeekSets = weeklyMuscleSets(program.weeks[program.weeks.length - 2].days, 'Chest');
    const deloadSets = weeklyMuscleSets(deloadWeek.days, 'Chest');

    expect(deloadSets).toBeLessThan(finalWeekSets);
    expect(deloadSets).toBeLessThanOrEqual(week1Sets);
  });

  it('non-hypertrophy focus is unaffected — Primary emphasize sets stay at the flat ST-001/PB-001 values regardless of muscle', () => {
    const strength = buildProgram({
      ...BASE_CONFIG,
      focus: 'strength',
      musclePriorities: {
        Chest: 'emphasize', Back: 'emphasize',
        Shoulders: 'maintain', Biceps: 'maintain', Triceps: 'maintain',
        Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain', Calves: 'maintain', Abs: 'maintain',
      },
    });

    const finalTrainingWeek = strength.weeks[strength.weeks.length - 2].days;
    const primarySets = (muscle: string) =>
      finalTrainingWeek
        .flatMap((d) => d.slots)
        .filter((s) => s.muscle === muscle && s.role === 'Primary')
        .map((s) => s.sets);

    // ST-001: Primary emphasize = 5 sets, identical for every muscle — landmark
    // data (Chest MRV=22 vs Back MRV=25) must not leak into strength focus.
    for (const sets of [...primarySets('Chest'), ...primarySets('Back')]) {
      expect(sets).toBe(5);
    }
  });

  it('several high-MAV muscles emphasized together still respect session caps', () => {
    // Chest (MAV 16), Back (MAV 18), Quads (MAV 16) all "emphasize" at once —
    // the highest-volume-per-muscle scenario this change introduces.
    const program = buildProgram({
      ...BASE_CONFIG,
      musclePriorities: {
        Chest: 'emphasize', Back: 'emphasize', Quads: 'emphasize',
        Shoulders: 'grow', Biceps: 'grow', Triceps: 'grow',
        Hamstrings: 'grow', Glutes: 'grow', Calves: 'maintain', Abs: 'maintain',
      },
    });

    for (const week of program.weeks) {
      for (const day of week.days) {
        expect(day.slots.length).toBeLessThanOrEqual(SESSION_MAX_EXERCISES);
        expect(day.totalSets).toBeLessThanOrEqual(SESSION_MAX_SETS);
      }
    }
    expect(program.validation.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});
