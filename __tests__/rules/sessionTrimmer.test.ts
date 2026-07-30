import {
  enforceSessionCaps,
  estimateSessionMinutes,
  estimateSlotMinutes,
  SESSION_MAX_EXERCISES,
  SESSION_MAX_SETS,
} from '../../src/rules/sessionTrimmer';
import type { DayPlan, ExerciseSlot, MuscleGroup, MusclePriority, SlotRole } from '../../src/types/program';

function slot(muscle: MuscleGroup, role: SlotRole, sets: number, id?: string): ExerciseSlot {
  return {
    id: id ?? `${muscle}-${role}-${Math.random()}`,
    muscle,
    role,
    priority: 'grow',
    sets,
    repsMin: 8,
    repsMax: 12,
    rir: 2,
    sortOrder: 0,
  };
}

function day(slots: ExerciseSlot[], sessionType: DayPlan['sessionType'] = 'Upper'): DayPlan {
  return {
    dayIndex: 0,
    weekNumber: 1,
    isDeload: false,
    sessionType,
    splitName: sessionType,
    trainingDay: 'Monday',
    primaryMuscles: [...new Set(slots.map((s) => s.muscle))],
    slots,
    totalSets: slots.reduce((n, s) => n + s.sets, 0),
    estimatedMinutes: 0,
  };
}

describe('RC-006 — muscle-group cap at high frequency', () => {
  const priorities: Partial<Record<MuscleGroup, MusclePriority>> = {
    Chest: 'emphasize',
    Back: 'grow',
    Shoulders: 'grow',
    Biceps: 'maintain',
    Triceps: 'maintain',
    // Abs is intentionally left unset (defaults to 'mev' — the lowest trim
    // priority) so this test has one unambiguous first-removed muscle.
  };

  it('does nothing below the 4-day/week threshold', () => {
    const slots = [
      slot('Chest', 'Primary', 3), slot('Back', 'Primary', 3), slot('Shoulders', 'Primary', 3),
      slot('Biceps', 'Primary', 3), slot('Triceps', 'Primary', 3), slot('Abs', 'Primary', 2),
    ];
    const result = enforceSessionCaps(day(slots), priorities, 'hypertrophy', 3);
    // 6 distinct muscles survive since daysPerWeek < 4 — muscle-group cap not applied.
    // (SESSION_MAX_EXERCISES may still trim slot count, but not by muscle-group logic.)
    expect(new Set(result.slots.map((s) => s.muscle)).size).toBeGreaterThanOrEqual(5);
  });

  it('caps distinct muscle groups at 4+ days/week, removing the lowest-priority muscle first', () => {
    const slots = [
      slot('Chest', 'Primary', 2), slot('Back', 'Primary', 2), slot('Shoulders', 'Primary', 2),
      slot('Biceps', 'Primary', 2), slot('Triceps', 'Primary', 2), slot('Abs', 'Primary', 2),
    ];
    const result = enforceSessionCaps(day(slots), priorities, 'hypertrophy', 4);
    const muscles = new Set(result.slots.map((s) => s.muscle));

    expect(muscles.size).toBeLessThanOrEqual(5);
    // Abs defaults to 'mev' (lowest trim priority) — removed first.
    expect(muscles.has('Abs')).toBe(false);
    // Chest is 'emphasize' — must survive.
    expect(muscles.has('Chest')).toBe(true);
  });
});

describe('RC-009 — 90-minute session cap', () => {
  const priorities: Partial<Record<MuscleGroup, MusclePriority>> = {
    Chest: 'emphasize',
    Back: 'grow',
  };

  it('estimateSlotMinutes uses the flat 3.5 min/set rate for cut focus', () => {
    expect(estimateSlotMinutes(slot('Chest', 'Primary', 4), 'cut')).toBeCloseTo(14);
  });

  it('estimateSlotMinutes uses a higher per-set rate for strength Primary work', () => {
    const strengthMinutes = estimateSlotMinutes(slot('Chest', 'Primary', 4), 'strength');
    const hypertrophyMinutes = estimateSlotMinutes(slot('Chest', 'Primary', 4), 'hypertrophy');
    expect(strengthMinutes).toBeGreaterThan(hypertrophyMinutes);
  });

  it('trims sets/slots further when estimated minutes exceed 90, even under the set cap', () => {
    // 20 sets at strength Primary rate (5 min/set) = 100 min > 90, but well
    // under SESSION_MAX_SETS (24) — Phase 2 alone wouldn't touch this.
    const slots = [
      slot('Chest', 'Primary', 10, 'a'),
      slot('Back', 'Primary', 10, 'b'),
    ];
    expect(slots.reduce((n, s) => n + s.sets, 0)).toBeLessThanOrEqual(SESSION_MAX_SETS);

    const result = enforceSessionCaps(day(slots), priorities, 'strength');
    const finalMinutes = estimateSessionMinutes(result.slots, 'strength');

    expect(finalMinutes).toBeLessThanOrEqual(90);
    expect(result.estimatedMinutes).toBe(finalMinutes);
  });

  it('never removes more than necessary — a day already under 90 minutes is untouched', () => {
    const slots = [slot('Chest', 'Primary', 3), slot('Back', 'Primary', 3)];
    const result = enforceSessionCaps(day(slots), priorities, 'hypertrophy');
    expect(result.totalSets).toBe(6);
  });
});

describe('ST-009 — strength-focus session set cap', () => {
  it('caps a strength-focus session at 15 sets, not the general 24', () => {
    const priorities: Partial<Record<MuscleGroup, MusclePriority>> = {
      Chest: 'emphasize', Back: 'grow', Shoulders: 'maintain', Triceps: 'maintain',
    };
    const slots = [
      slot('Chest', 'Primary', 5, 'a'),
      slot('Back', 'Primary', 5, 'b'),
      slot('Shoulders', 'Primary', 5, 'c'),
      slot('Triceps', 'Primary', 5, 'd'),
    ]; // 20 sets total, well under the general 24 cap
    const result = enforceSessionCaps(day(slots), priorities, 'strength');
    expect(result.totalSets).toBeLessThanOrEqual(15);
  });

  it('leaves a hypertrophy-focus session with the same set count untouched', () => {
    const priorities: Partial<Record<MuscleGroup, MusclePriority>> = {
      Chest: 'emphasize', Back: 'grow', Shoulders: 'maintain', Triceps: 'maintain',
    };
    const slots = [
      slot('Chest', 'Primary', 5, 'a'),
      slot('Back', 'Primary', 5, 'b'),
      slot('Shoulders', 'Primary', 5, 'c'),
      slot('Triceps', 'Primary', 5, 'd'),
    ];
    const result = enforceSessionCaps(day(slots), priorities, 'hypertrophy');
    expect(result.totalSets).toBe(20);
  });
});

describe('sessionTrimmer — existing invariants still hold', () => {
  it('never exceeds SESSION_MAX_EXERCISES or SESSION_MAX_SETS', () => {
    const slots = Array.from({ length: 8 }, (_, i) =>
      slot((['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Abs'] as MuscleGroup[])[i], 'Primary', 4, `s${i}`),
    );
    const result = enforceSessionCaps(day(slots), {}, 'hypertrophy');
    expect(result.slots.length).toBeLessThanOrEqual(SESSION_MAX_EXERCISES);
    expect(result.totalSets).toBeLessThanOrEqual(SESSION_MAX_SETS);
  });
});
