import { ExerciseCandidate, selectExerciseForSlot, SelectExerciseOptions } from '../../src/rules/exerciseSelector';
import type { ExerciseSlot } from '../../src/types/program';

function makeSlot(overrides: Partial<ExerciseSlot> = {}): ExerciseSlot {
  return {
    id: 'slot-1',
    muscle: 'Chest',
    role: 'Primary',
    priority: 'grow',
    sets: 3,
    repsMin: 6,
    repsMax: 12,
    rir: 2,
    sortOrder: 0,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<ExerciseCandidate> = {}): ExerciseCandidate {
  return {
    name: 'Barbell Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    movementCategory: 'Horizontal Press',
    ...overrides,
  };
}

function makeOpts(overrides: Partial<SelectExerciseOptions> = {}): SelectExerciseOptions {
  return {
    preferredEquipment: [],
    usePreferredEquipment: false,
    lastSessionNames: new Set(),
    last2SessionsNames: new Set(),
    alreadyUsedThisWorkout: new Set(),
    ...overrides,
  };
}

describe('selectExerciseForSlot — muscle hard filter', () => {
  it('never returns an exercise for a different muscle group', () => {
    const slot = makeSlot({ muscle: 'Chest' });
    const candidates = [makeCandidate({ name: 'Barbell Row', muscleGroup: 'Back' })];
    expect(selectExerciseForSlot(slot, candidates, makeOpts())).toBeNull();
  });

  it('returns null when no exercise at all exists for the muscle', () => {
    const slot = makeSlot({ muscle: 'Traps' });
    expect(selectExerciseForSlot(slot, [], makeOpts())).toBeNull();
  });
});

describe('selectExerciseForSlot — equipment preference', () => {
  it('prefers an exercise matching preferred equipment over one that does not', () => {
    const slot = makeSlot();
    const candidates = [
      makeCandidate({ name: 'Machine Chest Press', equipment: 'Machine' }),
      makeCandidate({ name: 'Barbell Bench Press', equipment: 'Barbell' }),
    ];
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({ usePreferredEquipment: true, preferredEquipment: ['Barbell'] }),
    );
    expect(result?.name).toBe('Barbell Bench Press');
  });

  it('falls back to the full pool when the equipment filter would empty it', () => {
    const slot = makeSlot();
    const candidates = [makeCandidate({ name: 'Machine Chest Press', equipment: 'Machine' })];
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({ usePreferredEquipment: true, preferredEquipment: ['Barbell'] }),
    );
    expect(result?.name).toBe('Machine Chest Press');
  });

  it('always treats Bodyweight as preferred regardless of the preferred-equipment list', () => {
    const slot = makeSlot();
    const candidates = [
      makeCandidate({ name: 'Push-Up', equipment: 'Bodyweight' }),
      makeCandidate({ name: 'Machine Chest Press', equipment: 'Machine' }),
    ];
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({ usePreferredEquipment: true, preferredEquipment: ['Barbell'] }),
    );
    expect(result?.name).toBe('Push-Up');
  });
});

describe('selectExerciseForSlot — movement-class preference', () => {
  it('prefers a compound exercise for a Primary slot', () => {
    const slot = makeSlot({ role: 'Primary' });
    const candidates = [
      makeCandidate({ name: 'Cable Fly', movementCategory: 'Lateral Raise' }), // isolation-ish stand-in
      makeCandidate({ name: 'Barbell Bench Press', movementCategory: 'Horizontal Press' }), // compound
    ];
    expect(selectExerciseForSlot(slot, candidates, makeOpts())?.name).toBe('Barbell Bench Press');
  });

  it('prefers an isolation exercise for an Accessory slot', () => {
    const slot = makeSlot({ role: 'Accessory', muscle: 'Shoulders' });
    const candidates = [
      makeCandidate({ name: 'Overhead Press', muscleGroup: 'Shoulders', movementCategory: 'Vertical Press' }),
      makeCandidate({ name: 'Lateral Raise', muscleGroup: 'Shoulders', movementCategory: 'Lateral Raise' }),
    ];
    expect(selectExerciseForSlot(slot, candidates, makeOpts())?.name).toBe('Lateral Raise');
  });

  it('falls back to the full pool when no candidate matches the preferred movement class', () => {
    const slot = makeSlot({ role: 'Accessory' });
    const candidates = [makeCandidate({ name: 'Barbell Bench Press', movementCategory: 'Horizontal Press' })];
    expect(selectExerciseForSlot(slot, candidates, makeOpts())?.name).toBe('Barbell Bench Press');
  });
});

describe('selectExerciseForSlot — anti-repeat window', () => {
  it('Primary slots only exclude the single most recent session', () => {
    const slot = makeSlot({ role: 'Primary' });
    const candidates = [makeCandidate({ name: 'Barbell Bench Press' })];
    // Used 2 sessions ago, but NOT last session — Primary should still pick it.
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({ lastSessionNames: new Set(), last2SessionsNames: new Set(['Barbell Bench Press']) }),
    );
    expect(result?.name).toBe('Barbell Bench Press');
  });

  it('Primary slots exclude an exercise used in the most recent session when an alternative exists', () => {
    const slot = makeSlot({ role: 'Primary' });
    const candidates = [
      makeCandidate({ name: 'Barbell Bench Press' }),
      makeCandidate({ name: 'Dumbbell Bench Press' }),
    ];
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({ lastSessionNames: new Set(['Barbell Bench Press']) }),
    );
    expect(result?.name).toBe('Dumbbell Bench Press');
  });

  it('Accessory slots exclude an exercise used 2 sessions ago, unlike Primary', () => {
    const slot = makeSlot({ role: 'Accessory', muscle: 'Shoulders' });
    const candidates = [
      makeCandidate({ name: 'Lateral Raise', muscleGroup: 'Shoulders', movementCategory: 'Lateral Raise' }),
      makeCandidate({ name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', movementCategory: 'Lateral Raise' }),
    ];
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({
        lastSessionNames: new Set(),
        last2SessionsNames: new Set(['Lateral Raise']),
      }),
    );
    expect(result?.name).toBe('Cable Lateral Raise');
  });

  it('never returns null just because every candidate was recently used', () => {
    const slot = makeSlot({ role: 'Primary' });
    const candidates = [makeCandidate({ name: 'Barbell Bench Press' })];
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({ lastSessionNames: new Set(['Barbell Bench Press']) }),
    );
    expect(result?.name).toBe('Barbell Bench Press');
  });
});

describe('selectExerciseForSlot — same-workout dedup and determinism', () => {
  it('excludes an exercise already picked for another slot in this session', () => {
    const slot = makeSlot();
    const candidates = [makeCandidate({ name: 'Barbell Bench Press' })];
    const result = selectExerciseForSlot(
      slot,
      candidates,
      makeOpts({ alreadyUsedThisWorkout: new Set(['Barbell Bench Press']) }),
    );
    expect(result).toBeNull();
  });

  it('is deterministic — identical input always produces the same output', () => {
    const slot = makeSlot();
    const candidates = [
      makeCandidate({ name: 'Dumbbell Bench Press', equipment: 'Dumbbell' }),
      makeCandidate({ name: 'Barbell Bench Press', equipment: 'Barbell' }),
    ];
    const first = selectExerciseForSlot(slot, candidates, makeOpts());
    const second = selectExerciseForSlot(slot, candidates, makeOpts());
    expect(first?.name).toBe(second?.name);
  });
});
