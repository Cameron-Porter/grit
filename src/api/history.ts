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

export async function getLastSessionSets(exerciseName: string) {
  // Step 1: find all workout_ids that include this exercise
  const { data: setRows } = await supabase
    .from("workout_sets")
    .select("workout_id")
    .eq("exercise_name", exerciseName);

  if (!setRows || setRows.length === 0) return [];

  const workoutIds = [...new Set(setRows.map((r) => r.workout_id))];

  // Step 2: find the most recent of those workouts
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id")
    .in("id", workoutIds)
    .order("completed_at", { ascending: false })
    .limit(1);

  if (!workouts || workouts.length === 0) return [];

  const latestId = workouts[0].id;

  // Step 3: get the actual sets for that workout
  const { data: sets } = await supabase
    .from("workout_sets")
    .select("weight, reps, set_index")
    .eq("exercise_name", exerciseName)
    .eq("workout_id", latestId)
    .order("set_index");

  return sets || [];
}
