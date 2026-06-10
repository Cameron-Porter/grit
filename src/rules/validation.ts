import { PRIMARY_ROLE_OVERLAP, SECONDARY_ROLE_MULTIPLIER, ACCESSORY_ROLE_MULTIPLIER } from '../data/roleOverlap';
import { LOWER_SESSION_TYPES } from './splitDeriver';
import type {
  AdjustedVolumeTarget,
  DayPlan,
  GeneratedProgram,
  MuscleGroup,
  ProgramValidationResult,
  SessionType,
} from '../types/program';
import { SESSION_MAX_EXERCISES, SESSION_MAX_SETS, SESSION_TARGET_SETS_MIN } from './sessionTrimmer';

const EMPHASIZE_TOLERANCE = 0.80;

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

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    weeklyEffectiveSets,
  };
}
