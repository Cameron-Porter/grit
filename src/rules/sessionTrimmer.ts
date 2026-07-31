import type { DayPlan, ExerciseSlot, MuscleGroup, MusclePriority, ProgramFocus, SlotRole } from '../types/program';

export const SESSION_MAX_EXERCISES = 5;
export const SESSION_MAX_SETS = 24;
export const SESSION_TARGET_SETS_MIN = 8;

// RC-005: cut phase hard cap — 20 sets × 3.5 min ≈ 70 min (well under 90-min limit)
const SESSION_MAX_SETS_CUT = 20;
const SESSION_MAX_EXERCISES_CUT = 4;

// ST-009: strength-focus session set cap — much more than ~15 heavy work sets
// in a single session drops most lifters below the minimum loading thresholds
// (75%/82.5%/87.5% 1RM for their rep zone), producing junk volume even if it
// still feels heavy. 2-5 sets per movement type is the productive range; this
// caps the whole session, not any single movement.
// Source: RP Strength "Strength Training Made Simple" (2023), "Productive
// Sets Per Session" (2-5 sets/movement type, <15 sets/session).
const SESSION_MAX_SETS_STRENGTH = 15;

// RC-006: at 4+ training days/week, cap distinct muscle groups per session —
// training 7-8 muscle groups in one session guarantees the last few get
// inadequate stimulus regardless of how many exercise slots remain. Lower
// frequencies (2-3 days/week) don't get this cap: a Full Body session at low
// frequency is supposed to cover more ground per session.
// Source: Dr. Mike Israetel / RP Hypertrophy — session muscle-group limits at
// higher training frequencies.
const MAX_MUSCLE_GROUPS_HIGH_FREQ = 5;
const HIGH_FREQUENCY_THRESHOLD = 4;

// RC-009: per-role/-focus minute cost per set, replacing the flat 3.5 min/set
// constant that only worked for hypertrophy-style rep ranges by coincidence.
// Strength-focus Primary work needs longer inter-set rest (heavy, low-rep
// compounds); cut focus keeps the original flat estimate since RC-005's
// set/exercise caps are already conservative enough to stay well under the
// 90-minute ceiling regardless of per-set rest time.
// Source: NSCA Essentials of Strength Training and Conditioning — rest
// interval guidelines by training goal/intensity zone.
const SESSION_MAX_MINUTES = 90;
const MINUTES_PER_SET: Record<'strength' | 'default', Record<SlotRole, number>> = {
  strength: { Primary: 5, Secondary: 3.5, Accessory: 2.5 },
  default:  { Primary: 4, Secondary: 3,   Accessory: 2 },
};

export function estimateSlotMinutes(slot: ExerciseSlot, focus?: ProgramFocus): number {
  if (focus === 'cut') return slot.sets * 3.5;
  const table = focus === 'strength' ? MINUTES_PER_SET.strength : MINUTES_PER_SET.default;
  return slot.sets * table[slot.role];
}

export function estimateSessionMinutes(slots: ExerciseSlot[], focus?: ProgramFocus): number {
  return Math.round(slots.reduce((n, s) => n + estimateSlotMinutes(s, focus), 0));
}

// RC-010: post-generation counterpart to enforceSessionCaps' Phase 2, for
// trimming an already-computed set of progression targets back under the
// session set cap. Deliberately narrower than generation-time trimming:
// this never drops an exercise's sets below 1 or removes an exercise
// entirely — a program already in flight shouldn't suddenly lose a movement
// the user has been training for weeks just because volume ramped high this
// week. Same trim-priority order as enforceSessionCaps (lowest muscle
// priority first, then Accessory before Secondary before Primary, then most
// sets first) so the two paths can't diverge on *which* sets get trimmed,
// only on how far they're willing to go.
export interface TrimmableSets {
  role: SlotRole;
  musclePriority: MusclePriority | 'mev';
  sets: number;
}

export function capSessionSets<T extends TrimmableSets>(items: T[], maxSets: number): T[] {
  const current = items.map((item) => ({ ...item }));
  let total = current.reduce((n, i) => n + i.sets, 0);

  while (total > maxSets) {
    const sorted = [...current].sort((a, b) => {
      const pa = trimPriority(a.musclePriority);
      const pb = trimPriority(b.musclePriority);
      if (pa !== pb) return pa - pb;
      const roleOrder = (s: TrimmableSets) => (s.role === 'Accessory' ? 0 : s.role === 'Secondary' ? 1 : 2);
      if (roleOrder(a) !== roleOrder(b)) return roleOrder(a) - roleOrder(b);
      return b.sets - a.sets;
    });
    const target = sorted.find((s) => s.sets > 1);
    if (!target) break; // everything's already at the 1-set floor — stop
    target.sets -= 1;
    total -= 1;
  }

  return current;
}

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

