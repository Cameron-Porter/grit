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
}

export interface ProgramDay {
  id: string;
  program_id: string;
  week_number: number;
  day_number: number;
  label: string | null;
  completed: boolean;
  completed_at: string | null;
}

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  exercise_name: string;
  muscle_group: string | null;
  equipment: string | null;
  sort_order: number;
  target_sets: number;
}

export async function getPrograms(): Promise<Program[]> {
  const userId = await getUserId();
  const query = supabase.from("programs").select("*").order("created_at", { ascending: false });
  if (userId) query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createProgram(
  name: string,
  totalWeeks: number,
  daysPerWeek: number,
  dayLabels?: string[],
): Promise<Program> {
  const userId = await getUserId();
  const { data: program, error: progError } = await supabase
    .from("programs")
    .insert({ name, total_weeks: totalWeeks, days_per_week: daysPerWeek, user_id: userId })
    .select()
    .single();
  if (progError) throw progError;

  // Auto-generate all program_days rows
  const days: Omit<ProgramDay, "id" | "completed" | "completed_at">[] = [];
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
  // Clear all current flags, then set the selected one
  await supabase.from("programs").update({ is_current: false }).neq("id", "");
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
): Promise<void> {
  const { error } = await supabase.from("program_exercises").insert({
    program_day_id: dayId,
    exercise_name: exerciseName,
    muscle_group: muscleGroup,
    equipment,
    sort_order: sortOrder,
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
  // Find first incomplete day in week/day order
  const nextDay = days
    .sort((a, b) => a.week_number !== b.week_number ? a.week_number - b.week_number : a.day_number - b.day_number)
    .find((d) => !d.completed);

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
