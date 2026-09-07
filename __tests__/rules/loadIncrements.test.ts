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
          const { amount, equipmentLimited } = getLoadIncrementAmount(weight, profile, equipment);
          // Either the jump is a step the hardware can make, or it is gated to
          // zero because that step would be too large a share of the load.
          if (equipmentLimited) expect(amount).toBe(0);
          else { expect(amount % step).toBe(0); expect(amount).toBeGreaterThanOrEqual(step); }
        }
      }
    }
  });

  it('sizes a dumbbell jump in 5s where it used to use 2.5s', () => {
    const profile = PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound;
    // 75 lb x 3% = 2.25 lb, which the old weight-based granularity rounded to a
    // 2.5 lb jump and landed on 77.5.
    expect(getLoadIncrementAmount(75, profile, 'Dumbbell').amount).toBe(5);
    expect(getLoadIncrementAmount(100, profile, 'Machine').amount).toBe(10);
  });

  /**
   * HV-042. A 5 lb dumbbell step is 17% of a 30 lb dumbbell. The proportional
   * gate used to apply only to isolation/cable categories, so a dumbbell press
   * or row took that jump every time it topped the rep range - the "sometimes
   * far too aggressive" behaviour. RP progresses dumbbells every 2-3 weeks
   * precisely because their smallest step is proportionally large.
   */
  it('refuses a jump that is a large share of the current load, and allows it once it is not', () => {
    const profile = PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound;
    const light = getLoadIncrementAmount(30, profile, 'Dumbbell');
    expect(light.equipmentLimited).toBe(true);
    expect(light.amount).toBe(0);

    // The same 5 lb step is only 4% at 120 lb, so it goes ahead.
    const heavy = getLoadIncrementAmount(120, profile, 'Dumbbell');
    expect(heavy.equipmentLimited).toBe(false);
    expect(heavy.amount).toBe(5);
  });

  it('gates a machine stack pin that would be a huge share of a light setting', () => {
    const profile = PROGRESSION_CATEGORY_PROFILES.machine_compound;
    expect(getLoadIncrementAmount(30, profile, 'Machine').equipmentLimited).toBe(true);
    expect(getLoadIncrementAmount(200, profile, 'Machine').amount).toBe(10);
  });

  it('carries through to a real recommendation for dumbbells', () => {
    for (const weight of [75, 90, 120, 150]) {
      const result = recommendProgression(prescription('Dumbbell', weight), toppedOut(weight), ctx());
      expect(result.nextWeight % 5).toBe(0);
    }
  });

  it('still leaves bodyweight load untouched', () => {
    const result = recommendProgression(prescription('Bodyweight', 200), toppedOut(200), ctx());
    expect(result.nextWeight).toBe(200);
  });
});
