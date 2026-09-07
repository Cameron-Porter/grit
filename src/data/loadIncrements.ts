// ─── HV-041: Equipment load increments ─────────────────────────────────────
//
// Load increments must match hardware that actually exists. The engine
// previously sized every jump from the weight alone (2.5 lb under 100, 5 lb
// over), which produced prescriptions like a 77.5 lb dumbbell — a dumbbell
// that exists in no gym.
//
// Sources: the increments below are physical facts about standard commercial
// gym equipment, cross-checked against RP Hypertrophy's own exercise-type
// taxonomy (Machine / Barbell / Smith machine / Dumbbell / Cable / Freemotion
// / Bodyweight only / Bodyweight loadable / Machine assistance), which splits
// exercises along exactly these lines because each loads differently:
//
//   Barbell   — loaded in pairs. The smallest plate pair in general use is
//               2.5 lb (1.25 lb each side); 5 lb is the practical default
//               because 1.25s are not universally stocked.
//   Dumbbell  — fixed dumbbells step in 5 lb through the range commercial
//               racks cover. Confirmed against RP session logs, where every
//               dumbbell load lands on a 5 lb multiple (40, 50, 70 lb).
//   Machine   — selectorized stacks pin in 10 lb steps on most plate stacks.
//   Cable     — cable stacks are finer than machine stacks, commonly 5 lb.
//   Bodyweight— no external load; the engine progresses reps instead (HV-028).
//
// Deliberately conservative: where a gym has finer hardware (micro-plates,
// 2.5 lb dumbbells) the worst case is a slightly larger jump, whereas being
// too fine prescribes a weight the user cannot physically select.
export const EQUIPMENT_LOAD_INCREMENT: Record<string, number> = {
  Barbell: 5,
  Dumbbell: 5,
  Machine: 10,
  Cable: 5,
};

// Used when equipment is absent or unrecognised. 5 lb is the smallest jump
// that every loadable category above can actually make.
export const DEFAULT_LOAD_INCREMENT = 5;

/**
 * The smallest load step this equipment can actually make. Bodyweight returns
 * 0 — it has no external load, and callers progress reps instead.
 */
export function loadIncrementFor(equipment: string | null | undefined): number {
  if (equipment === 'Bodyweight') return 0;
  if (!equipment) return DEFAULT_LOAD_INCREMENT;
  return EQUIPMENT_LOAD_INCREMENT[equipment] ?? DEFAULT_LOAD_INCREMENT;
}

/** Snap a weight onto the nearest step this equipment can actually be set to. */
export function snapToEquipment(weight: number, equipment: string | null | undefined): number {
  const step = loadIncrementFor(equipment);
  if (step <= 0) return weight;
  return Math.max(step, Math.round(weight / step) * step);
}
