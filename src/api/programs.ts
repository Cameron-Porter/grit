import { supabase } from "./supabase";
import { getExerciseByName } from "../data/exerciseDatabase";
import type { ProgramFocus, SlotRole } from "../types/program";

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
  equipment: string;
  sort_order: number;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  rir: number | null;
  // Null for programs created before this column existed — progression
  // falls back to treating the exercise as Primary, same as always.
  role: SlotRole | null;
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

export async function renameProgram(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("programs").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function endCurrentProgram(): Promise<void> {
  const userId = await getUserId();
  const query = supabase.from("programs").update({ is_current: false });
  if (userId) query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
}

export async function updateProgramMusclePriorities(
  id: string,
  priorities: Record<string, 'emphasize' | 'grow' | 'maintain'>,
): Promise<void> {
  const { error } = await supabase.from("programs").update({ muscle_priorities: priorities }).eq("id", id);
  if (error) throw error;
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProgram(id: string, newName?: string): Promise<Program> {
  const original = await getProgram(id);
  if (!original) throw new Error('Program not found');

  const allOriginalDays = await getProgramDays(id);
  const week1Original = allOriginalDays
    .filter((d) => d.week_number === 1)
    .sort((a, b) => a.day_number - b.day_number);

  const dayLabels = week1Original.map((d) => d.label ?? '');

  const copy = await createProgram(
    newName?.trim() || original.name,
    original.total_weeks,
    original.days_per_week,
    dayLabels,
    original.focus ?? 'hypertrophy',
    (original.muscle_priorities ?? {}) as Record<string, string>,
  );

  const allNewDays = await getProgramDays(copy.id);
  const week1New = allNewDays
    .filter((d) => d.week_number === 1)
    .sort((a, b) => a.day_number - b.day_number);

  for (let i = 0; i < week1Original.length; i++) {
    const origDay = week1Original[i];
    const newDay = week1New[i];
    if (!origDay || !newDay) continue;
    const exercises = await getProgramExercises(origDay.id);
    for (const ex of exercises) {
      await addProgramExercise(
        newDay.id,
        ex.exercise_name,
        ex.muscle_group ?? '',
        ex.equipment,
        ex.sort_order,
        ex.target_sets,
        ex.target_reps_min ?? undefined,
        ex.target_reps_max ?? undefined,
        ex.rir ?? undefined,
        ex.role ?? undefined,
      );
    }
  }

  return copy;
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

// TEMPORARY — one-time fix for programs created before program_exercises
// retained a role (see migration 20260730000001 and progressionEngine.ts
// getLoadIncrement). There is no way to recover the exact role a slot was
// originally generated with, and exerciseDatabase.ts is a small rules-engine
// fixture, not a mirror of every real exercise name variant users actually
// log (confirmed in practice: "Incline Dumbbell Flyes", "Leaning Dumbbell
// Lateral Raise", "Dumbbell Rear Delt Flyes", "Bench Dips", and even the
// compound "Pull-Up (Normal Grip)" all fail to match it). So this only
// infers a role when the name resolves to a real, classified exercise:
// isolation/core -> Accessory; the first classified compound movement for a
// given muscle in a day -> Primary; any later classified compound for that
// same muscle -> Secondary. An unmatched name is left untouched (null) —
// guessing "probably compound" for an unmatched name was the bug: it wrongly
// claimed the muscle's Primary slot ahead of the real compound lift later in
// the day, bumping that real compound down to Secondary. Safe to call
// repeatedly (idempotent) and safe to delete once no program in use predates
// the role column.
function inferSlotRole(exerciseName: string, isFirstCompoundForMuscle: boolean): SlotRole | null {
  const def = getExerciseByName(exerciseName);
  if (!def) return null;
  if (def.exerciseType === 'isolation' || def.exerciseType === 'core') return 'Accessory';
  return isFirstCompoundForMuscle ? 'Primary' : 'Secondary';
}

// TEMPORARY — see inferSlotRole. Backfills `role` on every Week 1
// program_exercises row for this program whose exercise name resolves to a
// classified exercise, then returns how many rows were updated. Rows whose
// name doesn't match anything are left alone rather than guessed at.
export async function backfillWeek1ExerciseRoles(programId: string): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  const { data: week1Days } = await supabase
    .from("program_days")
    .select("id")
    .eq("program_id", programId)
    .eq("week_number", 1);
  if (!week1Days?.length) return 0;

  const { data: exercises } = await supabase
    .from("program_exercises")
    .select("id, program_day_id, muscle_group, exercise_name, sort_order")
    .in("program_day_id", week1Days.map((d) => d.id))
    .order("sort_order");
  if (!exercises?.length) return 0;

  const seenCompoundForMuscle = new Set<string>();
  let updated = 0;

  for (const ex of exercises) {
    const key = `${ex.program_day_id}:${ex.muscle_group}`;
    const isFirstCompound = !seenCompoundForMuscle.has(key);
    const role = inferSlotRole(ex.exercise_name, isFirstCompound);
    if (role === null) continue; // no signal — don't guess, don't consume the muscle's Primary slot
    if (role !== 'Accessory') seenCompoundForMuscle.add(key);

    const { error } = await supabase.from("program_exercises").update({ role }).eq("id", ex.id);
    if (!error) updated++;
  }

  return updated;
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
  role?: SlotRole,
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
    role: role ?? null,
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

/**
 * Returns the day labels for the active program in day_number order (Week 1 template).
 * e.g. ["Push", "Pull", "Legs"] for a 3-day PPL program.
 * Returns [] if no active program exists.
 */
export async function getActiveProgramDayLabels(): Promise<string[]> {
  const programs = await getPrograms();
  const current = programs.find((p) => p.is_current);
  if (!current) return [];

  const days = await getProgramDays(current.id);
  return days
    .filter((d) => d.week_number === 1)
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => d.label ?? '')
    .filter(Boolean);
}

/**
 * Returns the active program's focus, or 'hypertrophy' if there is no active
 * program. Used by Quick Workout generation so an ad-hoc session follows
 * whatever doctrine (rep ranges, RIR, deload protocol) the user's current
 * program already uses, rather than silently defaulting for everyone.
 */
export async function getCurrentProgramFocus(): Promise<ProgramFocus> {
  const programs = await getPrograms();
  const current = programs.find((p) => p.is_current);
  return (current?.focus as ProgramFocus | null) ?? 'hypertrophy';
}

/**
 * Infers which weekday each program day falls on from the active program's
 * completion history. Returns one entry per day_number that has been completed
 * at least once, using the most recent completion to determine the weekday.
 *
 * Used to schedule workout reminder notifications on the user's actual training
 * days instead of a hardcoded schedule.
 */
export async function getActiveProgramTrainingDays(): Promise<{ weekday: number; label?: string }[]> {
  const programs = await getPrograms();
  const current = programs.find((p) => p.is_current);
  if (!current) return [];

  const allDays = await getProgramDays(current.id);
  const week1 = allDays
    .filter((d) => d.week_number === 1)
    .sort((a, b) => a.day_number - b.day_number);

  // For each day_number, find the most recently completed weekday
  const latestByDayNum = new Map<number, { date: string; weekday: number }>();
  for (const day of allDays) {
    if (!day.completed || !day.completed_at) continue;
    const weekday = new Date(day.completed_at).getDay();
    const existing = latestByDayNum.get(day.day_number);
    if (!existing || day.completed_at > existing.date) {
      latestByDayNum.set(day.day_number, { date: day.completed_at, weekday });
    }
  }

  return week1
    .map((d) => {
      const info = latestByDayNum.get(d.day_number);
      if (!info) return null;
      return { weekday: info.weekday, label: d.label ?? undefined };
    })
    .filter(Boolean) as { weekday: number; label?: string }[];
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
  const templateExercises = await getTemplateDayExercises(current.id, nextDay.day_number);

  // Bug fix: this used to return the raw template exercises, whose
  // target_weight is always null (addProgramExercise never sets it —
  // program_exercises is the frozen week-1 template, not a live target).
  // Every non-Bodyweight exercise's weight field then fell back to 0 the
  // instant a workout auto-loaded here (the common "Finish -> next workout
  // auto-loads" path), even though computeAndSaveProgressionTargets had
  // already computed a real next-session weight into program_day_targets.
  // Bodyweight exercises masked this — they're rescued by a separate
  // bodyWeight-from-profile fallback in useWorkoutStore — but every other
  // equipment type showed a blank/zeroed weight field. Merge in
  // program_day_targets here the same way handleStartWorkout in
  // day/[dayId].tsx already does, so this path can't diverge from the one
  // that was already correct.
  const dayTargets = await getProgramDayTargets(nextDay.id);
  const exercises = templateExercises.map((e) => {
    const aiTarget = dayTargets.find((t) => t.exercise_name === e.exercise_name);
    if (!aiTarget) return e;
    return {
      ...e,
      target_sets: aiTarget.target_sets ?? e.target_sets,
      target_reps_min: aiTarget.target_reps_min ?? e.target_reps_min,
      target_reps_max: aiTarget.target_reps_max ?? e.target_reps_max,
      target_weight: aiTarget.target_weight ?? e.target_weight,
      rir: aiTarget.rir ?? e.rir,
    };
  });

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

// Sums planned (not-yet-started) sets per muscle group for the remaining days
// in a program week, so the weekly MEV/MAV/MRV badge can reflect what's still
// scheduled, not just what's already logged. Mirrors the same
// program_day_targets-overrides-program_exercises resolution used when a day
// is actually started (see day/[dayId].tsx handleStartWorkout).
export async function getFutureScheduledSetsByMuscle(
  programId: string,
  weekNumber: number,
  afterDayNumber: number,
): Promise<Record<string, number>> {
  const userId = await getUserId();
  if (!userId) return {};

  const { data: days } = await supabase
    .from("program_days")
    .select("id, day_number")
    .eq("program_id", programId)
    .eq("week_number", weekNumber)
    .gt("day_number", afterDayNumber)
    .eq("completed", false)
    .eq("skipped", false);
  if (!days?.length) return {};

  const counts: Record<string, number> = {};
  for (const day of days) {
    const [templateExercises, dayTargets] = await Promise.all([
      getTemplateDayExercises(programId, day.day_number),
      getProgramDayTargets(day.id),
    ]);
    for (const ex of templateExercises) {
      if (!ex.muscle_group) continue;
      const override = dayTargets.find((t) => t.exercise_name === ex.exercise_name);
      const sets = override?.target_sets ?? ex.target_sets ?? 0;
      counts[ex.muscle_group] = (counts[ex.muscle_group] ?? 0) + sets;
    }
  }
  return counts;
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

// Returns true if the given muscle group was logged in a previous completed workout
// of the same program, regardless of which exercise was used to train it.
export async function checkMuscleGroupPreviouslyTrained(
  programDayId: string,
  muscleGroup: string,
): Promise<boolean> {
  if (!muscleGroup) return false;

  const { data: day } = await supabase
    .from("program_days")
    .select("program_id")
    .eq("id", programDayId)
    .maybeSingle();

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
    .eq("muscle_group", muscleGroup)
    .limit(1);

  return (sets?.length ?? 0) > 0;
}
