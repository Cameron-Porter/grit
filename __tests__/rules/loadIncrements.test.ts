import { recommendProgression, getLoadIncrementAmount } from '../../src/rules/progressionEngine';
import type { ProgressionContext, SlotPrescription, SessionPerformance } from '../../src/rules/progressionEngine';
import { loadIncrementFor, snapToEquipment } from '../../src/data/loadIncrements';
import { PROGRESSION_CATEGORY_PROFILES } from '../../src/data/exerciseProgressionProfiles';

const ctx = (overrides: Partial<ProgressionContext> = {}): ProgressionContext => ({
  experienceLevel: 'intermediate', isDeload: false, mesoWeek: 3, totalMesoWeeks: 5,
  musclePriority: 'grow', programFocus: 'hypertrophy', ...overrides,
});

// Topping the prescribed range is what earns a load increase, so these sessions
// represent "ready to move up" for every case below.
const toppedOut = (weight: number): SessionPerformance[] => [
  { date: '2026-01-08', sets: [{ weight, reps: 12 }, { weight, reps: 12 }, { weight, reps: 12 }] },
  { date: '2026-01-01', sets: [{ weight, reps: 10 }, { weight, reps: 10 }, { weight, reps: 10 }] },
];

const prescription = (equipment: string, weight: number): SlotPrescription => ({
  sets: 3, repsMin: 8, repsMax: 12, rir: 2, equipment,
  profile: PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound,
} as SlotPrescription);

describe('HV-041 equipment load increments', () => {
  it('knows what each kind of equipment can actually be set to', () => {
    expect(loadIncrementFor('Dumbbell')).toBe(5);
    expect(loadIncrementFor('Barbell')).toBe(5);
    expect(loadIncrementFor('Cable')).toBe(5);
    expect(loadIncrementFor('Machine')).toBe(10);
    // Bodyweight has no external load; the engine progresses reps instead.
    expect(loadIncrementFor('Bodyweight')).toBe(0);
    // An unknown or missing equipment string must not invent a finer step.
    expect(loadIncrementFor(null)).toBe(5);
    expect(loadIncrementFor('Freemotion')).toBe(5);
  });

  it('snaps a weight onto a step the equipment can reach', () => {
    expect(snapToEquipment(77.5, 'Dumbbell')).toBe(80);
    expect(snapToEquipment(73, 'Dumbbell')).toBe(75);
    expect(snapToEquipment(72, 'Dumbbell')).toBe(70);
    expect(snapToEquipment(77.5, 'Machine')).toBe(80);
    expect(snapToEquipment(77.5, 'Bodyweight')).toBe(77.5);
  });

  /**
   * The regression this rule exists for: the increment used to be sized from the
   * weight alone (2.5 lb below 100 lb), so a dumbbell exercise progressed onto
   * 77.5 lb - a dumbbell that exists in no gym. Asserted on the increment itself
   * rather than through a full recommendation, so it cannot be masked by any
   * branch that decides to hold load for an unrelated reason.
   */
  it('never sizes a jump smaller than the equipment can be set to', () => {
    for (const [equipment, step] of [['Dumbbell', 5], ['Barbell', 5], ['Cable', 5], ['Machine', 10]] as const) {
      for (const weight of [20, 40, 62.5, 75, 90, 100, 150, 200]) {
        for (const profile of [
          PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound,
          PROGRESSION_CATEGORY_PROFILES.heavy_compound,
          PROGRESSION_CATEGORY_PROFILES.machine_compound,
        ]) {
          const { amount } = getLoadIncrementAmount(weight, profile, equipment);
          expect(amount % step).toBe(0);
          expect(amount).toBeGreaterThanOrEqual(step);
        }
      }
    }
  });

  it('sizes a dumbbell jump in 5s where it used to use 2.5s', () => {
    const profile = PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound;
    // 75 lb x 3% = 2.25 lb, which the old weight-based granularity rounded to a
    // 2.5 lb jump and landed on 77.5.
    expect(getLoadIncrementAmount(75, profile, 'Dumbbell').amount).toBe(5);
    expect(getLoadIncrementAmount(75, profile, 'Machine').amount).toBe(10);
  });

  it('carries through to a real recommendation for dumbbells', () => {
    for (const weight of [30, 45, 50, 75, 90, 120]) {
      const result = recommendProgression(prescription('Dumbbell', weight), toppedOut(weight), ctx());
      expect(result.nextWeight % 5).toBe(0);
    }
  });

  it('still leaves bodyweight load untouched', () => {
    const result = recommendProgression(prescription('Bodyweight', 200), toppedOut(200), ctx());
    expect(result.nextWeight).toBe(200);
  });
});
