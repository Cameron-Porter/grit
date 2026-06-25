import type { DayPlan, ExerciseSlot, MuscleGroup, MusclePriority, ProgramFocus } from '../types/program';

export const SESSION_MAX_EXERCISES = 5;
export const SESSION_MAX_SETS = 24;
export const SESSION_TARGET_SETS_MIN = 8;

// RC-005: cut phase hard cap — 20 sets × 3.5 min ≈ 70 min (well under 90-min limit)
const SESSION_MAX_SETS_CUT = 20;
const SESSION_MAX_EXERCISES_CUT = 4;

// Full Body region membership — used to protect the last slot per region from trimming
const FB_PUSH_REGION: MuscleGroup[] = ['Chest', 'Shoulders', 'Triceps'];
const FB_PULL_REGION: MuscleGroup[] = ['Back', 'Biceps', 'Traps', 'Forearms'];
const FB_LOWER_REGION: MuscleGroup[] = ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'];
const FB_REGIONS = [FB_PUSH_REGION, FB_PULL_REGION, FB_LOWER_REGION];

// Returns true when removing this slot would eliminate all representation for
// its movement region in a Full Body session.
function isLastInRegion(slot: ExerciseSlot, slots: ExerciseSlot[]): boolean {
  for (const region of FB_REGIONS) {
    if (!(region as string[]).includes(slot.muscle)) continue;
    const regionCount = slots.filter((s) => (region as string[]).includes(s.muscle)).length;
    return regionCount <= 1;
  }
  return false;
}

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
//   1. Remove slots until ≤ exercise cap (lowest priority first)
//   2. Trim sets until ≤ set cap (reduce 1 set at a time from lowest
//      priority). When a slot would drop below 2 sets, remove the whole slot.
export function enforceSessionCaps(
  day: DayPlan,
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
  focus?: ProgramFocus,
): DayPlan {
  const isCut = focus === 'cut';
  const maxExercises = isCut ? SESSION_MAX_EXERCISES_CUT : SESSION_MAX_EXERCISES;
  const maxSets = isCut ? SESSION_MAX_SETS_CUT : SESSION_MAX_SETS;

  const isFullBody = day.sessionType === 'FullBody';
  let slots = [...day.slots];

  // ── Phase 1: slot count cap ──────────────────────────────────────────────
  while (slots.length > maxExercises) {
    const sorted = byTrimPriority(slots, musclePriorities);
    // For Full Body sessions skip any candidate that is the last slot for its
    // movement region — we must keep push, pull, and lower represented.
    const victim = isFullBody
      ? sorted.find((s) => !isLastInRegion(s, slots))
      : sorted[0];
    if (!victim) break; // all remaining slots are region anchors — stop trimming
    slots = slots.filter((s) => s.id !== victim.id);
  }

  // ── Phase 2: set count cap ───────────────────────────────────────────────
  let totalSets = slots.reduce((n, s) => n + s.sets, 0);

  while (totalSets > maxSets) {
    const sorted = byTrimPriority(slots, musclePriorities);
    const target = isFullBody
      ? sorted.find((s) => !isLastInRegion(s, slots))
      : sorted[0];
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
