import { describe, expect, it } from 'vitest';
import { getProgressionProfile } from '../../src/data/exerciseProgressionProfiles';
import { recommendInitialMesocycleTarget, recommendProgression, type ProgressionContext } from '../../src/rules/progressionEngine';

const context: ProgressionContext = { experienceLevel: 'intermediate', isDeload: false, mesoWeek: 3, totalMesoWeeks: 5, programFocus: 'hypertrophy' };
describe('live bodyweight catalog profiles', () => {
  it.each(['Push-Up', 'Sit-Up', 'Dips', 'Bench Dips'])('%s progresses beyond twelve without requiring a local catalog fixture', name => {
    const profile = getProgressionProfile(undefined, { name, equipment: 'Bodyweight' });
    const prescription = { sets: 3, repsMin: 8, repsMax: 12, rir: 2, equipment: 'Bodyweight', profile };
    const sessions = [{ date: '2026-10-01', sets: Array.from({ length: 3 }, () => ({ weight: 206, reps: 20, rir: 2 })) }];
    const rec = recommendProgression(prescription, sessions, context);
    expect(profile.category).toBe('bodyweight');
    expect(profile.bodyweightRepCeiling).toBe(30);
    expect(rec).toMatchObject({ nextWeight: 206, nextRepsMax: 21, decisionCode: 'bodyweight_rep_progression' });
  });
  it.each(['Pull-Up', 'Pull-Up (Wide Grip)', 'Pullups', 'Chin-Up (Close Grip)'])('%s uses the lower pull-up difficulty ceiling', name => {
    const profile = getProgressionProfile(undefined, { name, equipment: 'Bodyweight' });
    const prescription = { sets: 3, repsMin: 8, repsMax: 12, rir: 2, equipment: 'Bodyweight', profile };
    const sessions = [{ date: '2026-10-01', sets: Array.from({ length: 3 }, () => ({ weight: 0, reps: 15, rir: 2 })) }];
    expect(recommendProgression(prescription, sessions, context)).toMatchObject({ nextRepsMax: 15, decisionCode: 'bodyweight_difficulty_progression' });
    expect(recommendInitialMesocycleTarget(prescription, sessions).repsMax).toBe(15);
  });
  it('does not apply the bodyweight cap to loaded catalog equipment', () => {
    expect(getProgressionProfile(undefined, { name: 'Pull-Up', equipment: 'Machine' }).category).not.toBe('bodyweight');
  });
});

describe('HV-023 automatic exercise set cap', () => {
  const prescription = { sets: 12, repsMin: 8, repsMax: 12, rir: 2 };
  const sessions = [{ date: '2026-10-01', sets: Array.from({ length: 12 }, () => ({ weight: 100, reps: 10, rir: 2 })) }];
  it.each([
    {}, { musclePriority: 'emphasize' }, { programFocus: 'general', musclePriority: 'emphasize' },
    { programFocus: 'maintenance' }, { isDeload: true }, { isDeload: true, programFocus: 'strength' },
    { consecutiveStillSoreCount: 2, soreness: 'Still sore' },
    { hypertrophyVolumeOverride: { trainingSets: 12, deloadSets: 8 } },
  ] as Partial<ProgressionContext>[])('caps each recommendation path: %j', overrides => {
    const rec = recommendProgression(prescription, sessions, { ...context, ...overrides });
    expect(rec.nextSets).toBeLessThanOrEqual(4);
    expect(rec.nextSets).toBeGreaterThan(0);
  });
  it('caps new-block seeds and first sessions too', () => {
    expect(recommendInitialMesocycleTarget(prescription, sessions).sets).toBe(4);
    expect(recommendInitialMesocycleTarget(prescription, []).sets).toBe(4);
    expect(recommendProgression(prescription, [], context).nextSets).toBe(4);
  });
  it('does not penalize reps for a fifth set that will never be prescribed', () => {
    const rec = recommendProgression({ ...prescription, sets: 4 }, [{ ...sessions[0], sets: sessions[0].sets.slice(0,4) }], { ...context, hypertrophyVolumeOverride: { trainingSets: 5, deloadSets: 2 } });
    expect(rec.evidence).toMatchObject({ effectiveSets: 4, previousSets: 4, effectiveRepCeiling: 12, volumeHoldsLoad: false });
  });
});
