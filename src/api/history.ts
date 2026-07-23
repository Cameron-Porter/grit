import { supabase } from "./supabase";

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

export async function getWorkouts() {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .order("completed_at", { ascending: false });
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


export interface ExerciseSession {
  workoutId: string;
  date: string;
  programName: string | null;
  sets: { weight: number; reps: number; set_index: number }[];
}

/**
 * Returns a map of exercise_name → chronological array of max weights per session.
 * Used for PR sparklines. One query rather than N per-exercise queries.
 */
export async function getSparklineData(exerciseNames: string[]): Promise<Record<string, number[]>> {
  if (!exerciseNames.length) return {};

  const { data: rows } = await supabase
    .from('workout_sets')
    .select('exercise_name, weight, workout_id')
    .in('exercise_name', exerciseNames)
    .eq('completed', true)
    .gt('weight', 0);

  if (!rows?.length) return {};

  const workoutIds = [...new Set(rows.map((r) => r.workout_id))];
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, completed_at')
    .in('id', workoutIds)
    .order('completed_at', { ascending: true });

  if (!workouts?.length) return {};

  const dateByWorkout = new Map(workouts.map((w) => [w.id, w.completed_at]));

  // Group by exercise → workout → max weight
  const map: Record<string, Map<string, { date: string; max: number }>> = {};

  for (const row of rows) {
    if (!map[row.exercise_name]) map[row.exercise_name] = new Map();
    const existing = map[row.exercise_name].get(row.workout_id);
    const date = dateByWorkout.get(row.workout_id) ?? '';
    if (!existing || row.weight > existing.max) {
      map[row.exercise_name].set(row.workout_id, { date, max: row.weight });
    }
  }

  const result: Record<string, number[]> = {};
  for (const [name, workoutMap] of Object.entries(map)) {
    const sorted = [...workoutMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    result[name] = sorted.map((s) => s.max);
  }

  return result;
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
    muscleGroup: string | null;
    equipment: string | null;
    note: string | null;
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
      .select("exercise_name, muscle_group, equipment, note, weight, reps, exercise_index, set_index, completed")
      .eq("workout_id", workout.id)
      .order("exercise_index", { ascending: true, nullsFirst: false })
      .order("exercise_name")
      .order("set_index"),
    supabase
      .from("workout_feedback")
      .select("muscle_group, pump, joint_pain, volume")
      .eq("workout_id", workout.id),
  ]);

  // Group sets by exercise, carrying muscle_group and note from the first row
  const exerciseMap = new Map<string, {
    muscleGroup: string | null;
    equipment: string | null;
    note: string | null;
    sets: { weight: number; reps: number; completed: boolean; set_index: number }[];
  }>();
  (sets ?? []).forEach((s) => {
    if (!exerciseMap.has(s.exercise_name)) {
      exerciseMap.set(s.exercise_name, {
        muscleGroup: s.muscle_group ?? null,
        equipment: s.equipment ?? null,
        note: s.note ?? null,
        sets: [],
      });
    }
    exerciseMap.get(s.exercise_name)!.sets.push({ weight: s.weight, reps: s.reps, completed: s.completed, set_index: s.set_index });
  });

  return {
    workoutId: workout.id,
    completedAt: workout.completed_at,
    exercises: Array.from(exerciseMap.entries()).map(([name, ex]) => ({
      name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      note: ex.note,
      sets: ex.sets.sort((a, b) => a.set_index - b.set_index),
    })),
    feedback: (feedback ?? []).map((f) => ({
      muscleGroup: f.muscle_group,
      pump: f.pump ?? null,
      jointPain: f.joint_pain ?? null,
      volume: f.volume ?? null,
    })),
  };
}

// Sums completed sets per muscle group across every finished workout in a given
// program week. Used for the weekly MEV/MAV/MRV badge — that landmark is a
// weekly target, so it must read across all sessions in the week, not just the
// one currently in progress (which isn't in workout_sets yet until Finish).
export async function getWeeklyCompletedSetsByMuscle(
  programId: string,
  weekNumber: number,
): Promise<Record<string, number>> {
  const userId = await getUserId();
  if (!userId) return {};

  const { data: days } = await supabase
    .from("program_days")
    .select("id")
    .eq("program_id", programId)
    .eq("week_number", weekNumber);
  if (!days?.length) return {};

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id")
    .in("program_day_id", days.map((d) => d.id));
  if (!workouts?.length) return {};

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("muscle_group")
    .in("workout_id", workouts.map((w) => w.id))
    .eq("completed", true);
  if (!sets?.length) return {};

  const counts: Record<string, number> = {};
  for (const s of sets) {
    if (!s.muscle_group) continue;
    counts[s.muscle_group] = (counts[s.muscle_group] ?? 0) + 1;
  }
  return counts;
}

// Returns the most recent joint_pain rating per muscle group.
// Used to show pain warnings on exercise cards when starting a program day.
export async function getLastMuscleGroupFeedback(
  muscleGroups: string[],
): Promise<Record<string, string | null>> {
  if (muscleGroups.length === 0) return {};
  const { data } = await supabase
    .from('workout_feedback')
    .select('muscle_group, joint_pain, workouts!inner(completed_at)')
    .in('muscle_group', muscleGroups);

  if (!data) return {};

  // Sort newest first, keep first occurrence of each muscle group
  const sorted = [...data].sort((a, b) =>
    new Date((b.workouts as any).completed_at).getTime() -
    new Date((a.workouts as any).completed_at).getTime(),
  );

  const result: Record<string, string | null> = {};
  for (const row of sorted) {
    if (!(row.muscle_group in result)) {
      result[row.muscle_group] = row.joint_pain ?? null;
    }
  }
  return result;
}

/**
 * Returns the number of consecutive days (ending today) on which the user
 * completed at least one workout. Used to personalise reminder notifications.
 */
export async function getWorkoutStreak(): Promise<number> {
  // RLS ensures this only returns the authenticated user's workouts.
  const { data } = await supabase
    .from('workouts')
    .select('completed_at')
    .order('completed_at', { ascending: false })
    .limit(500);

  if (!data?.length) return 0;

  const dates = new Set(data.map((w) => w.completed_at.slice(0, 10)));

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 500; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
    } else if (i === 0) {
      // Today has no workout yet — start counting from yesterday
      continue;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Returns true if the most recent past training day (within 14 days) had no
 * completed workout logged. Used to show "missed session" copy in notifications.
 */
export async function hasMissedRecentWorkout(trainingWeekdays: number[]): Promise<boolean> {
  if (!trainingWeekdays.length) return false;

  const today = new Date();
  for (let daysBack = 1; daysBack <= 14; daysBack++) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysBack);
    if (!trainingWeekdays.includes(d.getDay())) continue;

    const dateKey = d.toISOString().slice(0, 10);
    const { data } = await supabase
      .from('workouts')
      .select('id')
      .gte('completed_at', `${dateKey}T00:00:00.000Z`)
      .lte('completed_at', `${dateKey}T23:59:59.999Z`)
      .limit(1);

    return !(data?.length ?? 0);
  }
  return false;
}
