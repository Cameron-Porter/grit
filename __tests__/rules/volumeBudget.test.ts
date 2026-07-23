import { calculateVolumeBudget } from '../../src/rules/volumeBudget';

describe('calculateVolumeBudget — VA-011 per-muscle hypertrophy targets', () => {
  it('mev priority targets the muscle\'s own MEV landmark, not a flat number', () => {
    // Chest MEV=8, Back MEV=10 (volumeLandmarks.ts) — previously both got a
    // flat "4" regardless of muscle.
    const [chest] = calculateVolumeBudget('hypertrophy', {}, ['Chest'], []);
    const [back] = calculateVolumeBudget('hypertrophy', {}, ['Back'], []);
    expect(chest.targetEffectiveSets).toBe(8);
    expect(back.targetEffectiveSets).toBe(10);
  });

  it('maintain priority targets the muscle\'s own MV (Maintenance Volume) landmark', () => {
    // "maintain" should literally mean MV — Chest MV=6, Glutes MV=4.
    const [chest] = calculateVolumeBudget('hypertrophy', { Chest: 'maintain' }, ['Chest'], []);
    const [glutes] = calculateVolumeBudget('hypertrophy', { Glutes: 'maintain' }, ['Glutes'], []);
    expect(chest.targetEffectiveSets).toBe(6);
    expect(glutes.targetEffectiveSets).toBe(4);
  });

  it('grow priority targets the muscle\'s own MAV (the sweet spot), differing by muscle', () => {
    // This is the key differentiator: two muscles at the same priority tier
    // must now produce different set counts, proportional to their own MAV —
    // previously both would hit the same flat "12" regardless of muscle.
    const [chest] = calculateVolumeBudget('hypertrophy', { Chest: 'grow' }, ['Chest'], []);
    const [hamstrings] = calculateVolumeBudget('hypertrophy', { Hamstrings: 'grow' }, ['Hamstrings'], []);
    expect(chest.targetEffectiveSets).toBe(16);
    expect(hamstrings.targetEffectiveSets).toBe(12);
    expect(chest.targetEffectiveSets).not.toBe(hamstrings.targetEffectiveSets);
  });

  it('emphasize priority targets the muscle\'s own MRV — the overreach ceiling', () => {
    const [forearms] = calculateVolumeBudget('hypertrophy', { Forearms: 'emphasize' }, ['Forearms'], []);
    const [back] = calculateVolumeBudget('hypertrophy', { Back: 'emphasize' }, ['Back'], []);
    expect(forearms.targetEffectiveSets).toBe(16);
    expect(back.targetEffectiveSets).toBe(25);
    expect(forearms.directSetsNeeded).toBe(16);
  });

  it('non-hypertrophy focus keeps the flat TARGET_EFFECTIVE_SETS table regardless of landmark', () => {
    // Scope containment — strength/powerbuilding are cited to Prilepin/Kizen,
    // not RP/Israetel, so the landmark mapping must not leak into them.
    const [chest] = calculateVolumeBudget('strength', { Chest: 'grow' }, ['Chest'], []);
    const [hamstrings] = calculateVolumeBudget('strength', { Hamstrings: 'grow' }, ['Hamstrings'], []);
    expect(chest.targetEffectiveSets).toBe(8);
    expect(hamstrings.targetEffectiveSets).toBe(8);
  });
});

describe('calculateVolumeBudget — VA-010 MRV backstop', () => {
  it('hypertrophy/emphasize is bounded by MRV by construction (VA-011), with VA-010 as a no-op backstop', () => {
    const [result] = calculateVolumeBudget('hypertrophy', { Forearms: 'emphasize' }, ['Forearms'], []);
    expect(result.directSetsNeeded).toBe(16);
    expect(result.weeklySets).toBe(16);
  });

  it('leaves the target untouched when it is well under the MRV landmark', () => {
    const [result] = calculateVolumeBudget('hypertrophy', {}, ['Chest'], []);
    expect(result.directSetsNeeded).toBe(8);
  });
});
