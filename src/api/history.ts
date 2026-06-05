import { supabase } from "./supabase";

export async function getWorkouts() {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .order("completed_at", { ascending: false });
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
  const { data: setRows } = await supabase
    .from("workout_sets")
    .select("workout_id")
    .eq("exercise_name", exerciseName);

  if (!setRows || setRows.length === 0) return [];

  const workoutIds = [...new Set(setRows.map((r) => r.workout_id))];

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id")
    .in("id", workoutIds)
    .order("completed_at", { ascending: false })
    .limit(1);

  if (!workouts || workouts.length === 0) return [];

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("weight, reps, set_index")
    .eq("exercise_name", exerciseName)
    .eq("workout_id", workouts[0].id)
    .order("set_index");

  return sets || [];
}

export interface ExerciseSession {
  workoutId: string;
  date: string;
  programName: string | null;
  sets: { weight: number; reps: number; set_index: number }[];
}

export async function getExerciseAllSessions(exerciseName: string): Promise<ExerciseSession[]> {
  const { data: setRows } = await supabase
    .from("workout_sets")
    .select("workout_id, weight, reps, set_index")
    .eq("exercise_name", exerciseName)
    .eq("completed", true)
    .order("set_index");

  if (!setRows || setRows.length === 0) return [];

  const workoutIds = [...new Set(setRows.map((r) => r.workout_id))];

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, completed_at, program_name")
    .in("id", workoutIds)
    .order("completed_at", { ascending: false });

  if (!workouts) return [];

  return workouts.map((w) => ({
    workoutId: w.id,
    date: w.completed_at,
    programName: w.program_name ?? null,
    sets: setRows
      .filter((s) => s.workout_id === w.id)
      .sort((a, b) => a.set_index - b.set_index),
  }));
}
