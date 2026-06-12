import { supabase } from "./supabase";

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

export interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: boolean;
  description: string | null;
  movement_category?: string | null;
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
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name, muscle_group, equipment, is_custom: true, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
