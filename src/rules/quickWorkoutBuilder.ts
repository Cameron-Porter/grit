import { SESSION_TEMPLATES } from '../data/sessionTemplates';
import { SESSION_MUSCLES } from './assignment';
import { buildDaySlots } from './slotBuilder';
import { enforceSessionCaps } from './sessionTrimmer';
import type {
  DayPlan,
  ExerciseSlot,
  MuscleGroup,
  MusclePriority,
  ProgramFocus,
  SessionType,
} from '../types/program';

export type QuickWorkoutRegion = 'Upper' | 'Lower' | 'FullBody';
export type QuickWorkoutSubtype = 'Push' | 'Pull' | 'All';

// Region + subtype → the existing SessionType template that already covers it.
// FullBody only ever maps to 'All' — a full-body session inherently mixes
// push and pull, so Push/Pull aren't offered for that region at all.
export const QUICK_WORKOUT_TEMPLATE_MAP: Record<QuickWorkoutRegion, Partial<Record<QuickWorkoutSubtype, SessionType>>> = {
  Upper: { Push: 'Push', Pull: 'Pull', All: 'Upper' },
  Lower: { Push: 'LowerQuadFocus', Pull: 'LowerPosteriorChain', All: 'Lower' },
  FullBody: { All: 'FullBody' },
};

export function isQuickWorkoutSubtypeAvailable(region: QuickWorkoutRegion, subtype: QuickWorkoutSubtype): boolean {
  return !!QUICK_WORKOUT_TEMPLATE_MAP[region][subtype];
}

// Priority used for every muscle in a Quick Workout session — 'grow' rather
// than 'maintain' so a generated session lands at the same ~4-5 slot size as
// a normal training day's Primary+Secondary work, instead of the leaner
// Primary-only session 'maintain' would produce. This is a session-size UX
// choice, not a training-science claim, so it isn't a numbered doctrine tag —
// the actual set/rep/RIR numbers for the 'grow' tier are already cited at
// their source of truth in slotRoleConfig.ts.
const QUICK_WORKOUT_PRIORITY: MusclePriority = 'grow';

// Builds the structural slots (muscle/role/sets/reps/RIR — no exercise name
// yet) for a single ad-hoc Quick Workout session. Reuses buildDaySlots exactly
// as programBuilder.ts does for one day of a real program, but with no
// weekParams/volumeTargets: buildDaySlots' resolveSetAnchors falls back to the
// flat SLOT_ROLE_CONFIGS numbers whenever a target/landmark isn't supplied
// (see slotBuilder.ts), which is exactly right here — there's no mesocycle to
// ramp across for a one-off session.
export function buildQuickWorkoutSlots(
  region: QuickWorkoutRegion,
  subtype: QuickWorkoutSubtype,
  focus: ProgramFocus = 'hypertrophy',
): ExerciseSlot[] {
  const sessionType = QUICK_WORKOUT_TEMPLATE_MAP[region][subtype];
  if (!sessionType) {
    throw new Error(`Quick Workout: ${region} + ${subtype} is not a supported combination`);
  }

  const template = SESSION_TEMPLATES[sessionType];
  const muscles = SESSION_MUSCLES[sessionType];

  const dayMuscles = new Map<MuscleGroup, MusclePriority>(
    muscles.map((m) => [m, QUICK_WORKOUT_PRIORITY]),
  );

  const rawSlots = buildDaySlots(dayMuscles, template, undefined, undefined, focus, undefined);

  const musclePriorities: Partial<Record<MuscleGroup, MusclePriority>> = Object.fromEntries(
    muscles.map((m) => [m, QUICK_WORKOUT_PRIORITY]),
  );

  // Route through the same session-cap enforcement (RC-series) real program
  // days get, via a synthetic single-day DayPlan — keeps Quick Workout
  // sessions bound by the exact same SESSION_MAX_EXERCISES/SESSION_MAX_SETS
  // invariants instead of a second, divergent implementation.
  const syntheticDay: DayPlan = {
    dayIndex: 0,
    weekNumber: 1,
    isDeload: false,
    sessionType,
    splitName: sessionType,
    trainingDay: 'Quick Workout',
    primaryMuscles: [...dayMuscles.keys()],
    slots: rawSlots,
    totalSets: rawSlots.reduce((n, s) => n + s.sets, 0),
    estimatedMinutes: 0,
  };

  return enforceSessionCaps(syntheticDay, musclePriorities, focus).slots;
}
