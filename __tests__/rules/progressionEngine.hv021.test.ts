import { recommendProgression } from '../../src/rules/progressionEngine';
import type { ProgressionContext, SlotPrescription, SessionPerformance } from '../../src/rules/progressionEngine';

function makeCtx(overrides: Partial<ProgressionContext> = {}): ProgressionContext {
  return {
    experienceLevel: 'intermediate',
    isDeload: false,
    mesoWeek: 3,
    totalMesoWeeks: 5,
    musclePriority: 'grow',
    programFocus: 'hypertrophy',
    ...overrides,
  };
}

function makePrescription(overrides: Partial<SlotPrescription> = {}): SlotPrescription {
  return { sets: 3, repsMin: 8, repsMax: 12, rir: 2, ...overrides };
}

const oneSession: SessionPerformance[] = [{ date: '2026-01-01', sets: [{ weight: 100, reps: 10 }] }];

describe('recommendProgression — HV-021 hypertrophyVolumeOverride', () => {
  it('training week: the override wins outright over the emphasize weekBonus formula', () => {
    // emphasize weekBonus alone would give 3 + (mesoWeek-1=2) = 5 — the override must win.
    const rec = recommendProgression(
      makePrescription({ sets: 3 }),
      oneSession,
      makeCtx({ musclePriority: 'emphasize', hypertrophyVolumeOverride: { trainingSets: 9, deloadSets: 4 } }),
    );
    expect(rec.nextSets).toBe(9);
  });

  it('training week: the override wins outright over the flat grow/maintain hold', () => {
    // grow would normally hold at prescription.sets (3) — the override must still win.
    const rec = recommendProgression(
      makePrescription({ sets: 3 }),
      oneSession,
      makeCtx({ musclePriority: 'grow', hypertrophyVolumeOverride: { trainingSets: 11, deloadSets: 4 } }),
    );
    expect(rec.nextSets).toBe(11);
  });

  it('deload week: nextSets is the override\'s deloadSets, not 50% of the template', () => {
    const rec = recommendProgression(
      makePrescription({ sets: 10 }),
      oneSession,
      makeCtx({ isDeload: true, hypertrophyVolumeOverride: { trainingSets: 16, deloadSets: 4 } }),
    );
    // Old formula would give ceil(10*0.5)=5 — the override (4) must win.
    expect(rec.nextSets).toBe(4);
  });

  it('falls back to the original emphasize weekBonus formula when no override is present', () => {
    const rec = recommendProgression(
      makePrescription({ sets: 3 }),
      oneSession,
      makeCtx({ musclePriority: 'emphasize', mesoWeek: 3, hypertrophyVolumeOverride: undefined }),
    );
    expect(rec.nextSets).toBe(3 + 2); // baseSetCount + (mesoWeek - 1)
  });

  it('falls back to the original flat-hold formula for grow when no override is present', () => {
    const rec = recommendProgression(
      makePrescription({ sets: 3 }),
      oneSession,
      makeCtx({ musclePriority: 'grow', hypertrophyVolumeOverride: undefined }),
    );
    expect(rec.nextSets).toBe(3);
  });

  it('ignores the override for non-hypertrophy focus, even if one is somehow passed', () => {
    const rec = recommendProgression(
      makePrescription({ sets: 3 }),
      oneSession,
      makeCtx({
        programFocus: 'powerbuilding',
        musclePriority: 'grow',
        hypertrophyVolumeOverride: { trainingSets: 99, deloadSets: 99 },
      }),
    );
    expect(rec.nextSets).toBe(3);
  });

  it('does not affect strength-focus deload, which has its own protocol regardless of the override', () => {
    const rec = recommendProgression(
      makePrescription({ sets: 5 }),
      oneSession,
      makeCtx({
        programFocus: 'strength',
        isDeload: true,
        hypertrophyVolumeOverride: { trainingSets: 99, deloadSets: 1 },
      }),
    );
    // ST-004: strength deload holds sets at the template value, load drops instead.
    expect(rec.nextSets).toBe(5);
  });
});
