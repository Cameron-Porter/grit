import { describe, expect, it } from 'vitest';
import { recommendInitialMesocycleTarget, recommendProgression } from '../../src/rules/progressionEngine';
import { PROGRESSION_CATEGORY_PROFILES } from '../../src/data/exerciseProgressionProfiles';
import { perSetRepTargets } from '../../src/rules/perSetTargets';

const prescription = { sets: 3, repsMin: 8, repsMax: 12, rir: 4, equipment: 'Bodyweight', profile: PROGRESSION_CATEGORY_PROFILES.bodyweight };
const sessions = [{ date: '2026-09-28', sets: Array.from({ length: 4 }, () => ({ weight: 206, reps: 20, rir: 4 })) }];
describe('bodyweight reps survive a static template band', () => {
  it('seeds demonstrated reps without copying the previous set count or adding load', () => {
    const seed = recommendInitialMesocycleTarget(prescription, sessions);
    expect(seed).toMatchObject({ sets: 3, repsMin: 20, repsMax: 20, weight: 0, rir: 4 });
    expect(perSetRepTargets([20,20,20,20], 3, seed.repsMax, seed.repsMin)).toEqual([20,20,20]);
  });
  it('keeps the exercise-specific difficulty ceiling when seeding', () => {
    const seed = recommendInitialMesocycleTarget({ ...prescription, profile: { ...prescription.profile, bodyweightRepCeiling: 15 } }, sessions);
    expect(seed.repsMax).toBe(15);
  });
  it('does not reset demonstrated reps to 12 when an effort gate holds load', () => {
    const rec = recommendProgression(prescription, [{ ...sessions[0], sets: sessions[0].sets.map(set => ({ ...set, rir: 0 })) }], { experienceLevel: 'intermediate', isDeload: false, mesoWeek: 2, totalMesoWeeks: 5, programFocus: 'hypertrophy' });
    expect(rec.nextWeight).toBe(206);
    expect(rec.nextRepsMax).toBe(20);
    expect(rec.evidence.effectiveRepCeiling).toBe(20);
  });
  it('continues to reduce targets for a scheduled deload', () => {
    const rec = recommendProgression(prescription, sessions, { experienceLevel: 'intermediate', isDeload: true, mesoWeek: 5, totalMesoWeeks: 5, programFocus: 'hypertrophy' });
    expect(rec.action).toBe('DELOAD');
    expect(rec.nextRepsMax).toBeLessThan(20);
    expect(rec.nextWeight).toBe(206);
  });
});
