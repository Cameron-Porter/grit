import { supabase } from "./supabase";

export interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: boolean;
  description: string | null;
}

export async function getExercises(): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("muscle_group")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createCustomExercise(
  name: string,
  muscle_group: string,
  equipment: string,
): Promise<ExerciseRow> {
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name, muscle_group, equipment, is_custom: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}
