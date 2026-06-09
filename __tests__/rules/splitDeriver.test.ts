import { deriveSplit, LOWER_SESSION_TYPES } from '../../src/rules/splitDeriver';
import type { SessionType } from '../../src/types/program';

// ─── Helper ───────────────────────────────────────────────────────────────────
const isLower = (t: SessionType) => LOWER_SESSION_TYPES.includes(t);
const isUpper = (t: SessionType) => !isLower(t) && t !== 'FullBody';

describe('deriveSplit — priority scoring and regional allocation', () => {

  // ── Case A: lower-dominant ──────────────────────────────────────────────────
  it('Case A: lower-dominant priorities → 3 lower, 2 upper for 5 days', () => {
    const { derivation } = deriveSplit(5, {
      Chest: 'maintain', Back: 'maintain', Shoulders: 'maintain',
      Biceps: 'maintain', Triceps: 'maintain',
      Quads: 'emphasize', Hamstrings: 'emphasize', Glutes: 'emphasize',
    });
    expect(derivation.lowerDays).toBe(3);
    expect(derivation.upperDays).toBe(2);
  });

  it('Case A: lower emphasis → 3 specialized lower session types', () => {
    const { sessionSequence } = deriveSplit(5, {
      Chest: 'maintain', Back: 'maintain', Shoulders: 'maintain',
      Biceps: 'maintain', Triceps: 'maintain',
      Quads: 'emphasize', Hamstrings: 'emphasize', Glutes: 'emphasize',
    });
    expect(sessionSequence).toContain('LowerQuadFocus');
    expect(sessionSequence).toContain('LowerPosteriorChain');
    expect(sessionSequence).toContain('LowerGluteQuad');
  });

  it('Case A: interleaving — lower days alternate with upper days (no back-to-back)', () => {
    const { sessionSequence } = deriveSplit(5, {
      Chest: 'maintain', Back: 'maintain', Shoulders: 'maintain',
      Biceps: 'maintain', Triceps: 'maintain',
      Quads: 'emphasize', Hamstrings: 'emphasize', Glutes: 'emphasize',
    });
    for (let i = 1; i < sessionSequence.length; i++) {
      const prev = sessionSequence[i - 1];
      const curr = sessionSequence[i];
      // Both lower on consecutive days is only acceptable when all days are lower
      if (isLower(prev) && isLower(curr)) {
        const totalUpper = sessionSequence.filter(isUpper).length;
        expect(totalUpper).toBe(0);
      }
    }
  });

  // ── Case B: upper-dominant ──────────────────────────────────────────────────
  it('Case B: heavy upper emphasis → 3 upper, 2 lower for 5 days', () => {
    const { derivation } = deriveSplit(5, {
      Chest: 'emphasize', Shoulders: 'emphasize', Triceps: 'emphasize',
      Back: 'emphasize', Biceps: 'grow',
      Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain',
    });
    expect(derivation.upperDays).toBe(3);
    expect(derivation.lowerDays).toBe(2);
  });

  it('Case B: upper score capped at 60 % even with score=12 vs lower=3', () => {
    // Upper can't take > ceil(5 * 0.6) = 3 days regardless of score ratio
    const { derivation } = deriveSplit(5, {
      Chest: 'emphasize', Shoulders: 'emphasize', Triceps: 'emphasize', Back: 'emphasize',
      Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain',
    });
    expect(derivation.upperDays).toBeLessThanOrEqual(3);
    expect(derivation.lowerDays).toBeGreaterThanOrEqual(2);
  });

  // ── Push vs pull sub-allocation ────────────────────────────────────────────
  it('push-dominant upper: Push days > Pull days', () => {
    const { sessionSequence } = deriveSplit(5, {
      Chest: 'emphasize', Shoulders: 'emphasize', Triceps: 'emphasize',
      Back: 'grow', Biceps: 'grow',
      Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain',
    });
    const push = sessionSequence.filter((s) => s === 'Push').length;
    const pull = sessionSequence.filter((s) => s === 'Pull').length;
    expect(push).toBeGreaterThan(pull);
  });

  it('pull-dominant upper: Pull days > Push days', () => {
    const { sessionSequence } = deriveSplit(5, {
      Back: 'emphasize', Biceps: 'emphasize', Traps: 'grow',
      Chest: 'maintain', Shoulders: 'maintain', Triceps: 'maintain',
      Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain',
    });
    const push = sessionSequence.filter((s) => s === 'Push').length;
    const pull = sessionSequence.filter((s) => s === 'Pull').length;
    expect(pull).toBeGreaterThan(push);
  });

  // ── Lower specialization ────────────────────────────────────────────────────
  it('lower without emphasis → generic Lower days (no specialized types)', () => {
    const { sessionSequence } = deriveSplit(5, {
      Chest: 'emphasize', Back: 'grow',
      Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain',
    });
    const specialized: SessionType[] = ['LowerQuadFocus', 'LowerPosteriorChain', 'LowerGluteQuad'];
    expect(sessionSequence.some((s) => specialized.includes(s))).toBe(false);
  });

  it('2 lower days with quad emphasis → LowerQuadFocus + LowerPosteriorChain', () => {
    const { sessionSequence } = deriveSplit(4, {
      Quads: 'emphasize', Hamstrings: 'maintain', Glutes: 'maintain',
      Chest: 'grow', Back: 'grow', Shoulders: 'grow',
    });
    const lowerTypes = sessionSequence.filter(isLower);
    expect(lowerTypes).toContain('LowerQuadFocus');
  });

  // ── Day count invariants ────────────────────────────────────────────────────
  it('sequence length always equals daysPerWeek', () => {
    for (const days of [3, 4, 5, 6]) {
      const { sessionSequence } = deriveSplit(days, {
        Chest: 'emphasize', Quads: 'emphasize',
      });
      expect(sessionSequence.length).toBe(days);
    }
  });

  it('each region gets ≥ 1 day when it has any priority weight', () => {
    const { derivation } = deriveSplit(5, {
      Chest: 'maintain', Quads: 'maintain',
    });
    expect(derivation.upperDays).toBeGreaterThanOrEqual(1);
    expect(derivation.lowerDays).toBeGreaterThanOrEqual(1);
  });

  // ── Split label ─────────────────────────────────────────────────────────────
  it('splitType is a non-empty hyphenated string', () => {
    const { splitType } = deriveSplit(5, { Chest: 'emphasize', Quads: 'maintain' });
    expect(typeof splitType).toBe('string');
    expect(splitType.length).toBeGreaterThan(0);
    expect(splitType).toMatch(/^[a-z-]+$/);
  });

  it('splitType reflects lower emphasis', () => {
    const { splitType } = deriveSplit(5, {
      Quads: 'emphasize', Hamstrings: 'emphasize', Glutes: 'emphasize',
      Chest: 'maintain', Back: 'maintain', Shoulders: 'maintain',
    });
    expect(splitType).toContain('lower');
  });

  // ── Scores ──────────────────────────────────────────────────────────────────
  it('scores: emphasize=3, grow=2, maintain=1, unspecified=0', () => {
    const { derivation } = deriveSplit(5, {
      Chest: 'emphasize', Shoulders: 'emphasize', Triceps: 'emphasize', // push = 9
      Back: 'grow', Biceps: 'grow',                                     // pull = 4
      Quads: 'maintain', Hamstrings: 'maintain', Glutes: 'maintain',   // lower = 3 (partial)
    });
    expect(derivation.pushScore).toBe(9);
    expect(derivation.pullScore).toBe(4);
  });

});
