import { estimateOneRepMax } from '../oneRepMax';

describe('estimateOneRepMax', () => {
  it('applies the Epley formula, rounded to a whole number', () => {
    // 185 * (1 + 8/30) = 234.33...
    expect(estimateOneRepMax(185, 8)).toBe(234);
  });

  it('returns the weight directly for a 1-rep set', () => {
    expect(estimateOneRepMax(315, 1)).toBe(315);
  });

  it('returns 0 for non-positive weight or reps', () => {
    expect(estimateOneRepMax(0, 8)).toBe(0);
    expect(estimateOneRepMax(185, 0)).toBe(0);
    expect(estimateOneRepMax(-10, 8)).toBe(0);
  });

  it('returns 0 for bodyweight exercises regardless of weight/reps', () => {
    // "weight" here is the user's bodyweight, not an external load —
    // an Epley 1RM off that number is meaningless.
    expect(estimateOneRepMax(180, 10, 'Bodyweight')).toBe(0);
    expect(estimateOneRepMax(180, 1, 'Bodyweight')).toBe(0);
  });

  it('still computes normally for loaded equipment', () => {
    expect(estimateOneRepMax(185, 8, 'Barbell')).toBe(234);
  });
});
