import { classifyMovement } from '../data/movementClassMap';
import type { ExerciseSlot } from '../types/program';

export interface ExerciseCandidate {
  name: string;
  muscleGroup: string;
  equipment: string;
  movementCategory?: string | null;
}

export interface SelectExerciseOptions {
  preferredEquipment: string[];
  usePreferredEquipment: boolean;
  // Exercise names logged in the most recent completed workout.
  lastSessionNames: Set<string>;
  // Exercise names logged in the most recent *two* completed workouts.
  last2SessionsNames: Set<string>;
  // Names already picked for another slot in the session currently being
  // generated — prevents picking the same exercise for two slots.
  alreadyUsedThisWorkout: Set<string>;
}

function isPreferredEquipment(equipment: string, preferredEquipment: string[]): boolean {
  return (
    equipment === 'Bodyweight' ||
    preferredEquipment.some((p) => p.toLowerCase() === equipment.toLowerCase())
  );
}

// Deterministically picks one exercise for a structural slot. Each stage
// below narrows the candidate pool; if a stage would empty the pool it's
// skipped (falls back to the pool from the previous stage) rather than ever
// returning nothing just because a preference couldn't be satisfied. The only
// case this returns null is when no exercise at all exists for the slot's
// muscle group.
export function selectExerciseForSlot(
  slot: ExerciseSlot,
  candidates: ExerciseCandidate[],
  opts: SelectExerciseOptions,
): ExerciseCandidate | null {
  // Hard filter — never relaxed: must train the right muscle, must not
  // already be used elsewhere in this generated session.
  let pool = candidates.filter(
    (c) => c.muscleGroup === slot.muscle && !opts.alreadyUsedThisWorkout.has(c.name),
  );
  if (pool.length === 0) return null;

  // Equipment preference.
  if (opts.usePreferredEquipment && opts.preferredEquipment.length > 0) {
    const preferred = pool.filter((c) => isPreferredEquipment(c.equipment, opts.preferredEquipment));
    if (preferred.length > 0) pool = preferred;
  }

  // Movement-class preference: Primary/Secondary slots lean compound,
  // Accessory slots lean isolation. Exercises with an 'unknown' class (no
  // movement_category, or a category not in movementClassMap) are excluded
  // by this filter but recoverable by the fallback below.
  const wantsCompound = slot.role === 'Primary' || slot.role === 'Secondary';
  const wantClass = wantsCompound ? 'compound' : 'isolation';
  const classFiltered = pool.filter((c) => classifyMovement(c.movementCategory) === wantClass);
  if (classFiltered.length > 0) pool = classFiltered;

  // Anti-repeat window, sized by slot role (Quick Workout variety heuristic —
  // NOT a doctrine tag, no research citation applies; a product/UX choice,
  // not a training-science claim, so it's intentionally not numbered
  // HV/ST/PB/RC/VA per AGENTS.md's Tag system). Compound-leaning slots
  // (Primary/Secondary) repeat readily — a bench press doesn't need to be a
  // different exercise every session. Isolation-leaning (Accessory) slots
  // rotate over a longer, 2-session window for more variety.
  const excludeNames = wantsCompound ? opts.lastSessionNames : opts.last2SessionsNames;
  const freshPool = pool.filter((c) => !excludeNames.has(c.name));
  if (freshPool.length > 0) pool = freshPool;

  // Deterministic tie-break — no randomness. Variety comes from stage 4
  // shifting as history changes week to week, not from RNG.
  const sorted = [...pool].sort((a, b) => a.name.localeCompare(b.name));
  return sorted[0] ?? null;
}
