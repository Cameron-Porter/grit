import * as Sentry from '@sentry/react-native';
import { getExerciseAllSessions, getMuscleSorenessForWorkout } from './history';
import { getTemplateDayExercises, saveProgramDayTargets } from './programs';
import { supabase } from './supabase';
import { getExerciseByName } from '../data/exerciseDatabase';
import { getProgressionProfile } from '../data/exerciseProgressionProfiles';
import { capSetsPerExercise, rampSets } from '../rules/volumeRamp';
import { capSessionSets, getSessionMaxSets } from '../rules/sessionTrimmer';
import { redistributeSorenessTrim } from '../rules/volumeBudget';
import { getLandmark } from '../utils/volumeLandmarks';
import {
  recommendProgression,
  type MusclePriority,
  type ProgressionContext,
  type ProgramFocus,
  type SessionPerformance,
  type SorenessLevel,
} from '../rules/progressionEngine';
import type { ExperienceLevel, SlotRole, WeekParams } from '../types/program';

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
  // VA-013: the workout that was just logged for this program day — its
  // per-muscle soreness feedback (if any) informs whether next week's set
  // count should hold flat. Optional so existing callers/tests that don't
  // pass it keep working exactly as before (soreness simply has no effect).
  workoutId?: string,
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
      const sorenessByMuscle = workoutId ? await getMuscleSorenessForWorkout(workoutId) : {};

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

      // Built once regardless of focus — VA-018 (below) needs sibling-exercise
      // visibility for every focus, not just hypertrophy (which HV-021's
      // per-exercise split already needed it for).
      const byMuscle = new Map<string, typeof enriched>();
      for (const item of enriched) {
        const muscle = item.ex.muscle_group;
        if (!muscle) continue;
        if (!byMuscle.has(muscle)) byMuscle.set(muscle, []);
        byMuscle.get(muscle)!.push(item);
      }

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

        for (const [muscle, items] of byMuscle) {
          const priority = musclePriorities[muscle] as MusclePriority | undefined;
          const frequency = muscleFrequencies[muscle] ?? 1;
          const anchors = resolveMusclePerSessionAnchors(muscle, priority, frequency);
          if (!anchors) continue;

          // VA-015: same graduated soreness response as the per-exercise
          // ramp — see volumeRamp.ts's rampSets doctrine comment.
          const muscleSoreness = (sorenessByMuscle[muscle] ?? undefined) as SorenessLevel | undefined;
          const perSessionTarget = rampSets(anchors, weekParams, muscleSoreness);
          const deloadPerSessionTarget = Math.max(1, Math.round(anchors.deload));
          const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
          if (weightSum <= 0) continue;

          for (const item of items) {
            const share = item.weight / weightSum;
            // HV-023: cap per exercise — a muscle trained by only one
            // exercise this session would otherwise take its entire
            // per-session ramp target (which can climb well past what one
            // movement can be trained hard for) onto that single exercise.
            overrideByExercise.set(item.ex.exercise_name, {
              trainingSets: capSetsPerExercise(Math.max(1, Math.round(perSessionTarget * share))),
              deloadSets: capSetsPerExercise(Math.max(1, Math.round(deloadPerSessionTarget * share))),
            });
          }
        }
      }

      // VA-018: fatigue-weighted soreness-trim redistribution — extends
      // VA-013 (the flat "-1 set" trim inside progressionEngine.ts) with
      // sibling-exercise visibility, which only this muscle-level grouping
      // has. Preserves VA-013's existing total reduction magnitude (one set
      // per sore exercise) — this only changes WHICH exercises absorb it,
      // preferring the highest-systemic-fatigue exercise in that muscle
      // first (e.g. trim bench before cable fly for a sore chest).
      const sorenessTrimByExercise = new Map<string, number>();
      for (const [muscle, items] of byMuscle) {
        const muscleSoreness = (sorenessByMuscle[muscle] ?? undefined) as SorenessLevel | undefined;
        if (muscleSoreness !== 'Still sore') continue;
        const trims = redistributeSorenessTrim(
          items.map((item) => ({
            exerciseName: item.ex.exercise_name,
            systemicFatigue: getProgressionProfile(item.exerciseDef).fatigueRating.systemicFatigue,
            currentSets: item.weight,
          })),
          items.length,
        );
        for (const [name, trim] of trims) sorenessTrimByExercise.set(name, trim);
      }

      const targets = (
        await Promise.all(
          enriched.map(async ({ ex, sessions, exerciseDef, weight }) => {
            const musclePriority = (
              ex.muscle_group ? musclePriorities[ex.muscle_group] : undefined
            ) as MusclePriority | undefined;
            const soreness = (
              ex.muscle_group ? sorenessByMuscle[ex.muscle_group] : undefined
            ) as SorenessLevel | undefined;

            const ctx: ProgressionContext = {
              experienceLevel,
              isDeload,
              mesoWeek: nextWeek,
              totalMesoWeeks,
              soreness,
              programFocus,
              musclePriority,
              hypertrophyVolumeOverride: overrideByExercise.get(ex.exercise_name),
              sorenessTrimOverride: sorenessTrimByExercise.get(ex.exercise_name),
            };

            const rec = recommendProgression(
              {
                sets: weight,
                repsMin: ex.target_reps_min ?? 8,
                repsMax: ex.target_reps_max ?? 12,
                rir: ex.rir ?? 3,
                // Null for programs created before this column existed —
                // recommendProgression falls back to 'Primary', matching
                // this app's behavior prior to this fix.
                role: (ex.role ?? undefined) as SlotRole | undefined,
                exerciseType: exerciseDef?.exerciseType,
                hardRirFloor: exerciseDef?.hardRirFloor,
                // HV-028: Supabase-sourced equipment (per AGENTS.md — never
                // the local exerciseDatabase.ts fixture) gates the bodyweight
                // weight-adjustment guard in progressionEngine.ts.
                equipment: ex.equipment,
                // HV-029/HV-030: category-level Exercise Progression Profile —
                // drives load-increment sizing, volume-transition rep
                // compensation, and RIR/failure floors.
                profile: getProgressionProfile(exerciseDef),
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
              // Carried through only to drive RC-010's session-set cap below —
              // stripped before saving (saveProgramDayTargets doesn't take them).
              role: (ex.role ?? 'Primary') as SlotRole,
              musclePriority: (musclePriority ?? 'mev') as MusclePriority | 'mev',
            };
          }),
        )
      ).filter((t): t is NonNullable<typeof t> => t !== null);

      // RC-010: each exercise's sets were computed independently (HV-021
      // ramps toward MRV per muscle, HV-023 caps only the individual
      // exercise) — nothing had checked the day's new total against the
      // whole-session cap. Re-enforce it here, the same way
      // enforceSessionCaps does at generation time, but without ever
      // dropping an exercise below 1 set or removing it outright (see
      // capSessionSets doctrine comment).
      const cappedTargets = capSessionSets(targets, getSessionMaxSets(programFocus));

      const targetsToSave = cappedTargets.map(({ role: _role, musclePriority: _musclePriority, ...rest }) => rest);

      if (targetsToSave.length > 0) {
        await saveProgramDayTargets(nextDayRow.id, targetsToSave);
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

// TEMPORARY — pairs with backfillWeek1ExerciseRoles in src/api/programs.ts.
// Re-runs progression for every already-completed day in this program so
// already-saved program_day_targets rows get recomputed with the
// now-backfilled role (fixing load increments for upcoming/already-generated
// weeks without waiting for the next natural completion to trigger it).
// Safe to call repeatedly — computeAndSaveProgressionTargets upserts.
export async function refreshUpcomingProgressionTargets(
  programId: string,
  experienceLevel: ExperienceLevel,
): Promise<void> {
  const { data: completedDays } = await supabase
    .from('program_days')
    .select('id')
    .eq('program_id', programId)
    .eq('completed', true);
  if (!completedDays?.length) return;

  // VA-013/VA-018: look up each completed day's associated workout so its
  // soreness feedback (workout_feedback, keyed by workout_id — see
  // getMuscleSorenessForWorkout in history.ts) gets threaded through the
  // refresh. Without this, computeAndSaveProgressionTargets was called with
  // no workoutId, so a refresh silently reconsidered only logged weight/reps
  // history and dropped any soreness-driven volume autoregulation entirely —
  // a real gap, not by design.
  const dayIds = completedDays.map((d) => d.id);
  const { data: relatedWorkouts } = await supabase
    .from('workouts')
    .select('id, program_day_id, completed_at')
    .in('program_day_id', dayIds)
    .order('completed_at', { ascending: false });

  const workoutIdByDay = new Map<string, string>();
  for (const w of relatedWorkouts ?? []) {
    // Ordered newest-first above — if a program_day somehow has more than
    // one associated workout (retries/edits), the first one seen here is
    // the most recent, matching what actually happened.
    if (w.program_day_id && !workoutIdByDay.has(w.program_day_id)) {
      workoutIdByDay.set(w.program_day_id, w.id);
    }
  }

  for (const day of completedDays) {
    await computeAndSaveProgressionTargets(day.id, experienceLevel, workoutIdByDay.get(day.id));
  }
}
