import { supabase } from "./supabase";

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

export interface Program {
  id: string;
  name: string;
  total_weeks: number;
  days_per_week: number;
  is_current: boolean;
  created_at: string;
  focus: string | null;
  muscle_priorities: Record<string, 'emphasize' | 'grow' | 'maintain'> | null;
  totalDays: number;
  completedDays: number;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  week_number: number;
  day_number: number;
  label: string | null;
  completed: boolean;
  completed_at: string | null;
  skipped: boolean;
}

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  exercise_name: string;
  muscle_group: string | null;
  equipment: string | null;
  sort_order: number;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  rir: number | null;
}

export interface ProgramDayTarget {
  exercise_name: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_weight: number;
  rir: number;
  ai_rationale: string | null;
}

export async function getPrograms(): Promise<Program[]> {
  const userId = await getUserId();
  const query = supabase
    .from("programs")
    .select("*, program_days(id, completed, skipped)")
    .order("created_at", { ascending: false });
  if (userId) query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p: any) => {
    const days: { completed: boolean; skipped: boolean }[] = p.program_days ?? [];
    const { program_days: _drop, ...rest } = p;
    return {
      ...rest,
      totalDays: days.length,
      completedDays: days.filter((d) => d.completed || d.skipped).length,
    };
  });
}

export async function getProgram(id: string): Promise<Program | null> {
  const { data, error } = await supabase
    .from("programs")
    .select("*, program_days(id, completed, skipped)")
    .eq("id", id)
    .single();
  if (error) return null;
  const days: { completed: boolean; skipped: boolean }[] = data.program_days ?? [];
  const { program_days: _drop, ...rest } = data;
  return { ...rest, totalDays: days.length, completedDays: days.filter((d) => d.completed || d.skipped).length };
}

export async function createProgram(
  name: string,
  totalWeeks: number,
  daysPerWeek: number,
  dayLabels?: string[],
  focus?: string,
  musclePriorities?: Record<string, string>,
): Promise<Program> {
  const userId = await getUserId();
  const { data: program, error: progError } = await supabase
    .from("programs")
    .insert({
      name,
      total_weeks: totalWeeks,
      days_per_week: daysPerWeek,
      user_id: userId,
      focus: focus ?? 'hypertrophy',
      muscle_priorities: musclePriorities ?? {},
    })
    .select()
    .single();
  if (progError) throw progError;

  // Auto-generate all program_days rows
  const days: Omit<ProgramDay, "id" | "completed" | "completed_at" | "skipped">[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    for (let day = 1; day <= daysPerWeek; day++) {
      days.push({
        program_id: program.id,
        week_number: week,
        day_number: day,
        label: dayLabels?.[day - 1] ?? null,
      });
    }
  }
  if (days.length > 0) {
    const { error: daysError } = await supabase.from("program_days").insert(days);
    if (daysError) throw daysError;
  }

  return program;
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw error;
}

export async function setCurrentProgram(id: string): Promise<void> {
  const userId = await getUserId();
  // Clear all flags for this user, then set the selected one
  if (userId) {
    await supabase.from("programs").update({ is_current: false }).eq("user_id", userId);
  } else {
    await supabase.from("programs").update({ is_current: false }).neq("id", id);
  }
  const { error } = await supabase.from("programs").update({ is_current: true }).eq("id", id);
  if (error) throw error;
}

export async function getProgramDays(programId: string): Promise<ProgramDay[]> {
  const { data, error } = await supabase
    .from("program_days")
    .select("*")
    .eq("program_id", programId)
    .order("week_number")
    .order("day_number");
  if (error) throw error;
  return data ?? [];
}