// RC-010: the whole-session set cap (SESSION_MAX_SETS/_CUT/_STRENGTH) is
// enforced by enforceSessionCaps at generation time, but progression
// (computeAndSaveProgressionTargets in src/api/progression.ts) recomputes
// each exercise's sets independently week-to-week via the landmark ramp
// (HV-021) capped only per-exercise (HV-023) — nothing re-checked the
// session's new total against this same ceiling, so a session could
// gradually climb toward (or past) it as multiple muscles ramp toward MRV
// simultaneously. Exposed here so progression.ts can reuse the exact same
// cap value instead of hard-coding a second copy of it.
export function getSessionMaxSets(focus?: ProgramFocus): number {
  if (focus === 'cut') return SESSION_MAX_SETS_CUT;
  if (focus === 'strength') return SESSION_MAX_SETS_STRENGTH;
  return SESSION_MAX_SETS;
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

// RC-006: whether `muscle` is the only muscle (among `muscles`) representing
// its Full Body movement region — removing it would erase that region's
// coverage for the session entirely.
function isMuscleOnlyRepresentativeOfRegion(muscle: MuscleGroup, muscles: Set<MuscleGroup>): boolean {
  for (const region of FB_REGIONS) {
    if (!(region as string[]).includes(muscle)) continue;
    const regionMuscles = [...muscles].filter((m) => (region as string[]).includes(m));
    return regionMuscles.length <= 1;
  }
  return false;
}

// RC-006: remove whole muscles (all of their slots together, not slot-by-slot)
// until distinct muscle-group count is at or below the high-frequency cap.
function enforceMuscleGroupCap(
  slots: ExerciseSlot[],
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
  isFullBody: boolean,
): ExerciseSlot[] {
  let current = slots;

  while (true) {
    const distinctMuscles = new Set(current.map((s) => s.muscle));
    if (distinctMuscles.size <= MAX_MUSCLE_GROUPS_HIGH_FREQ) break;

    const musclesByTrimPriority = [...distinctMuscles].sort(
      (a, b) => trimPriority(musclePriorities[a] ?? 'mev') - trimPriority(musclePriorities[b] ?? 'mev'),
    );
    const victimMuscle = isFullBody
      ? musclesByTrimPriority.find((m) => !isMuscleOnlyRepresentativeOfRegion(m, distinctMuscles))
      : musclesByTrimPriority[0];

    if (!victimMuscle) break; // every remaining muscle is a region anchor — stop
    current = current.filter((s) => s.muscle !== victimMuscle);
  }

  return current;
}

// Enforce hard session limits:
//   0. Cap distinct muscle groups per session at 4+ days/week (lowest
//      priority muscle removed first)
//   1. Remove slots until ≤ exercise cap (lowest priority first)
//   2. Trim sets until ≤ set cap (reduce 1 set at a time from lowest
//      priority). When a slot would drop below 2 sets, remove the whole slot.
//   3. Trim further until ≤ 90 estimated minutes (same victim-selection order)
export function enforceSessionCaps(
  day: DayPlan,
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
  focus?: ProgramFocus,
  daysPerWeek?: number,
): DayPlan {
  const isCut = focus === 'cut';
  const maxExercises = isCut ? SESSION_MAX_EXERCISES_CUT : SESSION_MAX_EXERCISES;
  // ST-009: strength gets its own (tighter) set cap; cut's still wins if both
  // would apply, since programFocus is single-valued so this is never a
  // simultaneous conflict — cut and strength are mutually exclusive focuses.
  const maxSets = getSessionMaxSets(focus);

  const isFullBody = day.sessionType === 'FullBody';
  let slots = [...day.slots];

  // ── Phase 0: muscle-group cap (RC-006), only at 4+ days/week ─────────────
  if (daysPerWeek !== undefined && daysPerWeek >= HIGH_FREQUENCY_THRESHOLD) {
    slots = enforceMuscleGroupCap(slots, musclePriorities, isFullBody);
  }

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

  // ── Phase 3: session-duration cap (RC-009) ───────────────────────────────
  let totalMinutes = estimateSessionMinutes(slots, focus);

  while (totalMinutes > SESSION_MAX_MINUTES) {
    const sorted = byTrimPriority(slots, musclePriorities);
    const target = isFullBody
      ? sorted.find((s) => !isLastInRegion(s, slots))
      : sorted[0];
    if (!target) break;

    const ref = slots.find((s) => s.id === target.id)!;

    if (ref.sets <= 1) {
      slots = slots.filter((s) => s.id !== ref.id);
    } else {
      ref.sets -= 1;
    }
    totalMinutes = estimateSessionMinutes(slots, focus);
  }

  // Renumber sort orders after any removals
  const finalSlots = slots.map((slot, idx) => ({ ...slot, sortOrder: idx }));
  const finalSets = finalSlots.reduce((n, s) => n + s.sets, 0);

  return {
    ...day,
    slots: finalSlots,
    totalSets: finalSets,
    estimatedMinutes: estimateSessionMinutes(finalSlots, focus),
    primaryMuscles: [...new Set(finalSlots.map((s) => s.muscle))],
  };
}
