import { getExercises } from './exercises';
import { getExerciseAllSessions, getRecentWorkoutExerciseNames } from './history';
import { getCurrentProgramFocus } from './programs';
import { getExerciseByName } from '../data/exerciseDatabase';
import { getProgressionProfile } from '../data/exerciseProgressionProfiles';
import {
  buildQuickWorkoutSlots,
  QuickWorkoutRegion,
  QuickWorkoutSubtype,
} from '../rules/quickWorkoutBuilder';
import { ExerciseCandidate, selectExerciseForSlot } from '../rules/exerciseSelector';
import { recommendProgression, SessionPerformance } from '../rules/progressionEngine';
import type { ExerciseSlot, ExperienceLevel, ProgramFocus } from '../types/program';

const REGION_LABELS: Record<QuickWorkoutRegion, string> = {
  Upper: 'Upper',
  Lower: 'Lower',
  FullBody: 'Full Body',
};

export interface QuickWorkoutExercise {
  name: string;
  muscleGroup: string;
  equipment: string;
  musclePriority: 'grow';
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number;
  rir: number;
  isFirstSession: boolean;
}

export interface GeneratedQuickWorkout {
  sessionLabel: string;
  focus: ProgramFocus;
  exercises: QuickWorkoutExercise[];
}

export interface QuickWorkoutOptions {
  preferredEquipment: string[];
  usePreferredEquipment: boolean;
  experienceLevel: ExperienceLevel;
}

// Resolves a starting point (weight/sets/reps/RIR) for one selected exercise
// from its logged history — a synchronous-per-exercise equivalent of
// src/api/progression.ts' computeAndSaveProgressionTargets, but for a single
// right-now session instead of *future scheduled* days. Deliberately never
// touches program_day_targets: there's no program_day_id to write against for
// an ad-hoc Quick Workout.
async function resolveExerciseTarget(
  slot: ExerciseSlot,
  exercise: ExerciseCandidate,
  focus: ProgramFocus,
  experienceLevel: ExperienceLevel,
): Promise<QuickWorkoutExercise> {
  const allSessions = await getExerciseAllSessions(exercise.name);
  const sessions: SessionPerformance[] = allSessions
    .slice(0, 8)
    .map((s) => ({
      date: s.date,
      sets: s.sets
        .filter((set) => set.reps > 0)
        .map((set) => ({
          weight: set.weight,
          reps: set.reps,
          rir: set.reported_rir ?? undefined,
        })),
    }))
    .filter((s) => s.sets.length > 0);

  const exerciseDef = getExerciseByName(exercise.name);

  const rec = recommendProgression(
    {
      sets: slot.sets,
      repsMin: slot.repsMin,
      repsMax: slot.repsMax,
      rir: slot.rir,
      role: slot.role,
      exerciseType: exerciseDef?.exerciseType,
      hardRirFloor: exerciseDef?.hardRirFloor,
      // HV-028: Supabase-sourced equipment gates the bodyweight
      // weight-adjustment guard in progressionEngine.ts.
      equipment: exercise.equipment,
      // HV-029/HV-030: category-level Exercise Progression Profile — no
      // VA-018 soreness-trim wiring here (no cross-exercise muscle grouping
      // exists for an ad-hoc Quick Workout; sorenessTrimOverride stays unset,
      // falling back to progressionEngine.ts's flat VA-013 trim, which is
      // moot here anyway since soreness is never threaded into this ctx).
      profile: getProgressionProfile(exerciseDef),
    },
    sessions,
    {
      experienceLevel,
      isDeload: false,
      // A Quick Workout has no real mesocycle to ramp across (HV-001's RIR
      // taper is about progressively raising effort toward a periodized
      // block's final week). mesoWeek=1/totalMesoWeeks=2 makes HV-001's
      // weeksRemaining resolve to exactly 0, which is a deliberate no-op for
      // the taper term (nextRir stays at the slot's prescribed RIR) rather
      // than an arbitrary pair of numbers — mesoWeek=1/totalMesoWeeks=1 looks
      // equally plausible at a glance but actually drives weeksRemaining to
      // -1, silently inflating RIR by 1 (less effort than prescribed).
      mesoWeek: 1,
      totalMesoWeeks: 2,
      programFocus: focus,
      // HV-001 (Dr. Mike Israetel / RP Hypertrophy): an ad-hoc workout has
      // no mesocycle position, so preserve the authored slot RIR.
      musclePriority: 'maintain',
    },
  );

  const isFirstSession = rec.action === 'FIRST_SESSION' || rec.nextWeight === 0;

  return {
    name: exercise.name,
    muscleGroup: slot.muscle,
    equipment: exercise.equipment,
    musclePriority: 'grow',
    targetSets: isFirstSession ? slot.sets : rec.nextSets,
    targetRepsMin: isFirstSession ? slot.repsMin : rec.nextRepsMin,
    targetRepsMax: isFirstSession ? slot.repsMax : rec.nextRepsMax,
    targetWeight: isFirstSession ? 0 : rec.nextWeight,
    rir: isFirstSession ? slot.rir : rec.nextRir,
    isFirstSession,
  };
}

export async function generateQuickWorkout(
  region: QuickWorkoutRegion,
  subtype: QuickWorkoutSubtype,
  opts: QuickWorkoutOptions,
): Promise<GeneratedQuickWorkout> {
  const focus = await getCurrentProgramFocus();
  const slots = buildQuickWorkoutSlots(region, subtype, focus);

  const [catalog, recentNames] = await Promise.all([
    getExercises(),
    getRecentWorkoutExerciseNames(2),
  ]);

  const candidates: ExerciseCandidate[] = catalog.map((ex) => ({
    name: ex.name,
    muscleGroup: ex.muscle_group,
    equipment: ex.equipment,
    movementCategory: ex.movement_category ?? null,
  }));

  const lastSessionNames = new Set(recentNames[0] ?? []);
  const last2SessionsNames = new Set([...(recentNames[0] ?? []), ...(recentNames[1] ?? [])]);

  // Pick an exercise for every slot first (pure/synchronous), then resolve
  // progression targets for all picks in parallel — selection doesn't depend
  // on any per-exercise history, only on the recent-names sets already fetched.
  const usedThisWorkout = new Set<string>();
  const picks: { slot: ExerciseSlot; exercise: ExerciseCandidate }[] = [];
  for (const slot of slots) {
    const picked = selectExerciseForSlot(slot, candidates, {
      preferredEquipment: opts.preferredEquipment,
      usePreferredEquipment: opts.usePreferredEquipment,
      lastSessionNames,
      last2SessionsNames,
      alreadyUsedThisWorkout: usedThisWorkout,
    });
    // No exercise exists for this muscle in the catalog — skip the slot
    // rather than crash the whole generation.
    if (!picked) continue;
    usedThisWorkout.add(picked.name);
    picks.push({ slot, exercise: picked });
  }

  const exercises = await Promise.all(
    picks.map(({ slot, exercise }) => resolveExerciseTarget(slot, exercise, focus, opts.experienceLevel)),
  );

  const sessionLabel = subtype === 'All' ? REGION_LABELS[region] : `${REGION_LABELS[region]} · ${subtype}`;

  return { sessionLabel, focus, exercises };
}
