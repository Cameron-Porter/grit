import { describe, expect, it } from 'vitest';
import {
  buildProgramExerciseRows,
  filterExercisesByMuscleGroup,
  parseStagedExerciseItems,
  uniqueMuscleGroups,
  validateStagedExerciseInput,
  type CatalogExercise,
  type StagedExerciseInput,
} from './day-template-payload';

const valid: StagedExerciseInput = { exerciseId: 'ex-1', sets: 3, repsMin: 8, repsMax: 12, weight: 45, rir: 3 };

const catalog: CatalogExercise[] = [
  { id: 'ex-1', name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
  { id: 'ex-2', name: 'Lat Pulldown', muscle_group: 'Back', equipment: 'Cable' },
  { id: 'ex-3', name: 'Incline Dumbbell Press', muscle_group: 'Chest', equipment: 'Dumbbell' },
  { id: 'ex-4', name: 'Face Pull', muscle_group: null, equipment: 'Cable' },
];

describe('validateStagedExerciseInput', () => {
  it('accepts a complete staged exercise', () => {
    expect(validateStagedExerciseInput(valid)).toBe(true);
  });

  it('rejects a missing exercise id', () => {
    expect(validateStagedExerciseInput({ ...valid, exerciseId: '' })).toBe(false);
  });

  it('rejects sets outside 1-10', () => {
    expect(validateStagedExerciseInput({ ...valid, sets: 0 })).toBe(false);
    expect(validateStagedExerciseInput({ ...valid, sets: 11 })).toBe(false);
  });

  it('rejects an inverted or out-of-range rep range', () => {
    expect(validateStagedExerciseInput({ ...valid, repsMin: 12, repsMax: 8 })).toBe(false);
    expect(validateStagedExerciseInput({ ...valid, repsMax: 101 })).toBe(false);
  });

  it('rejects a negative weight', () => {
    expect(validateStagedExerciseInput({ ...valid, weight: -5 })).toBe(false);
  });

  it('rejects rir outside 0-5', () => {
    expect(validateStagedExerciseInput({ ...valid, rir: 6 })).toBe(false);
    expect(validateStagedExerciseInput({ ...valid, rir: -1 })).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(validateStagedExerciseInput(null)).toBe(false);
    expect(validateStagedExerciseInput('nope')).toBe(false);
  });
});

describe('parseStagedExerciseItems', () => {
  it('parses a JSON array of staged exercises', () => {
    expect(parseStagedExerciseItems(JSON.stringify([valid, { ...valid, exerciseId: 'ex-2' }]))).toEqual([
      valid,
      { ...valid, exerciseId: 'ex-2' },
    ]);
  });

  it('rejects invalid JSON', () => {
    expect(parseStagedExerciseItems('not json')).toBeNull();
  });

  it('rejects an empty array so a day save always stages at least one exercise', () => {
    expect(parseStagedExerciseItems('[]')).toBeNull();
  });

  it('rejects the whole payload if any single item is invalid', () => {
    expect(parseStagedExerciseItems(JSON.stringify([valid, { ...valid, sets: 0 }]))).toBeNull();
  });
});

describe('buildProgramExerciseRows', () => {
  it('builds one row per staged item, in order, continuing sort_order and using catalog name/muscle_group/equipment (no fallbacks)', () => {
    const rows = buildProgramExerciseRows('day-1', [valid, { ...valid, exerciseId: 'ex-2' }], catalog, 5);
    expect(rows).toEqual([
      { program_day_id: 'day-1', exercise_name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell', sort_order: 5, target_sets: 3, target_reps_min: 8, target_reps_max: 12, target_weight: 45, rir: 3 },
      { program_day_id: 'day-1', exercise_name: 'Lat Pulldown', muscle_group: 'Back', equipment: 'Cable', sort_order: 6, target_sets: 3, target_reps_min: 8, target_reps_max: 12, target_weight: 45, rir: 3 },
    ]);
  });

  it('returns null and builds nothing if any staged exercise id is missing from the resolved catalog', () => {
    expect(buildProgramExerciseRows('day-1', [valid, { ...valid, exerciseId: 'missing' }], catalog, 0)).toBeNull();
  });
});

describe('filterExercisesByMuscleGroup', () => {
  it('returns the exercises matching the muscle group', () => {
    expect(filterExercisesByMuscleGroup(catalog, 'Chest')).toEqual([catalog[0], catalog[2]]);
  });

  it('returns the full catalog for "all" or an empty filter', () => {
    expect(filterExercisesByMuscleGroup(catalog, 'all')).toEqual(catalog);
    expect(filterExercisesByMuscleGroup(catalog, '')).toEqual(catalog);
  });
});

describe('uniqueMuscleGroups', () => {
  it('returns sorted, deduplicated, non-null muscle groups', () => {
    expect(uniqueMuscleGroups(catalog)).toEqual(['Back', 'Chest']);
  });
});
