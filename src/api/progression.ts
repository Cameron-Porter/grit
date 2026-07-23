import * as Sentry from '@sentry/react-native';
import { getExerciseAllSessions } from './history';
import { getTemplateDayExercises, saveProgramDayTargets } from './programs';
import { supabase } from './supabase';
import { getExerciseByName } from '../data/exerciseDatabase';
import { rampSets } from '../rules/volumeRamp';
import { getLandmark } from '../utils/volumeLandmarks';
import {
  recommendProgression,
  type MusclePriority,
  type ProgressionContext,
  type ProgramFocus,
  type SessionPerformance,
} from '../rules/progressionEngine';
import type { ExperienceLevel, WeekParams } from '../types/program';

// HV-021: how many distinct days/week each muscle trains, read from the
// week-1 template — stable across the whole meso regardless of which day
// just finished, so the frequency used here always matches the one
// program-generation time used (VA-011 in volumeBudget.ts).
export async function getMuscleWeeklyFrequency(programId: string): Promise<Record<string, number>> {
  const { data: week1Days } = await supabase
    .from('program_days')
    .select('id')
    .eq('program_id', programId)
    .eq('week_number', 1);
  if (!week1Days?.length) return {};

  const { data: exercises } = await supabase
    .from('program_exercises')
    .select('program_day_id, muscle_group')
    .in('program_day_id', week1Days.map((d) => d.id));
  if (!exercises?.length) return {};

  const daysByMuscle = new Map<string, Set<string>>();
  for (const ex of exercises) {
    if (!ex.muscle_group) continue;
    if (!daysByMuscle.has(ex.muscle_group)) daysByMuscle.set(ex.muscle_group, new Set());
    daysByMuscle.get(ex.muscle_group)!.add(ex.program_day_id);
  }

  const result: Record<string, number> = {};
  for (const [muscle, days] of daysByMuscle) result[muscle] = days.size;
  return result;
}

// HV-021: a muscle's landmark-driven weekly set anchors (RP Strength /
// Israetel et al. MV/MEV/MAV/MRV), divided across however many sessions/week
// it trains — mirrors the exact mapping used at program-generation time
// (VA-011 in volumeBudget.ts / HV-021 in slotBuilder.ts), so an already-running
// program ramps toward the same targets a freshly-generated one would.
export function resolveMusclePerSessionAnchors(
  muscleGroup: string,
  priority: MusclePriority | undefined,
  frequency: number,
): { week1: number; peak: number; deload: number } | null {
  const landmark = getLandmark(muscleGroup);
  if (!landmark || frequency <= 0) return null;

  let week1Weekly: number;
  let peakWeekly: number;
  if (priority === 'emphasize') {
    week1Weekly = landmark.mev;
    peakWeekly = landmark.mrv;
  } else if (priority === 'grow') {
    week1Weekly = landmark.mev;
    peakWeekly = landmark.mav;
  } else if (priority === 'maintain') {
    week1Weekly = landmark.mv;
    peakWeekly = landmark.mv;
  } else {
    // mev tier — priority unset for this muscle in the program
    week1Weekly = landmark.mev;
    peakWeekly = landmark.mev;
  }

  return {
    week1: week1Weekly / frequency,
    peak: peakWeekly / frequency,
    deload: landmark.mv / frequency,
  };
}

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

      // Pass 1: gather each exercise's history/session data (independent of
      // any other exercise) so muscle-level totals can be computed before
      // any individual recommendation is made.
      const enriched = await Promise.all(
        templateExercises.map(async (ex) => {
          const allSessions = await getExerciseAllSessions(ex.exercise_name);
          const sessions: SessionPerformance[] = allSessions
            .slice(0, 8)
            .map((s) => ({ date: s.date, sets: s.sets.filter((set) => set.reps > 0) }))
            .filter((s) => s.sets.length > 0);

          const exerciseDef = getExerciseByName(ex.exercise_name);
          // Use actual sets logged last session so the distribution the user established
          // (e.g. 1 set EZ Curl + 3 sets Cable Curl) carries forward instead of reverting
          // to the evenly-split week-1 template. Falls back to template when no history.
          const lastActualSets = sessions.length > 0 ? sessions[0].sets.length : null;
          const weight = lastActualSets ?? ex.target_sets;
          return { ex, sessions, exerciseDef, weight };
        }),
      );

      // HV-021: for hypertrophy, resolve each muscle's landmark-driven weekly
      // target ONCE (not per exercise), then split it across that muscle's
      // exercises today in proportion to their existing set distribution —
      // the same role-weighted-split philosophy as HV-021 in slotBuilder.ts,
      // adapted to exercises instead of slot roles since program_exercises
      // doesn't retain the Primary/Secondary/Accessory role after generation.
      const overrideByExercise = new Map<string, { trainingSets: number; deloadSets: number }>();
      if (programFocus === 'hypertrophy') {
        const muscleFrequencies = await getMuscleWeeklyFrequency(dayRow.program_id);
        const weekParams: WeekParams = {
          weekNumber: nextWeek,
          totalTrainingWeeks: Math.max(1, totalMesoWeeks - 1),
          isDeload,
        };

        const byMuscle = new Map<string, typeof enriched>();
        for (const item of enriched) {
          const muscle = item.ex.muscle_group;
          if (!muscle) continue;
          if (!byMuscle.has(muscle)) byMuscle.set(muscle, []);
          byMuscle.get(muscle)!.push(item);
        }

        for (const [muscle, items] of byMuscle) {
          const priority = musclePriorities[muscle] as MusclePriority | undefined;
          const frequency = muscleFrequencies[muscle] ?? 1;
          const anchors = resolveMusclePerSessionAnchors(muscle, priority, frequency);
          if (!anchors) continue;

          const perSessionTarget = rampSets(anchors, weekParams);
          const deloadPerSessionTarget = Math.max(1, Math.round(anchors.deload));
          const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
          if (weightSum <= 0) continue;

          for (const item of items) {
            const share = item.weight / weightSum;
            overrideByExercise.set(item.ex.exercise_name, {
              trainingSets: Math.max(1, Math.round(perSessionTarget * share)),
              deloadSets: Math.max(1, Math.round(deloadPerSessionTarget * share)),
            });
          }
        }
      }

      const targets = (
        await Promise.all(
          enriched.map(async ({ ex, sessions, exerciseDef, weight }) => {
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
              hypertrophyVolumeOverride: overrideByExercise.get(ex.exercise_name),
            };

            const rec = recommendProgression(
              {
                sets: weight,
                repsMin: ex.target_reps_min ?? 8,
                repsMax: ex.target_reps_max ?? 12,
                rir: ex.rir ?? 3,
                exerciseType: exerciseDef?.exerciseType,
                hardRirFloor: exerciseDef?.hardRirFloor,
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
