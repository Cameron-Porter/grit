import { PRIMARY_ROLE_OVERLAP, SECONDARY_ROLE_MULTIPLIER, ACCESSORY_ROLE_MULTIPLIER } from '../data/roleOverlap';
import { getExerciseByName } from '../data/exerciseDatabase';
import { LOWER_SESSION_TYPES } from './splitDeriver';
import type {
  AdjustedVolumeTarget,
  DayPlan,
  ExperienceLevel,
  GeneratedProgram,
  MuscleGroup,
  ProgramValidationIssue,
  ProgramValidationResult,
  SessionType,
} from '../types/program';
import { SESSION_MAX_EXERCISES, SESSION_MAX_SETS, SESSION_TARGET_SETS_MIN } from './sessionTrimmer';

const EMPHASIZE_TOLERANCE = 0.80;

// ─── HV-013: Intra-session deadlift + barbell-row compatibility check ─────────
//
// Deadlift-pattern + barbell-row on the same day creates excessive lumbar load.
// beginner/intermediate → error; advanced → warning.
export function validateDayExercises(
  exerciseNames: string[],
  experienceLevel: ExperienceLevel,
): ProgramValidationIssue[] {
  const issues: ProgramValidationIssue[] = [];
  const hasDeadlift = exerciseNames.some((name) => {
    const def = getExerciseByName(name);
    return def?.exerciseTags?.includes('deadlift') ?? false;
  });
  const hasBarbellRow = exerciseNames.some((name) => {
    const def = getExerciseByName(name);
    return def?.exerciseTags?.includes('barbell-row') ?? false;
  });
  if (hasDeadlift && hasBarbellRow) {
    issues.push({
      type: 'movement_balance',
      severity: experienceLevel === 'advanced' ? 'warning' : 'error',
      message:
        'Deadlift and Barbell Row on the same day creates excessive lumbar load. Replace the row with Chest-Supported Row or Seated Cable Row.',
    });
  }
  return issues;
}

// ─── Effective set accumulation ───────────────────────────────────────────────
function computeWeeklyEffectiveSets(
  days: DayPlan[],
): Partial<Record<MuscleGroup, number>> {
  const effective: Partial<Record<MuscleGroup, number>> = {};

  const add = (muscle: MuscleGroup, amount: number) => {
    effective[muscle] = (effective[muscle] ?? 0) + amount;
  };

  for (const day of days) {
    for (const slot of day.slots) {
      add(slot.muscle, slot.sets);

      const roleMultiplier =
        slot.role === 'Primary'   ? 1.0 :
        slot.role === 'Secondary' ? SECONDARY_ROLE_MULTIPLIER :
        ACCESSORY_ROLE_MULTIPLIER;

      const overlaps = PRIMARY_ROLE_OVERLAP[slot.muscle] ?? {};
      for (const [secondaryMuscle, coeff] of Object.entries(overlaps) as [MuscleGroup, number][]) {
        if (secondaryMuscle !== slot.muscle) {
          add(secondaryMuscle, slot.sets * coeff * roleMultiplier);
        }
      }
    }
  }

  for (const muscle of Object.keys(effective) as MuscleGroup[]) {
    effective[muscle] = parseFloat((effective[muscle]!).toFixed(1));
  }

  return effective;
}

