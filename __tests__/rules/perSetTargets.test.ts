import { perSetRepTargets, everySetAtCeiling } from '../../src/rules/perSetTargets';

describe('HV-045 per-set rep targets', () => {
  /** The shape observed in RP: total reps creep up one set at a time. */
  it('adds the rep to the trailing set once every set is level', () => {
    expect(perSetRepTargets([12, 12, 12], 3, 15, 8)).toEqual([12, 12, 13]);
    expect(perSetRepTargets([12, 12, 13], 3, 15, 8)).toEqual([12, 13, 13]);
    expect(perSetRepTargets([12, 13, 13], 3, 15, 8)).toEqual([13, 13, 13]);
  });

  /**
   * The complaint this fixes: after 11, 12, 12 the lifter was told "aim for 12"
   * - a number two sets already hit - with no cue that set one is the laggard.
   */
  it('brings the weakest set up first so uneven sets converge', () => {
    expect(perSetRepTargets([11, 12, 12], 3, 12, 8)).toEqual([12, 12, 12]);
    expect(perSetRepTargets([12, 11, 12], 3, 12, 8)).toEqual([12, 12, 12]);
    expect(perSetRepTargets([10, 11, 12], 3, 15, 8)).toEqual([11, 11, 12]);
  });

  it('breaks a tie toward the last of the tied sets', () => {
    // Both leading sets sit at 11; raising the later one keeps the shape ascending.
    expect(perSetRepTargets([11, 11, 12], 3, 15, 8)).toEqual([11, 12, 12]);
  });

  it('adds nothing once every set is at the ceiling, so load moves instead', () => {
    expect(perSetRepTargets([12, 12, 12], 3, 12, 8)).toEqual([12, 12, 12]);
    expect(everySetAtCeiling([12, 12, 12], 3, 12)).toBe(true);
    expect(everySetAtCeiling([11, 12, 12], 3, 12)).toBe(false);
  });

  it('never targets above the ceiling', () => {
    expect(perSetRepTargets([14, 15, 15], 3, 15, 8)).toEqual([15, 15, 15]);
    expect(perSetRepTargets([20, 20, 20], 3, 15, 8)).toEqual([15, 15, 15]);
  });

  it('starts a newly added set at the rep floor rather than inventing history', () => {
    // Three sets last time, four prescribed now.
    expect(perSetRepTargets([12, 12, 12], 4, 15, 8)).toEqual([12, 12, 12, 9]);
  });

  it('handles an exercise with no history at all', () => {
    expect(perSetRepTargets([], 3, 12, 8)).toEqual([8, 8, 9]);
    expect(perSetRepTargets([], 0, 12, 8)).toEqual([]);
    expect(everySetAtCeiling([], 3, 12)).toBe(false);
  });

  it('ignores unusable logged values instead of propagating them', () => {
    expect(perSetRepTargets([0, 12, 12], 3, 15, 8)).toEqual([9, 12, 12]);
  });
});
