import { getExerciseAllSessions } from './history';
import { getTemplateDayExercises, updateProgramExerciseTargets } from './programs';
import { supabase } from './supabase';
import { getExerciseByName } from '../data/exerciseDatabase';
import {
  recommendProgression,
  type ProgressionContext,
  type SessionPerformance,
} from '../rules/progressionEngine';
import type { ExperienceLevel } from '../types/program';

// Called after a workout is finished. Reads session history for every exercise
// in the week-1 template for this day, runs the progression engine, and writes
// the resulting targets back to program_exercises.target_weight so they are
// pre-filled the next time the same day is loaded.
//
// This is a background operation — callers should fire-and-forget with .catch.
export async function computeAndSaveProgressionTargets(
  programDayId: string,
  experienceLevel: ExperienceLevel,
): Promise<void> {
  // Resolve day → program_id, week_number, day_number
  const { data: dayRow } = await supabase
    .from('program_days')
    .select('program_id, week_number, day_number')
    .eq('id', programDayId)
    .single();

  if (!dayRow) return;

  // Resolve program → total_weeks (needed to detect deload week)
  const { data: programRow } = await supabase
    .from('programs')
    .select('total_weeks')
    .eq('id', dayRow.program_id)
    .single();

  if (!programRow) return;

  const totalMesoWeeks: number = programRow.total_weeks;
  const mesoWeek: number = dayRow.week_number;
  const isDeload = mesoWeek === totalMesoWeeks;

  // Week-1 template exercises for this day_number — these hold target_weight
  const templateExercises = await getTemplateDayExercises(dayRow.program_id, dayRow.day_number);
  if (!templateExercises.length) return;

  const ctx: ProgressionContext = {
    experienceLevel,
    isDeload,
    mesoWeek,
    totalMesoWeeks,
  };

  await Promise.all(
    templateExercises.map(async (ex) => {
      const repsMin = ex.target_reps_min ?? 8;
      const repsMax = ex.target_reps_max ?? 12;

      // Fetch all completed sessions for this exercise (newest first, capped at 8)
      const allSessions = await getExerciseAllSessions(ex.exercise_name);
      const sessions: SessionPerformance[] = allSessions
        .slice(0, 8)
        .map((s) => ({
          date: s.date,
          sets: s.sets.filter((set) => set.reps > 0),
        }))
        .filter((s) => s.sets.length > 0);

      const exerciseDef = getExerciseByName(ex.exercise_name);
      const prescription = {
        sets: ex.target_sets,
        repsMin,
        repsMax,
        rir: ex.rir ?? 3,
        exerciseType: exerciseDef?.exerciseType,
        // role: no slot_role column in DB yet; engine defaults to 'Primary'
      };

      const rec = recommendProgression(prescription, sessions, ctx);

      // Skip write-back when there is no history (FIRST_SESSION has weight = 0)
      if (rec.action === 'FIRST_SESSION' || rec.nextWeight === 0) return;

      await updateProgramExerciseTargets(ex.id, {
        target_sets: rec.nextSets,
        target_reps_min: rec.nextRepsMin,
        target_reps_max: rec.nextRepsMax,
        target_weight: rec.nextWeight,
        rir: rec.nextRir,
      });
    }),
  );
}