// ─── Public API ──────────────────────────────────────────────────────────────
export function validateProgram(
  program: GeneratedProgram,
  adjustedTargets: AdjustedVolumeTarget[],
): ProgramValidationResult {
  const issues: ProgramValidationResult['issues'] = [];

  // Validate Week 1 days (representative non-deload structure)
  for (const day of program.days) {
    if (day.slots.length > SESSION_MAX_EXERCISES) {
      issues.push({
        type: 'session_exercises',
        severity: 'error',
        message: `${day.splitName} (day ${day.dayIndex + 1}): ${day.slots.length} slots — max is ${SESSION_MAX_EXERCISES}`,
        dayIndex: day.dayIndex,
      });
    }
    if (day.totalSets > SESSION_MAX_SETS) {
      issues.push({
        type: 'session_sets',
        severity: 'error',
        message: `${day.splitName} (day ${day.dayIndex + 1}): ${day.totalSets} sets — max is ${SESSION_MAX_SETS}`,
        dayIndex: day.dayIndex,
      });
    }
    // Skip minimum-sets check for deload days — low volume is intentional
    if (!day.isDeload && day.totalSets > 0 && day.totalSets < SESSION_TARGET_SETS_MIN) {
      issues.push({
        type: 'session_sets',
        severity: 'warning',
        message: `${day.splitName} (day ${day.dayIndex + 1}): only ${day.totalSets} sets (recommended ${SESSION_TARGET_SETS_MIN}–${SESSION_MAX_SETS})`,
        dayIndex: day.dayIndex,
      });
    }
  }

  // Weekly volume adequacy
  const weeklyEffectiveSets = computeWeeklyEffectiveSets(program.days);
  for (const target of adjustedTargets) {
    if (target.priority !== 'emphasize') continue;
    const actual = weeklyEffectiveSets[target.muscle] ?? 0;
    const needed = target.targetEffectiveSets * EMPHASIZE_TOLERANCE;
    if (actual < needed) {
      issues.push({
        type: 'weekly_volume',
        severity: 'warning',
        message: `${target.muscle} (emphasize): ${actual.toFixed(1)} effective sets/week — target is ${target.targetEffectiveSets} (${Math.round(actual / target.targetEffectiveSets * 100)}%)`,
      });
    }
  }

  // EO-005: Fundamental movement pattern balance (Push / Pull / Squat+Hinge).
  // Every weekly split must contain all three movement families.
  const weekSessionTypes = new Set(program.days.map((d) => d.sessionType));
  const hasPush = (['Push', 'Upper', 'FullBody'] as SessionType[]).some((t) => weekSessionTypes.has(t));
  const hasPull = (['Pull', 'Upper', 'FullBody'] as SessionType[]).some((t) => weekSessionTypes.has(t));
  const hasLower = ([...LOWER_SESSION_TYPES, 'FullBody'] as SessionType[]).some((t) => weekSessionTypes.has(t));

  if (!hasPush) {
    issues.push({
      type: 'movement_balance',
      severity: 'warning',
      message: 'No push pattern in weekly split — add a Push or Upper session',
    });
  }
  if (!hasPull) {
    issues.push({
      type: 'movement_balance',
      severity: 'warning',
      message: 'No pull pattern in weekly split — add a Pull or Upper session',
    });
  }
  if (!hasLower) {
    issues.push({
      type: 'movement_balance',
      severity: 'warning',
      message: 'No squat or hinge pattern in weekly split — add a Lower or Legs session',
    });
  }

  // HV-004: Back plane parity — ensure both horizontal and vertical pulls are present.
  // Only fires when ≥2 Back slots have selectedExercise populated.
  for (const day of program.days) {
    const backSlotsWithExercise = day.slots.filter(
      (slot) => slot.muscle === 'Back' && slot.selectedExercise,
    );
    if (backSlotsWithExercise.length < 2) continue;

    const patterns = backSlotsWithExercise
      .map((slot) => getExerciseByName(slot.selectedExercise!)?.movementPattern)
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    const hasHorizontal = patterns.includes('horizontal-pull');
    const hasVertical = patterns.includes('vertical-pull');

    if (hasVertical && !hasHorizontal) {
      issues.push({
        type: 'back_plane',
        severity: 'warning',
        message:
          'Back training has no horizontal pull (rows) — add a row variation for upper back thickness and rhomboid development.',
        dayIndex: day.dayIndex,
      });
    } else if (hasHorizontal && !hasVertical) {
      issues.push({
        type: 'back_plane',
        severity: 'warning',
        message:
          'Back training has no vertical pull (pulldowns/pull-ups) — add a lat pulldown or pull-up for width.',
        dayIndex: day.dayIndex,
      });
    }
  }

  // HV-020: Tricep overhead extension coverage.
  // Fires when ≥2 Triceps slots have selectedExercise and none have overheadExtension tag.
  for (const day of program.days) {
    const tricepSlotsWithExercise = day.slots.filter(
      (slot) => slot.muscle === 'Triceps' && slot.selectedExercise,
    );
    if (tricepSlotsWithExercise.length < 2) continue;

    const hasOverhead = tricepSlotsWithExercise.some((slot) => {
      const def = getExerciseByName(slot.selectedExercise!);
      return def?.exerciseTags?.includes('overheadExtension') ?? false;
    });

    if (!hasOverhead) {
      issues.push({
        type: 'muscle_coverage',
        severity: 'warning',
        message:
          'No overhead tricep extension found. The long head requires the shoulder to be flexed overhead. Consider adding Skull Crusher or Overhead Extension.',
        dayIndex: day.dayIndex,
      });
    }
  }

  // HV-002: Volume proportionality audit.
  // Flags arm-dominant or quad-deficient programs.
  const totalSets = Object.values(weeklyEffectiveSets).reduce<number>((sum, v) => sum + (v ?? 0), 0);
  if (totalSets > 0) {
    const tricepsSets = weeklyEffectiveSets['Triceps'] ?? 0;
    const bicepsSets = weeklyEffectiveSets['Biceps'] ?? 0;
    const quadsSets = weeklyEffectiveSets['Quads'] ?? 0;

    if (tricepsSets / totalSets > 0.08) {
      issues.push({
        type: 'proportionality',
        severity: 'warning',
        message:
          'Triceps are receiving an unusually high share of total weekly volume. Consider redistributing sets to larger muscle groups.',
      });
    }
    if (bicepsSets / totalSets > 0.08) {
      issues.push({
        type: 'proportionality',
        severity: 'warning',
        message:
          'Biceps are receiving an unusually high share of total weekly volume. Consider redistributing sets to larger muscle groups.',
      });
    }
    if (
      weeklyEffectiveSets['Quads'] !== undefined &&
      quadsSets / totalSets < 0.18 &&
      totalSets > 20
    ) {
      issues.push({
        type: 'proportionality',
        severity: 'warning',
        message:
          'Quad volume is low relative to total program volume. Quads are one of the largest muscle groups — consider adding leg volume.',
      });
    }
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    weeklyEffectiveSets,
  };
}
