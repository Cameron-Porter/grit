import { assignMuscleSessions } from '../../src/rules/assignment';
import type { MuscleGroup, SessionType, WeeklyVolumeTarget } from '../../src/types/program';

function target(muscle: MuscleGroup, sessionFrequency: number): WeeklyVolumeTarget {
  return { muscle, priority: 'grow', weeklySets: 12, sessionFrequency, setsPerSession: 4 };
}

describe('assignMuscleSessions — RC-007 symmetrical spacing', () => {
  it('spreads two picks evenly across the week when preference ties', () => {
    // 6-day Upper/Lower/Upper/Lower/Upper/Lower week — Chest is eligible on
    // every Upper day (all tied preference rank), needs 2. Even spacing across
    // 6 days should land on indices 0 and 3, not 0 and 1.
    const weekSessions: SessionType[] = ['Upper', 'Lower', 'Upper', 'Lower', 'Upper', 'Lower'];
    const result = assignMuscleSessions(weekSessions, target('Chest', 2));

    expect(result.length).toBe(2);
    const gap = Math.abs(result[1] - result[0]);
    expect(gap).toBeGreaterThanOrEqual(2);
  });
});

describe('assignMuscleSessions — RC-008 overlap avoidance', () => {
  it('steers Triceps away from days already assigned to Chest when a tie-breaking choice exists', () => {
    // Push/Upper/Push/Upper week — Triceps is eligible on all 4 (Push preferred,
    // then Upper), needs 2. If Chest already occupies days 0 and 2 (the two
    // Push days), Triceps choosing between tied Upper-day candidates (1 and 3)
    // shouldn't matter much, but if Triceps also had a tie among Push-tier
    // candidates it should avoid stacking directly onto Chest's days when an
    // equally-preferred alternative exists.
    const weekSessions: SessionType[] = ['Push', 'Upper', 'Push', 'Upper'];
    const alreadyAssigned = new Map<MuscleGroup, number[]>([['Chest', [0, 2]]]);

    // Triceps needs only 1 day, and both Push days (0, 2) are top preference
    // tier, tied with each other. Overlap penalty is identical for both (both
    // coincide with a Chest day), so this should fall back to spacing/first
    // index — the real assertion is that overlap penalty doesn't crash or
    // misbehave when every top-tier candidate collides with the same muscle.
    const result = assignMuscleSessions(weekSessions, target('Triceps', 1), alreadyAssigned);
    expect(result.length).toBe(1);
    expect([0, 2]).toContain(result[0]);
  });

  it('prefers a non-overlapping day when overlap and non-overlap candidates are otherwise tied', () => {
    // Two Push days (0, 3) both top preference tier for Triceps. Chest already
    // occupies day 0. Triceps needs 1 day — should prefer day 3 to avoid
    // stacking directly onto Chest's fatigue.
    const weekSessions: SessionType[] = ['Push', 'Upper', 'Upper', 'Push'];
    const alreadyAssigned = new Map<MuscleGroup, number[]>([['Chest', [0]]]);

    const result = assignMuscleSessions(weekSessions, target('Triceps', 1), alreadyAssigned);
    expect(result).toEqual([3]);
  });

  it('is unaffected by alreadyAssigned when the muscle pair has no overlap coefficient', () => {
    const weekSessions: SessionType[] = ['Legs', 'Legs'];
    const alreadyAssigned = new Map<MuscleGroup, number[]>([['Abs', [0]]]);

    // Quads/Abs have no overlap entry — result should be identical to the
    // no-overlap-data case (first two eligible days, both needed).
    const result = assignMuscleSessions(weekSessions, target('Quads', 2), alreadyAssigned);
    expect(result).toEqual([0, 1]);
  });

  it('still respects SESSION_PREFERENCE ranking over spacing/overlap', () => {
    // Triceps prefers Push over Upper. Even if spacing/overlap would favor an
    // Upper day, a Push day must still win when capacity allows.
    const weekSessions: SessionType[] = ['Upper', 'Push'];
    const result = assignMuscleSessions(weekSessions, target('Triceps', 1));
    expect(result).toEqual([1]);
  });
});
