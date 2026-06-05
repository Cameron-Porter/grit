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

// Used in the workout History panel per exercise — shows most-recent session per program
export interface HistorySessionEntry {
  programName: string | null;
  programTotalWeeks: number | null;
  weekNumber: number | null;
  dayNumber: number | null;
  date: string;
  sets: { weight: number; reps: number; set_index: number }[];
}

export async function getExerciseSessionHistory(exerciseName: string): Promise<HistorySessionEntry[]> {
  const { data: setRows } = await supabase
    .from("workout_sets")
    .select("workout_id, weight, reps, set_index")
    .eq("exercise_name", exerciseName)
    .eq("completed", true)
    .order("set_index");

  if (!setRows?.length) return [];

  const workoutIds = [...new Set(setRows.map((r) => r.workout_id))];

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, completed_at, program_name, program_day_id")
    .in("id", workoutIds)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (!workouts?.length) return [];

  // Fetch program day info for workouts that came from a program
  const programDayIds = [...new Set(
    workouts.filter((w) => w.program_day_id).map((w) => w.program_day_id as string)
  )];

  const dayMap = new Map<string, { week_number: number; day_number: number; program_id: string }>();
  const programMap = new Map<string, { name: string; total_weeks: number }>();

  if (programDayIds.length > 0) {
    const { data: days } = await supabase
      .from("program_days")
      .select("id, week_number, day_number, program_id")
      .in("id", programDayIds);

    if (days) {
      days.forEach((d) => dayMap.set(d.id, {
        week_number: d.week_number,
        day_number: d.day_number,
        program_id: d.program_id,
      }));

      const programIds = [...new Set(days.map((d) => d.program_id))];
      const { data: programs } = await supabase
        .from("programs")
        .select("id, name, total_weeks")
        .in("id", programIds);

      if (programs) {
        programs.forEach((p) => programMap.set(p.id, { name: p.name, total_weeks: p.total_weeks }));
      }
    }
  }

  return workouts.map((w) => {
    const day = w.program_day_id ? dayMap.get(w.program_day_id) : null;
    const program = day ? programMap.get(day.program_id) : null;
    return {
      programName: program?.name ?? w.program_name ?? null,
      programTotalWeeks: program?.total_weeks ?? null,
      weekNumber: day?.week_number ?? null,
      dayNumber: day?.day_number ?? null,
      date: w.completed_at,
      sets: setRows
        .filter((s) => s.workout_id === w.id)
        .sort((a, b) => a.set_index - b.set_index),
    };
  });
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

// For viewing a completed program day's workout results
export interface WorkoutDayHistory {
  workoutId: string;
  completedAt: string;
  exercises: {
    name: string;
    sets: { weight: number; reps: number; completed: boolean; set_index: number }[];
  }[];
  feedback: {
    muscleGroup: string;
    pump: string | null;
    jointPain: string | null;
    volume: string | null;
  }[];
}

export async function getWorkoutForProgramDay(programDayId: string): Promise<WorkoutDayHistory | null> {
  const { data: workoutRows } = await supabase
    .from("workouts")
    .select("id, completed_at")
    .eq("program_day_id", programDayId)
    .order("completed_at", { ascending: false })
    .limit(1);

  const workout = workoutRows?.[0] ?? null;
  if (!workout) return null;

  const [{ data: sets }, { data: feedback }] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("exercise_name, weight, reps, set_index, completed")
      .eq("workout_id", workout.id)
      .order("exercise_name")
      .order("set_index"),
    supabase
      .from("workout_feedback")
      .select("muscle_group, pump, joint_pain, volume")
      .eq("workout_id", workout.id),
  ]);

  // Group sets by exercise
  const exerciseMap = new Map<string, { weight: number; reps: number; completed: boolean; set_index: number }[]>();
  (sets ?? []).forEach((s) => {
    const existing = exerciseMap.get(s.exercise_name) ?? [];
    existing.push({ weight: s.weight, reps: s.reps, completed: s.completed, set_index: s.set_index });
    exerciseMap.set(s.exercise_name, existing);
  });

  return {
    workoutId: workout.id,
    completedAt: workout.completed_at,
    exercises: Array.from(exerciseMap.entries()).map(([name, exSets]) => ({
      name,
      sets: exSets.sort((a, b) => a.set_index - b.set_index),
    })),
    feedback: (feedback ?? []).map((f) => ({
      muscleGroup: f.muscle_group,
      pump: f.pump ?? null,
      jointPain: f.joint_pain ?? null,
      volume: f.volume ?? null,
    })),
  };
}
