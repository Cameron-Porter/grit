import { filterExercisesByEquipmentPreference } from '@/lib/programs/day-template-payload';
import { loadExerciseCatalog, type CatalogRow } from './catalog';
import type { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type ExercisePickerOption = {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  repsMin: number | null;
  repsMax: number | null;
  movementCategory: string | null;
};

export type EquipmentPreference = { enabled: boolean; preferred: string[] };

export const equipmentPreferenceOf = (profile: { use_preferred_equipment?: unknown; preferred_equipment?: unknown } | null): EquipmentPreference => ({
  enabled: Boolean(profile?.use_preferred_equipment),
  preferred: Array.isArray(profile?.preferred_equipment)
    ? profile.preferred_equipment.filter((item): item is string => typeof item === 'string')
    : [],
});

export const toPickerOptions = (rows: CatalogRow[], preference: EquipmentPreference): ExercisePickerOption[] =>
  filterExercisesByEquipmentPreference(rows, preference).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscle_group,
    equipment: exercise.equipment,
    repsMin: exercise.rep_range_min,
    repsMax: exercise.rep_range_max,
    movementCategory: exercise.movement_category,
  }));

export async function loadPickerOptions(supabase: ServerClient, userId: string): Promise<ExercisePickerOption[]> {
  const [rows, { data: profile }] = await Promise.all([
    loadExerciseCatalog(supabase),
    supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id', userId).maybeSingle(),
  ]);
  return toPickerOptions(rows, equipmentPreferenceOf(profile));
}
