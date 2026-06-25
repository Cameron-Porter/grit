import { supabase } from "./supabase";

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

export interface PersonalRecord {
  id: string;
  exercise_name: string;
  weight: number;
  reps: number | null;
  achieved_at: string;
  updated_at: string;
}

export async function getAllPRs(): Promise<PersonalRecord[]> {
  const { data, error } = await supabase
    .from("personal_records")
    .select("*")
    .order("exercise_name");
  if (error) throw error;
  return data ?? [];
}

export async function getPRForExercise(exerciseName: string): Promise<PersonalRecord | null> {
  const { data } = await supabase
    .from("personal_records")
    .select("*")
    .ilike("exercise_name", exerciseName)
    .single();
  return data ?? null;
}

export async function upsertPR(
  exerciseName: string,
  weight: number,
  reps: number | null,
  isBodyweight = false,
): Promise<void> {
  const { data: existing } = await supabase
    .from("personal_records")
    .select("id, weight, reps")
    .ilike("exercise_name", exerciseName)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    const shouldUpdate = isBodyweight
      ? (reps != null && reps > (existing.reps ?? 0))
      : weight > existing.weight;
    if (shouldUpdate) {
      const { error } = await supabase
        .from("personal_records")
        .update({ weight, reps, achieved_at: now, updated_at: now })
        .eq("id", existing.id);
      if (error && __DEV__) console.error("upsertPR update:", error);
    }
  } else {
    const userId = await getUserId();
    const { error } = await supabase
      .from("personal_records")
      .insert({ exercise_name: exerciseName, weight, reps, achieved_at: now, user_id: userId });
    if (error && __DEV__) console.error("upsertPR insert:", error);
  }
}

export async function createManualPR(
  exerciseName: string,
  weight: number,
  reps: number | null,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("personal_records")
    .select("id")
    .ilike("exercise_name", exerciseName)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("personal_records")
      .update({ weight, reps, achieved_at: now, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const userId = await getUserId();
    const { error } = await supabase
      .from("personal_records")
      .insert({ exercise_name: exerciseName, weight, reps, achieved_at: now, user_id: userId });
    if (error) throw error;
  }
}

export async function getExerciseProgress(exerciseName: string): Promise<
  { date: string; maxWeight: number; maxReps: number; totalVolume: number; label: string }[]
> {
  const { data: sets } = await supabase
    .from("workout_sets")
    .select("weight, reps, completed, workout_id")
    .eq("exercise_name", exerciseName)
    .eq("completed", true);

  if (!sets || sets.length === 0) return [];

  const workoutIds = [...new Set(sets.map((s) => s.workout_id))];

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, completed_at")
    .in("id", workoutIds)
    .order("completed_at");

  if (!workouts || workouts.length === 0) return [];

  const byWorkout = new Map<string, { date: string; maxWeight: number; maxReps: number; totalVolume: number }>();
  workouts.forEach((w) => {
    byWorkout.set(w.id, { date: w.completed_at, maxWeight: 0, maxReps: 0, totalVolume: 0 });
  });
  sets.forEach((s) => {
    const entry = byWorkout.get(s.workout_id);
    if (entry) {
      entry.maxWeight = Math.max(entry.maxWeight, s.weight ?? 0);
      entry.maxReps = Math.max(entry.maxReps, s.reps ?? 0);
      entry.totalVolume += (s.weight ?? 0) * (s.reps ?? 0);
    }
  });

  const result = Array.from(byWorkout.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return result.map((r) => ({
    ...r,
    label: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
}
