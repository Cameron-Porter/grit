import { supabase } from "./supabase";
import { useWorkoutStore } from "../store/useWorkoutStore";

export async function saveWorkout() {
  const { exercises } = useWorkoutStore.getState();

  const workoutId = crypto.randomUUID();

  // 1. create workout
  const { error: workoutError } = await supabase.from("workouts").insert({
    id: workoutId,
    name: "Workout",
    completed_at: new Date().toISOString(),
  });

  if (workoutError) throw workoutError;

  // 2. flatten sets
  const sets = exercises.flatMap((ex) =>
    ex.sets.map((set, i) => ({
      workout_id: workoutId,
      exercise_name: ex.name,
      set_index: i,
      reps: set.reps,
      weight: set.weight,
      completed: set.completed,
    }))
  );

  const { error: setsError } = await supabase
    .from("workout_sets")
    .insert(sets);

  if (setsError) throw setsError;

  return workoutId;
}