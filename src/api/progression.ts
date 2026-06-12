import { getExerciseAllSessions } from './history';
import { getTemplateDayExercises, saveProgramDayTargets } from './programs';
import { supabase } from './supabase';
import { getExerciseByName } from '../data/exerciseDatabase';
import {
  recommendProgression,
  type MusclePriority,
  type ProgressionContext,
  type ProgramFocus,
  type SessionPerformance,
} from '../rules/progressionEngine';
import type { ExperienceLevel } from '../types/program';

// Called after a workout finishes. Writes progression targets to program_day_targets
// for (a) the next week's same day slot and (b) same-week future days sharing exercises.
// Never touches program_exercises (the week-1 template set by the user).
export async function computeAndSaveProgressionTargets(
  programDayId: string,
  experienceLevel: ExperienceLevel,
): Promise<void> {
  const { data: dayRow } = await supabase
    .from('program_days')
    .select('program_id, week_number, day_number')
    .eq('id', programDayId)
    .single();
  if (!dayRow) return;

  const { data: programRow } = await supabase
    .from('programs')
    .select('total_weeks, focus, muscle_priorities')
    .eq('id', dayRow.program_id)
    .single();
  if (!programRow) return;

  const totalMesoWeeks: number = programRow.total_weeks;
  const programFocus = (programRow.focus ?? 'hypertrophy') as ProgramFocus;
  const musclePriorities: Record<string, string> = programRow.muscle_priorities ?? {};
  const templateExercises = await getTemplateDayExercises(dayRow.program_id, dayRow.day_number);
  if (!templateExercises.length) return;

  // ── 1. Week-over-week: generate targets for next week's same day slot ─────────
  const nextWeek = dayRow.week_number + 1;
  if (nextWeek <= totalMesoWeeks) {
    const { data: nextDayRow } = await supabase
      .from('program_days')
      .select('id')
      .eq('program_id', dayRow.program_id)
      .eq('week_number', nextWeek)
      .eq('day_number', dayRow.day_number)
      .maybeSingle();

    if (nextDayRow) {
      const isDeload = nextWeek === totalMesoWeeks;

      const targets = (
        await Promise.all(
          templateExercises.map(async (ex) => {
            const musclePriority = (
              ex.muscle_group ? musclePriorities[ex.muscle_group] : undefined
            ) as MusclePriority | undefined;

            const ctx: ProgressionContext = {
              experienceLevel,
              isDeload,
              mesoWeek: nextWeek,
              totalMesoWeeks,
              programFocus,
              musclePriority,
            };

            const allSessions = await getExerciseAllSessions(ex.exercise_name);
            const sessions: SessionPerformance[] = allSessions
              .slice(0, 8)
              .map((s) => ({ date: s.date, sets: s.sets.filter((set) => set.reps > 0) }))
              .filter((s) => s.sets.length > 0);

            const exerciseDef = getExerciseByName(ex.exercise_name);
            const rec = recommendProgression(
              {
                sets: ex.target_sets,
                repsMin: ex.target_reps_min ?? 8,
                repsMax: ex.target_reps_max ?? 12,
                rir: ex.rir ?? 3,
                exerciseType: exerciseDef?.exerciseType,
              },
              sessions,
              ctx,
            );

            if (rec.action === 'FIRST_SESSION' || rec.nextWeight === 0) return null;
            return {
              exerciseName: ex.exercise_name,
              sets: rec.nextSets,
              repsMin: rec.nextRepsMin,
              repsMax: rec.nextRepsMax,
              weightLbs: rec.nextWeight,
              rir: rec.nextRir,
              rationale: rec.reason,
            };
          }),
        )
      ).filter(Boolean) as Parameters<typeof saveProgramDayTargets>[1];

      if (targets.length > 0) {
        await saveProgramDayTargets(nextDayRow.id, targets);
      }
    }
  }

  // ── 2. Intra-week: pre-fill later days in the same week that share exercises ──
  // Uses the most recent logged session weight — no progression within a week.
  const exerciseNames = new Set(templateExercises.map((e) => e.exercise_name));

  const { data: laterDays } = await supabase
    .from('program_days')
    .select('id, day_number')
    .eq('program_id', dayRow.program_id)
    .eq('week_number', dayRow.week_number)
    .gt('day_number', dayRow.day_number)
    .eq('completed', false);

  if (laterDays?.length) {
    for (const futureDay of laterDays) {
      const futureDayExercises = await getTemplateDayExercises(dayRow.program_id, futureDay.day_number);
      const shared = futureDayExercises.filter((e) => exerciseNames.has(e.exercise_name));
      if (!shared.length) continue;

      const targets = (
        await Promise.all(
          shared.map(async (ex) => {
            const allSessions = await getExerciseAllSessions(ex.exercise_name);
            if (!allSessions.length) return null;
            const lastWeight = Math.max(...allSessions[0].sets.map((s) => s.weight));
            if (!lastWeight) return null;
            return {
              exerciseName: ex.exercise_name,
              sets: ex.target_sets,
              repsMin: ex.target_reps_min ?? 8,
              repsMax: ex.target_reps_max ?? 12,
              weightLbs: lastWeight,
              rir: ex.rir ?? 3,
              rationale: 'Pre-filled from earlier session this week.',
            };
          }),
        )
      ).filter(Boolean) as Parameters<typeof saveProgramDayTargets>[1];

      if (targets.length > 0) {
        await saveProgramDayTargets(futureDay.id, targets);
      }
    }
  }
}
