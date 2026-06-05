import { supabase } from "./supabase";

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
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProgram(
  name: string,
  totalWeeks: number,
  daysPerWeek: number,
): Promise<Program> {
  const { data: program, error: progError } = await supabase
    .from("programs")
    .insert({ name, total_weeks: totalWeeks, days_per_week: daysPerWeek })
    .select()
    .single();
  if (progError) throw progError;

  // Auto-generate all program_days rows
  const days: Omit<ProgramDay, "id" | "completed" | "completed_at">[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    for (let day = 1; day <= daysPerWeek; day++) {
      days.push({ program_id: program.id, week_number: week, day_number: day, label: null });
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

export async function markDayComplete(dayId: string): Promise<void> {
  const { error } = await supabase
    .from("program_days")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", dayId);
  if (error) throw error;
}
