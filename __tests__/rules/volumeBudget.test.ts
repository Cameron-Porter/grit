import { calculateVolumeBudget } from '../../src/rules/volumeBudget';

describe('calculateVolumeBudget — VA-010 MRV cap', () => {
  it('caps weekly direct sets at the muscle MRV landmark when the raw target exceeds it', () => {
    // hypertrophy/emphasize targets 18 sets/week, but Forearms' MRV landmark
    // (volumeLandmarks.ts) is 16 — without the cap this would return 18.
    const [result] = calculateVolumeBudget(
      'hypertrophy',
      { Forearms: 'emphasize' },
      ['Forearms'],
      [],
    );
    expect(result.directSetsNeeded).toBe(16);
    expect(result.weeklySets).toBe(16);
  });

  it('leaves the target untouched when it is well under the MRV landmark', () => {
    // hypertrophy/mev for Chest targets 4 sets/week; Chest's MRV is 22, so the
    // cap should never engage here.
    const [result] = calculateVolumeBudget(
      'hypertrophy',
      {},
      ['Chest'],
      [],
    );
    expect(result.directSetsNeeded).toBe(4);
  });
});
