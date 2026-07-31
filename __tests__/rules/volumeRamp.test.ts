import { capSetsPerExercise, MAX_SETS_PER_EXERCISE, rampSets } from '../../src/rules/volumeRamp';

describe('rampSets', () => {
  it('returns the week1 anchor at the start of the meso', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 1, totalTrainingWeeks: 5, isDeload: false },
    );
    expect(sets).toBe(8);
  });

  it('returns the peak anchor on the final training week', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 5, totalTrainingWeeks: 5, isDeload: false },
    );
    expect(sets).toBe(16);
  });

  it('interpolates linearly between week1 and peak mid-meso', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 3, totalTrainingWeeks: 5, isDeload: false },
    );
    // fraction = (3-1)/(5-1) = 0.5 -> 8 + (16-8)*0.5 = 12
    expect(sets).toBe(12);
  });

  it('returns the deload anchor on deload weeks, ignoring position', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 6, totalTrainingWeeks: 5, isDeload: true },
    );
    expect(sets).toBe(6);
  });

  it('never returns fewer than 1 set even for a very low anchor', () => {
    const sets = rampSets(
      { week1: 0.2, peak: 0.4, deload: 0.1 },
      { weekNumber: 1, totalTrainingWeeks: 3, isDeload: false },
    );
    expect(sets).toBeGreaterThanOrEqual(1);
  });

  it('treats a single-training-week meso as always at peak', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 1, totalTrainingWeeks: 1, isDeload: false },
    );
    expect(sets).toBe(16);
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
