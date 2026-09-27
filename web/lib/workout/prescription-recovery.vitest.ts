import { describe, expect, it } from 'vitest';
import { recommendProgression } from '@grit/rules/progressionEngine';
import { resolveExercisePrescription } from './prescription';
import { recoverMissingTarget } from './recovery-target';

const exercise = {
  exercise_name: 'Overhead Tricep Extension (Dumbbell)', muscle_group: 'Triceps',
  equipment: 'Dumbbell', target_sets: 3, target_reps_min: 8, target_reps_max: 12,
  target_weight: 0, rir: 2, role: 'Accessory',
};
const sessions = [{ date: '2026-09-24', sets: Array.from({ length: 3 }, () => ({ weight: 20, reps: 5, rir: 2 })) }];
const context = { experienceLevel: 'intermediate' as const, week: 2, totalWeeks: 5, focus: 'hypertrophy' as const };

describe('below-floor progression targets on the next workout', () => {
  it('renders a recovered next-rep goal without changing the engine recommendation', () => {
    const target = recoverMissingTarget(exercise, sessions, context);
    // ST-007 deliberately asks for one more rep, not an immediate jump to 8.
    expect(target).toMatchObject({ target_reps_min: 8, target_reps_max: 6, target_weight: 20 });
    expect(resolveExercisePrescription(exercise, target, 'grow')).toMatchObject({ repsMin: 6, repsMax: 6, weight: 20, sets: 3 });
  });

  it('also reads a previously persisted below-floor target without crashing', () => {
    const recommendation = recommendProgression({ sets: 3, repsMin: 8, repsMax: 12, rir: 2, equipment: 'Dumbbell' }, sessions,
      { experienceLevel: 'intermediate', mesoWeek: 2, totalMesoWeeks: 5, isDeload: false, programFocus: 'hypertrophy' });
    const persisted = { target_sets: recommendation.nextSets, target_reps_min: recommendation.nextRepsMin,
      target_reps_max: recommendation.nextRepsMax, target_weight: recommendation.nextWeight, rir: recommendation.nextRir };
    expect(resolveExercisePrescription(exercise, persisted, 'grow')).toMatchObject({ repsMin: 6, repsMax: 6, weight: 20 });
    expect(persisted.target_reps_min).toBe(8);
  });

  it('still rejects an inverted template rather than hiding bad source data', () => {
    expect(() => resolveExercisePrescription({ ...exercise, target_reps_min: 12, target_reps_max: 8 }, undefined, null)).toThrow('invalid');
  });

  it.each([0, -1, 1.5, NaN])('still rejects an invalid generated rep goal %s', (reps) => {
    expect(() => resolveExercisePrescription(exercise, { ...exercise, target_reps_max: reps }, null)).toThrow();
  });
});
