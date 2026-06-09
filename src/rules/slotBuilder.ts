import { SLOT_ROLE_CONFIGS } from '../data/slotRoleConfig';
import type {
  AdjustedVolumeTarget,
  ExerciseSlot,
  MuscleGroup,
  MusclePriority,
  SessionTemplate,
  SlotRole,
  WeekParams,
} from '../types/program';

export const MAX_SLOTS_PER_SESSION = 5;

// ─── Slot allocation algorithm ────────────────────────────────────────────────
//
// Phase 1 — Primary slots for every non-MEV muscle.
// Phase 2 — Secondary slots for Emphasize/Grow muscles up to the slot cap.
// Phase 3 — Accessory slots for MEV muscles with remaining capacity.

function selectIncludedPairs(
  dayMuscles: Map<MuscleGroup, MusclePriority | 'mev'>,
  template: SessionTemplate,
  maxSlots: number,
): Set<string> {
  const included = new Set<string>();

  // Phase 1
  for (const spec of template.slots) {
    const priority = dayMuscles.get(spec.muscle);
    if (!priority || priority === 'mev') continue;
    if (spec.role !== 'Primary') continue;
    const key = `${spec.muscle}-Primary`;
    if (!included.has(key)) included.add(key);
  }

  // Phase 2
  let remaining = maxSlots - included.size;
  for (const spec of template.slots) {
    if (remaining <= 0) break;
    const priority = dayMuscles.get(spec.muscle);
    if (!priority || (priority !== 'emphasize' && priority !== 'grow')) continue;
    if (spec.role !== 'Secondary') continue;
    const key = `${spec.muscle}-Secondary`;
    if (!included.has(key)) {
      included.add(key);
      remaining--;
    }
  }

  // Phase 3
  for (const spec of template.slots) {
    if (remaining <= 0) break;
    const priority = dayMuscles.get(spec.muscle);
    if (priority !== 'mev') continue;
    if (spec.role !== 'Accessory') continue;
    const key = `${spec.muscle}-Accessory`;
    if (!included.has(key)) {
      included.add(key);
      remaining--;
    }
  }

  return included;
}

// ─── Progressive week scaling ─────────────────────────────────────────────────
//
// Sets:  70 % of peak at Week 1 → 100 % at last training week → 50 % on deload.
// RIR:   config.rir + 1 at Week 1 → decrements 1/week → min 1 → 4 on deload.
//        Only applied to emphasize/grow muscles; maintain/mev stays at config.rir.
//
// Example for a 4-week meso (3 training + 1 deload), Primary emphasize (config.rir=2):
//   Week 1: sets=70%, rir=3  Week 2: sets=85%, rir=2  Week 3: sets=100%, rir=1
//   Week 4: sets=50%, rir=4

function applyWeekParams(
  baseSets: number,
  baseRir: number,
  priority: MusclePriority | 'mev',
  params: WeekParams,
): { sets: number; rir: number } {
  if (params.isDeload) {
    return {
      sets: Math.max(1, Math.ceil(baseSets * 0.5)),
      rir: 4,
    };
  }

  const { weekNumber, totalTrainingWeeks } = params;
  const progressFraction = totalTrainingWeeks <= 1
    ? 1.0
    : (weekNumber - 1) / (totalTrainingWeeks - 1);

  const sets = Math.max(1, Math.round(baseSets * (0.7 + 0.3 * progressFraction)));

  // RIR progression only for muscles the user is actively building
  const rir =
    priority === 'emphasize' || priority === 'grow'
      ? Math.max(1, (baseRir + 1) - (weekNumber - 1))
      : baseRir;

  return { sets, rir };
}

// ─── Public API ──────────────────────────────────────────────────────────────
export function buildDaySlots(
  dayMuscles: Map<MuscleGroup, MusclePriority | 'mev'>,
  template: SessionTemplate,
  maxSlots = MAX_SLOTS_PER_SESSION,
  weekParams?: WeekParams,
): ExerciseSlot[] {
  const includedPairs = selectIncludedPairs(dayMuscles, template, maxSlots);

  const result: ExerciseSlot[] = [];
  const usedPairs = new Set<string>();

  for (const spec of template.slots) {
    const pairKey = `${spec.muscle}-${spec.role}`;
    if (!includedPairs.has(pairKey) || usedPairs.has(pairKey)) continue;

    const priority = dayMuscles.get(spec.muscle) as MusclePriority | 'mev';
    const config = SLOT_ROLE_CONFIGS[spec.role as SlotRole][priority];

    const { sets, rir } = weekParams
      ? applyWeekParams(config.sets, config.rir, priority, weekParams)
      : { sets: config.sets, rir: config.rir };

    result.push({
      id: `${spec.muscle}-${spec.role}-${result.length}`,
      muscle: spec.muscle,
      role: spec.role as SlotRole,
      priority,
      sets,
      repsMin: config.repsMin,
      repsMax: config.repsMax,
      rir,
      sortOrder: result.length,
    });

    usedPairs.add(pairKey);
  }

  return result;
}

// Convenience helper used by programBuilder and tests.
export function volumeTargetsForDay(
  dayMuscles: Map<MuscleGroup, MusclePriority | 'mev'>,
  volumeTargets: AdjustedVolumeTarget[],
): AdjustedVolumeTarget[] {
  return volumeTargets.filter((t) => dayMuscles.has(t.muscle));
}
