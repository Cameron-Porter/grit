import { describe, expect, it } from 'vitest';
import { calculatePlateLoading, STANDARD_PLATES } from './plate-calculator';

describe('calculatePlateLoading', () => {
  it('loads a standard 225lb bench with 45s only', () => {
    const result = calculatePlateLoading(225, 45, [45, 25, 10, 5, 2.5]);
    expect(result.weightPerSide).toBe(90);
    expect(result.plates).toEqual([{ weight: 45, count: 2 }]);
    expect(result.loadedWeight).toBe(225);
    expect(result.remainderPerSide).toBe(0);
    expect(result.totalRemainder).toBe(0);
    expect(result.belowBarWeight).toBe(false);
  });

  it('greedily mixes plate sizes for a per-side weight that needs more than one denomination', () => {
    // per side = (235 - 45) / 2 = 95 -> two 45s (90) + one 5
    const result = calculatePlateLoading(235, 45, [45, 25, 10, 5, 2.5]);
    expect(result.plates).toEqual([{ weight: 45, count: 2 }, { weight: 5, count: 1 }]);
    expect(result.loadedWeight).toBe(235);
    expect(result.remainderPerSide).toBe(0);
  });

  it('reports unloadable remainder when the available plates cannot hit the target exactly', () => {
    // per side = (203 - 45) / 2 = 79 -> 45 + 25 + 5 = 75, leaving 4/side unloadable (no 2.5s or 1.25s available)
    const result = calculatePlateLoading(203, 45, [45, 25, 10, 5]);
    expect(result.plates).toEqual([{ weight: 45, count: 1 }, { weight: 25, count: 1 }, { weight: 5, count: 1 }]);
    expect(result.remainderPerSide).toBe(4);
    expect(result.totalRemainder).toBe(8);
    expect(result.loadedWeight).toBe(195);
  });

  it('handles fractional plates without floating point drift', () => {
    // per side = (135.5 - 45) / 2 = 45.25 -> one 45, leaving 0.25/side (smallest plate is 1.25)
    const result = calculatePlateLoading(135.5, 45, STANDARD_PLATES);
    expect(result.weightPerSide).toBe(45.25);
    expect(result.plates).toEqual([{ weight: 45, count: 1 }]);
    expect(result.remainderPerSide).toBe(0.25);
    expect(result.totalRemainder).toBe(0.5);
    expect(result.loadedWeight).toBe(135);
  });

  it('flags targets at or below the bar weight instead of loading plates', () => {
    const below = calculatePlateLoading(30, 45, STANDARD_PLATES);
    expect(below.belowBarWeight).toBe(true);
    expect(below.plates).toEqual([]);
    expect(below.weightPerSide).toBe(0);
    expect(below.loadedWeight).toBe(45);

    const exact = calculatePlateLoading(45, 45, STANDARD_PLATES);
    expect(exact.belowBarWeight).toBe(false);
    expect(exact.plates).toEqual([]);
    expect(exact.loadedWeight).toBe(45);
  });

  it('reports full unloadable remainder when no plates are available', () => {
    const result = calculatePlateLoading(225, 45, []);
    expect(result.plates).toEqual([]);
    expect(result.weightPerSide).toBe(90);
    expect(result.remainderPerSide).toBe(90);
    expect(result.totalRemainder).toBe(180);
    expect(result.loadedWeight).toBe(45);
  });

  it('deduplicates and ignores non-positive plate sizes regardless of input order', () => {
    const result = calculatePlateLoading(225, 45, [10, 45, -10, 0, 45, 25, 10]);
    expect(result.plates).toEqual([{ weight: 45, count: 2 }]);
  });

  it('treats non-finite or negative weights as zero rather than throwing', () => {
    expect(calculatePlateLoading(Number.NaN, 45, STANDARD_PLATES).belowBarWeight).toBe(true);
    expect(calculatePlateLoading(-50, 45, STANDARD_PLATES).loadedWeight).toBe(45);
    expect(() => calculatePlateLoading(225, Number.NaN, STANDARD_PLATES)).not.toThrow();
  });
});
