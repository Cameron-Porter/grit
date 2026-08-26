export type StagedExerciseInput = { exerciseId: string; sets: number; repsMin: number; repsMax: number; weight: number; rir: number };
export type CatalogExercise = { id: string; name: string; muscle_group: string | null; equipment: string | null; movement_category?: string | null; rep_range_min?: number | null; rep_range_max?: number | null; suggestion?: Partial<Omit<StagedExerciseInput, 'exerciseId'>> | null };
export type ProgramExerciseInsertRow = { program_day_id: string; exercise_name: string; muscle_group: string | null; equipment: string | null; sort_order: number; target_sets: number; target_reps_min: number; target_reps_max: number; target_weight: number; rir: number };
export type EquipmentPreference = { enabled: boolean; preferred: string[] };

export function validateStagedExerciseInput(value: unknown): value is StagedExerciseInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<StagedExerciseInput>;
  if (typeof input.exerciseId !== 'string' || !input.exerciseId) return false;
  if (typeof input.sets !== 'number' || !Number.isInteger(input.sets) || input.sets < 1 || input.sets > 10) return false;
  if (typeof input.repsMin !== 'number' || !Number.isInteger(input.repsMin) || input.repsMin < 1) return false;
  if (typeof input.repsMax !== 'number' || !Number.isInteger(input.repsMax) || input.repsMax < input.repsMin || input.repsMax > 100) return false;
  if (typeof input.weight !== 'number' || !Number.isFinite(input.weight) || input.weight < 0) return false;
  if (typeof input.rir !== 'number' || !Number.isInteger(input.rir) || input.rir < 0 || input.rir > 5) return false;
  return true;
}

export function parseStagedExerciseItems(raw: string): StagedExerciseInput[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  if (!parsed.every(validateStagedExerciseInput)) return null;
  return parsed;
}

export function parseProgramDayExerciseItems(raw: string, expectedDays: number): StagedExerciseInput[][] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length !== expectedDays) return null;
  const days: StagedExerciseInput[][] = [];
  for (const day of parsed) {
    if (!Array.isArray(day) || day.length === 0 || !day.every(validateStagedExerciseInput)) return null;
    days.push(day);
  }
  return days;
}

export function buildProgramExerciseRows(dayId: string, items: StagedExerciseInput[], catalog: CatalogExercise[], startSortOrder: number): ProgramExerciseInsertRow[] | null {
  const catalogById = new Map(catalog.map(exercise => [exercise.id, exercise]));
  const rows: ProgramExerciseInsertRow[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index], exercise = catalogById.get(item.exerciseId);
    if (!exercise) return null;
    rows.push({
      program_day_id: dayId,
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group,
      equipment: exercise.equipment,
      sort_order: startSortOrder + index,
      target_sets: item.sets,
      target_reps_min: item.repsMin,
      target_reps_max: item.repsMax,
      target_weight: item.weight,
      rir: item.rir,
    });
  }
  return rows;
}

export function filterExercisesByMuscleGroup<T extends { muscle_group: string | null }>(catalog: T[], muscleGroup: string): T[] {
  if (!muscleGroup || muscleGroup === 'all') return catalog;
  return catalog.filter(exercise => exercise.muscle_group === muscleGroup);
}

export function filterExercisesByEquipmentPreference<T extends { equipment: string | null }>(catalog: T[], preference: EquipmentPreference): T[] {
  if (!preference.enabled || preference.preferred.length === 0) return catalog;
  const allowed = new Set(preference.preferred);
  return catalog.filter(exercise => exercise.equipment !== null && allowed.has(exercise.equipment));
}

export function uniqueMuscleGroups(catalog: { muscle_group: string | null }[]): string[] {
  return [...new Set(catalog.map(exercise => exercise.muscle_group).filter((group): group is string => Boolean(group)))].sort();
}

const positiveInteger = (value: unknown, fallback: number) => typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
const finiteWeight = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
const boundedRir = (value: unknown, fallback: number) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5 ? value : fallback;

export function stagedDefaultsForExercise(exercise: CatalogExercise): Omit<StagedExerciseInput, 'exerciseId'> {
  const repsMin = positiveInteger(exercise.suggestion?.repsMin, positiveInteger(exercise.rep_range_min, 8));
  const repsMax = Math.max(repsMin, positiveInteger(exercise.suggestion?.repsMax, positiveInteger(exercise.rep_range_max, 12)));
  return {
    sets: positiveInteger(exercise.suggestion?.sets, 3),
    repsMin,
    repsMax,
    weight: finiteWeight(exercise.suggestion?.weight, 0),
    rir: boundedRir(exercise.suggestion?.rir, 2),
  };
}
