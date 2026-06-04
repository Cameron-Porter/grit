import { supabase } from "./supabase";

export async function getWorkouts() {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getWorkoutDetails(workoutId: string) {
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId);

  if (error) throw error;

  return data;
}