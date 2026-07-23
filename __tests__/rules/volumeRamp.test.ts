import { rampSets } from '../../src/rules/volumeRamp';

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