export async function getProgramExercises(dayId: string): Promise<ProgramExercise[]> {
  const { data, error } = await supabase
    .from("program_exercises")
    .select("*")
    .eq("program_day_id", dayId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function addProgramExercise(
  dayId: string,
  exerciseName: string,
  muscleGroup: string,
  equipment: string,
  sortOrder: number,
  targetSets?: number,
  targetRepsMin?: number,
  targetRepsMax?: number,
  rir?: number,
): Promise<void> {
  const { error } = await supabase.from("program_exercises").insert({
    program_day_id: dayId,
    exercise_name: exerciseName,
    muscle_group: muscleGroup,
    equipment,
    sort_order: sortOrder,
    target_sets: targetSets ?? 3,
    target_reps_min: targetRepsMin ?? null,
    target_reps_max: targetRepsMax ?? null,
    rir: rir ?? null,
  });
  if (error) throw error;
}

export async function removeProgramExercise(id: string): Promise<void> {
  const { error } = await supabase.from("program_exercises").delete().eq("id", id);
  if (error) throw error;
}

export async function getProgramDay(dayId: string): Promise<ProgramDay | null> {
  const { data } = await supabase
    .from("program_days")
    .select("*")
    .eq("id", dayId)
    .single();
  return data ?? null;
}

export async function getTemplateDayExercises(programId: string, dayNumber: number): Promise<ProgramExercise[]> {
  // Find week=1 day for this day_number and return its exercises
  const { data: templateDay } = await supabase
    .from("program_days")
    .select("id")
    .eq("program_id", programId)
    .eq("week_number", 1)
    .eq("day_number", dayNumber)
    .single();
  if (!templateDay) return [];
  return getProgramExercises(templateDay.id);
}

export async function getNextProgramWorkout(): Promise<{
  program: Program;
  day: ProgramDay;
  exercises: ProgramExercise[];
} | null> {
  const programs = await getPrograms();
  const current = programs.find((p) => p.is_current);
  if (!current) return null;

  const days = await getProgramDays(current.id);
  // Find first day not yet completed and not intentionally skipped
  const nextDay = days
    .sort((a, b) => a.week_number !== b.week_number ? a.week_number - b.week_number : a.day_number - b.day_number)
    .find((d) => !d.completed && !d.skipped);

  if (!nextDay) return null;

  // Exercises come from the week-1 template for this day_number
  const exercises = await getTemplateDayExercises(current.id, nextDay.day_number);

  return { program: current, day: nextDay, exercises };
}

export async function markDayComplete(dayId: string): Promise<void> {
  const { error } = await supabase
    .from("program_days")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", dayId);
  if (error) throw error;
}

export async function skipProgramDay(dayId: string): Promise<void> {
  const { error } = await supabase
    .from("program_days")
    .update({ skipped: true, completed: false, completed_at: null })
    .eq("id", dayId);
  if (error) throw error;
}

export async function unskipProgramDay(dayId: string): Promise<void> {
  const { error } = await supabase
    .from("program_days")
    .update({ skipped: false })
    .eq("id", dayId);
  if (error) throw error;
}

export async function getProgramWeekCompletedDays(programId: string, weekNumber: number): Promise<ProgramDay[]> {
  const { data } = await supabase
    .from("program_days")
    .select("*")
    .eq("program_id", programId)
    .eq("week_number", weekNumber)
    .eq("completed", true)
    .order("day_number");
  return (data ?? []) as ProgramDay[];
}

export async function updateProgramExerciseTargets(
  exerciseId: string,
  targets: { target_sets: number; target_reps_min: number; target_reps_max: number; target_weight: number; rir: number },
): Promise<void> {
  await supabase.from("program_exercises").update(targets).eq("id", exerciseId);
}

export async function replaceExerciseInTemplate(
  programDayId: string,
  oldExerciseName: string,
  newExerciseName: string,
  newMuscleGroup: string,
  newEquipment: string,
): Promise<void> {
  const { data: dayRow } = await supabase
    .from("program_days")
    .select("program_id, day_number")
    .eq("id", programDayId)
    .single();
  if (!dayRow) return;

  const templateExercises = await getTemplateDayExercises(dayRow.program_id, dayRow.day_number);
  const target = templateExercises.find((e) => e.exercise_name === oldExerciseName);
  if (!target) return;

  await supabase.from("program_exercises").update({
    exercise_name: newExerciseName,
    muscle_group: newMuscleGroup || target.muscle_group,
    equipment: newEquipment || target.equipment,
  }).eq("id", target.id);
}

export async function getProgramDayTargets(programDayId: string): Promise<ProgramDayTarget[]> {
  const { data } = await supabase
    .from("program_day_targets")
    .select("exercise_name, target_sets, target_reps_min, target_reps_max, target_weight, rir, ai_rationale")
    .eq("program_day_id", programDayId);
  return (data ?? []) as ProgramDayTarget[];
}

export async function saveProgramDayTargets(
  programDayId: string,
  targets: { exerciseName: string; sets: number; repsMin: number; repsMax: number; weightLbs: number; rir: number; rationale?: string }[],
): Promise<void> {
  if (!targets.length) return;
  const rows = targets.map((t) => ({
    program_day_id: programDayId,
    exercise_name: t.exerciseName,
    target_sets: t.sets,
    target_reps_min: t.repsMin,
    target_reps_max: t.repsMax,
    target_weight: t.weightLbs,
    rir: t.rir,
    ai_rationale: t.rationale ?? null,
  }));
  await supabase.from("program_day_targets").upsert(rows, { onConflict: "program_day_id,exercise_name" });
}

// Returns true if any of the given exercises were logged in a previous completed workout
// of the same program. Uses exercise names (not muscle_group) so it works even if
// workout_sets.muscle_group was NULL for older rows.
export async function checkMuscleGroupPreviouslyTrained(
  programDayId: string,
  exerciseNames: string[],
): Promise<boolean> {
  if (!exerciseNames.length) return false;

  const { data: day } = await supabase
    .from("program_days")
    .select("program_id")
    .eq("id", programDayId)
    .single();

  if (!day) return false;

  const { data: otherDays } = await supabase
    .from("program_days")
    .select("id")
    .eq("program_id", day.program_id)
    .eq("completed", true)
    .neq("id", programDayId);

  if (!otherDays?.length) return false;

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id")
    .in("program_day_id", otherDays.map((d) => d.id));

  if (!workouts?.length) return false;

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("id")
    .in("workout_id", workouts.map((w) => w.id))
    .in("exercise_name", exerciseNames)
    .limit(1);

  return (sets?.length ?? 0) > 0;
}
