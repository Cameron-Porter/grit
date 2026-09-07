import { recommendProgression } from '../../src/rules/progressionEngine';
import type { ProgressionContext, SlotPrescription, SessionPerformance } from '../../src/rules/progressionEngine';
import { PROGRESSION_CATEGORY_PROFILES } from '../../src/data/exerciseProgressionProfiles';

const ctx = (o: Partial<ProgressionContext> = {}): ProgressionContext => ({
  experienceLevel: 'advanced', isDeload: false, mesoWeek: 3, totalMesoWeeks: 5,
  musclePriority: 'grow', programFocus: 'hypertrophy', ...o,
});
const prescription = { sets: 3, repsMin: 8, repsMax: 12, rir: 2, equipment: 'Barbell',
  profile: PROGRESSION_CATEGORY_PROFILES.hypertrophy_compound } as SlotPrescription;

// Genuinely improving into the ceiling - 10 reps, then 12 - so nothing here is
// a plateau; the only variable is what effort was reported.
const improving = (rir?: number): SessionPerformance[] => [
  { date: '2026-01-08', sets: [1, 2, 3].map(() => rir === undefined ? { weight: 135, reps: 12 } : { weight: 135, reps: 12, rir }) },
  { date: '2026-01-01', sets: [1, 2, 3].map(() => rir === undefined ? { weight: 135, reps: 10 } : { weight: 135, reps: 10, rir }) },
];

describe('HV-044 effort gate', () => {
  /**
   * The regression: RIR reporting is optional in the UI, and skipping it froze
   * an intermediate/advanced lifter at the same weight and reps. They were told
   * to aim for the ceiling they had just hit, so the next session was identical
   * - and three identical sessions trip plateau detection, which deloads them
   * ~22% for failing to progress in a way the engine itself prevented.
   */
  it('advances a lifter who earned it, whatever their experience level, when no RIR was reported', () => {
    for (const experienceLevel of ['beginner', 'intermediate', 'advanced'] as const) {
      const rec = recommendProgression(prescription, improving(), ctx({ experienceLevel }));
      expect(rec.action).toBe('ADVANCE_LOAD');
      expect(rec.nextWeight).toBeGreaterThan(135);
    }
  });

  it('does not leave an advanced lifter behind a beginner on identical history', () => {
    const advanced = recommendProgression(prescription, improving(), ctx({ experienceLevel: 'advanced' }));
    const beginner = recommendProgression(prescription, improving(), ctx({ experienceLevel: 'beginner' }));
    expect(advanced.nextWeight).toBe(beginner.nextWeight);
    expect(advanced.action).toBe(beginner.action);
  });

  it('still holds on positive evidence the session was already too hard', () => {
    const rec = recommendProgression(prescription, improving(0), ctx());
    expect(rec.action).toBe('HOLD');
    expect(rec.nextWeight).toBe(135);
  });

  it('advances when reported effort met the prescribed reserve', () => {
    expect(recommendProgression(prescription, improving(3), ctx()).action).toBe('ADVANCE_LOAD');
  });

  it('uses the reported sets when only some were reported, rather than discarding them', () => {
    const someReported: SessionPerformance[] = [
      { date: '2026-01-08', sets: [{ weight: 135, reps: 12, rir: 3 }, { weight: 135, reps: 12 }, { weight: 135, reps: 12, rir: 3 }] },
      improving(3)[1],
    ];
    expect(recommendProgression(prescription, someReported, ctx()).action).toBe('ADVANCE_LOAD');

    const oneOverReached: SessionPerformance[] = [
      { date: '2026-01-08', sets: [{ weight: 135, reps: 12, rir: 3 }, { weight: 135, reps: 12 }, { weight: 135, reps: 12, rir: 0 }] },
      improving(3)[1],
    ];
    expect(recommendProgression(prescription, oneOverReached, ctx()).action).toBe('HOLD');
  });

  it('explains an effort hold instead of restating the rep target just achieved', () => {
    const rec = recommendProgression(prescription, improving(0), ctx());
    expect(rec.reason).toMatch(/RIR/);
    // The old text told you to aim for the number you had just hit.
    expect(rec.reason).not.toMatch(/Aim for 12 next session/);
  });
});
