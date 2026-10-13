import { capSetsPerExercise, MAX_SETS_PER_EXERCISE, rampSets, rirForWeek } from '../../src/rules/volumeRamp';

describe('rirForWeek — HV-038 final-week floor', () => {
  it('does not reach 0 RIR before the final week of a long mesocycle', () => {
    const params = { totalTrainingWeeks: 6, isDeload: false, experienceLevel: 'intermediate' as const };
    expect(rirForWeek(2, 'grow', { ...params, weekNumber: 5 })).toBeGreaterThanOrEqual(1);
    expect(rirForWeek(2, 'grow', { ...params, weekNumber: 6 })).toBe(0);
  });

  it('retains the beginner RIR 2 floor', () => {
    expect(rirForWeek(2, 'grow', {
      weekNumber: 6,
      totalTrainingWeeks: 6,
      isDeload: false,
      experienceLevel: 'beginner',
    })).toBe(2);
  });
});

// HV-021/VA-015: one complete mesocycle checks the start, intermediate steps,
// peak, recovery adjustments, Week-1 floor, and final deload together.
describe('volume through a complete mesocycle', () => {
  it.each([
    { soreness: undefined, expected: [8, 10, 12, 14, 16, 6] },
    { soreness: 'Healed early', expected: [8, 10, 12, 14, 16, 6] },
    { soreness: 'Not sore', expected: [8, 10, 12, 14, 16, 6] },
    { soreness: 'Just in time', expected: [8, 8, 10, 12, 14, 6] },
    { soreness: 'Still sore', expected: [8, 9, 11, 13, 15, 6] },
  ] as const)('keeps volume appropriate for $soreness recovery', ({ soreness, expected }) => {
    const actual = Array.from({ length: 6 }, (_, index) => rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: index + 1, totalTrainingWeeks: 5, isDeload: index === 5 },
      soreness,
    ));
    expect(actual).toEqual(expected);
  });

  it('retains a working set when anchors round below one', () => {
    expect(rampSets({ week1: 0.2, peak: 0.4, deload: 0.1 },
      { weekNumber: 1, totalTrainingWeeks: 3, isDeload: false })).toBe(1);
  });

  it('uses peak volume for a one-training-week block', () => {
    expect(rampSets({ week1: 8, peak: 16, deload: 6 },
      { weekNumber: 1, totalTrainingWeeks: 1, isDeload: false })).toBe(16);
  });
});

// HV-023 — hard ceiling on sets prescribed to a single exercise, since a
// muscle's uncapped per-session ramp (e.g. rampSets peaking at 16+ for a
// high-MRV muscle) would otherwise concentrate entirely onto one movement
// whenever that's the only exercise trained for the muscle that session.
describe('capSetsPerExercise', () => {
  it('passes through values at or below the cap unchanged', () => {
    expect(capSetsPerExercise(1)).toBe(1);
    expect(capSetsPerExercise(MAX_SETS_PER_EXERCISE)).toBe(MAX_SETS_PER_EXERCISE);
  });

  it('caps values above the ceiling', () => {
    expect(capSetsPerExercise(MAX_SETS_PER_EXERCISE + 1)).toBe(MAX_SETS_PER_EXERCISE);
    expect(capSetsPerExercise(16)).toBe(MAX_SETS_PER_EXERCISE);
  });
});
