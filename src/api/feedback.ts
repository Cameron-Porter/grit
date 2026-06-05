import { supabase } from "./supabase";

export interface WorkoutFeedback {
  id: string;
  workout_id: string;
  muscle_group: string;
  joint_pain: string;
  pump: string;
  volume: string;
  created_at: string;
}

export async function saveFeedback(
  workoutId: string | null,
  muscleGroup: string,
  jointPain: string,
  pump: string,
  volume: string,
): Promise<void> {
  const { error } = await supabase.from("workout_feedback").insert({
    workout_id: workoutId,
    muscle_group: muscleGroup,
    joint_pain: jointPain,
    pump,
    volume,
  });
  if (error) console.error("saveFeedback:", error);
}

export async function getLastFeedbackForMuscle(muscleGroup: string): Promise<WorkoutFeedback | null> {
  const { data } = await supabase
    .from("workout_feedback")
    .select("*")
    .eq("muscle_group", muscleGroup)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}
