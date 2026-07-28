import {
  buildQuickWorkoutSlots,
  isQuickWorkoutSubtypeAvailable,
  QUICK_WORKOUT_TEMPLATE_MAP,
} from '../../src/rules/quickWorkoutBuilder';
import { SLOT_ROLE_CONFIGS } from '../../src/data/slotRoleConfig';
import { SESSION_MAX_EXERCISES, SESSION_MAX_SETS } from '../../src/rules/sessionTrimmer';

describe('quickWorkoutBuilder — template mapping', () => {
  it.each([
    ['Upper', 'Push', 'Chest'],
    ['Upper', 'Pull', 'Back'],
    ['Upper', 'All', 'Chest'],
    ['Lower', 'Push', 'Quads'],
    ['Lower', 'Pull', 'Hamstrings'],
    ['Lower', 'All', 'Quads'],
    ['FullBody', 'All', 'Quads'],
  ] as const)('%s + %s anchors on %s', (region, subtype, expectedAnchor) => {
    const slots = buildQuickWorkoutSlots(region, subtype);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].muscle).toBe(expectedAnchor);
  });

  it('Full Body does not offer Push or Pull — only All maps to a template', () => {
    expect(isQuickWorkoutSubtypeAvailable('FullBody', 'Push')).toBe(false);
    expect(isQuickWorkoutSubtypeAvailable('FullBody', 'Pull')).toBe(false);
    expect(isQuickWorkoutSubtypeAvailable('FullBody', 'All')).toBe(true);
    expect(QUICK_WORKOUT_TEMPLATE_MAP.FullBody.Push).toBeUndefined();
    expect(QUICK_WORKOUT_TEMPLATE_MAP.FullBody.Pull).toBeUndefined();
  });

  it('throws for an unsupported region+subtype combination', () => {
    expect(() => buildQuickWorkoutSlots('FullBody', 'Push')).toThrow();
  });

  it('every Upper/Lower subtype is available', () => {
    for (const region of ['Upper', 'Lower'] as const) {
      for (const subtype of ['Push', 'Pull', 'All'] as const) {
        expect(isQuickWorkoutSubtypeAvailable(region, subtype)).toBe(true);
      }
    }
  });
});

describe('quickWorkoutBuilder — flat set counts (no meso ramp)', () => {
  it('uses the flat grow-tier SLOT_ROLE_CONFIGS numbers directly, not a ramped value', () => {
    // Regression guard: buildQuickWorkoutSlots must not pass weekParams/
    // volumeTargets to buildDaySlots — if it ever did, sets would come out
    // ramped (HV-021) instead of the flat, cited slotRoleConfig.ts numbers.
    const slots = buildQuickWorkoutSlots('Upper', 'Push');
    const primarySlot = slots.find((s) => s.role === 'Primary')!;
    expect(primarySlot.sets).toBe(SLOT_ROLE_CONFIGS.Primary.grow.sets);
  });

  it('defaults to hypertrophy focus rep ranges when no focus is passed', () => {
    const slots = buildQuickWorkoutSlots('Upper', 'Push');
    const primarySlot = slots.find((s) => s.role === 'Primary')!;
    expect(primarySlot.repsMin).toBe(SLOT_ROLE_CONFIGS.Primary.grow.repsMin);
    expect(primarySlot.repsMax).toBe(SLOT_ROLE_CONFIGS.Primary.grow.repsMax);
  });

  it('respects a passed-in strength focus instead of defaulting to hypertrophy', () => {
    const slots = buildQuickWorkoutSlots('Upper', 'Push', 'strength');
    const primarySlot = slots.find((s) => s.role === 'Primary')!;
    // Strength Primary/grow is a distinctly lower rep ceiling than hypertrophy's.
    expect(primarySlot.repsMax).toBeLessThan(SLOT_ROLE_CONFIGS.Primary.grow.repsMax);
  });
});

describe('quickWorkoutBuilder — session caps', () => {
  it.each([
    ['Upper', 'Push'],
    ['Upper', 'Pull'],
    ['Upper', 'All'],
    ['Lower', 'Push'],
    ['Lower', 'Pull'],
    ['Lower', 'All'],
    ['FullBody', 'All'],
  ] as const)('%s + %s stays within session caps', (region, subtype) => {
    const slots = buildQuickWorkoutSlots(region, subtype);
    const totalSets = slots.reduce((n, s) => n + s.sets, 0);
    expect(slots.length).toBeLessThanOrEqual(SESSION_MAX_EXERCISES);
    expect(totalSets).toBeLessThanOrEqual(SESSION_MAX_SETS);
  });
});
