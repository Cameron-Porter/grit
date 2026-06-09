import type { DayPlan, ExerciseSlot, MuscleGroup, MusclePriority } from '../types/program';

export const SESSION_MAX_EXERCISES = 5;
export const SESSION_MAX_SETS = 24;
export const SESSION_TARGET_SETS_MIN = 8;

// Numeric priority for trimming order: lowest number = removed first
function trimPriority(priority: MusclePriority | 'mev'): number {
  switch (priority) {
    case 'mev':      return 0;
    case 'maintain': return 1;
    case 'grow':     return 2;
    case 'emphasize': return 3;
  }
}

// Sort slots so the lowest-priority, most-expendable slots appear first.
// Accessory < Secondary < Primary; lower muscle priority removed first.
function byTrimPriority(
  slots: ExerciseSlot[],
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
): ExerciseSlot[] {
  return [...slots].sort((a, b) => {
    const pa = trimPriority(musclePriorities[a.muscle] ?? 'mev');
    const pb = trimPriority(musclePriorities[b.muscle] ?? 'mev');
    if (pa !== pb) return pa - pb; // lower muscle priority removed first
    // Within same muscle priority: Accessory before Secondary before Primary
    const roleOrder = (s: ExerciseSlot) =>
      s.role === 'Accessory' ? 0 : s.role === 'Secondary' ? 1 : 2;
    if (roleOrder(a) !== roleOrder(b)) return roleOrder(a) - roleOrder(b);
    return b.sets - a.sets; // more sets removed first (reduces total waste)
  });
}

// Enforce hard session limits:
//   1. Remove slots until ≤ SESSION_MAX_EXERCISES (lowest priority first)
//   2. Trim sets until ≤ SESSION_MAX_SETS (reduce 1 set at a time from lowest
//      priority). When a slot would drop below 2 sets, remove the whole slot.
export function enforceSessionCaps(
  day: DayPlan,
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
): DayPlan {
  let slots = [...day.slots];

  // ── Phase 1: slot count cap ──────────────────────────────────────────────
  while (slots.length > SESSION_MAX_EXERCISES) {
    const sorted = byTrimPriority(slots, musclePriorities);
    const victimId = sorted[0].id;
    slots = slots.filter((s) => s.id !== victimId);
  }

  // ── Phase 2: set count cap ───────────────────────────────────────────────
  let totalSets = slots.reduce((n, s) => n + s.sets, 0);

  while (totalSets > SESSION_MAX_SETS) {
    const sorted = byTrimPriority(slots, musclePriorities);
    const target = sorted[0];
    if (!target) break;

    const ref = slots.find((s) => s.id === target.id)!;

    if (ref.sets <= 1) {
      slots = slots.filter((s) => s.id !== ref.id);
      totalSets -= ref.sets;
    } else {
      ref.sets -= 1;
      totalSets -= 1;
    }
  }

  // Renumber sort orders after any removals
  const finalSlots = slots.map((slot, idx) => ({ ...slot, sortOrder: idx }));
  const finalSets = finalSlots.reduce((n, s) => n + s.sets, 0);

  return {
    ...day,
    slots: finalSlots,
    totalSets: finalSets,
    estimatedMinutes: Math.round(finalSets * 3.5),
    primaryMuscles: [...new Set(finalSlots.map((s) => s.muscle))],
  };
}
