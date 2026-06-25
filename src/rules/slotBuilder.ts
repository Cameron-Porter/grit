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

const MAX_SLOTS_PER_SESSION = 5;
const MIN_SLOTS_PER_SESSION = 4;

// Regions used for Full Body coverage guarantees
const FB_PUSH_REGION: MuscleGroup[] = ['Chest', 'Shoulders', 'Triceps'];
const FB_PULL_REGION: MuscleGroup[] = ['Back', 'Biceps', 'Traps', 'Forearms'];
const FB_LOWER_REGION: MuscleGroup[] = ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'];

// ─── Priority score helper ────────────────────────────────────────────────────
function priorityScore(p: MusclePriority | 'mev' | undefined): number {
  switch (p) {
    case 'emphasize': return 3;
    case 'grow':      return 2;
    case 'maintain':  return 1;
    default:          return 0;
  }
}

// ─── Full Body region-balanced selection ─────────────────────────────────────
//
// Guarantees at least one slot per movement region (push / pull / lower) so a
// Full Body session always trains the whole body regardless of priority skew.
// After the three anchors are locked in, remaining capacity is filled by the
// highest-priority remaining primaries, then secondaries for grow/emphasize.
function selectIncludedPairsFullBody(
  dayMuscles: Map<MuscleGroup, MusclePriority | 'mev'>,
  template: SessionTemplate,
  maxSlots: number,
): Set<string> {
  const included = new Set<string>();

  const templatePrimaryMuscles = new Set(
    template.slots.filter((s) => s.role === 'Primary').map((s) => s.muscle),
  );

  // Pick the highest-priority assigned muscle from a region that has a Primary slot.
  function pickAnchor(region: MuscleGroup[]): string | null {
    let best: { key: string; score: number } | null = null;
    for (const muscle of region) {
      if (!templatePrimaryMuscles.has(muscle)) continue;
      const p = dayMuscles.get(muscle);
      if (!p) continue;
      const score = priorityScore(p);
      const key = `${muscle}-Primary`;
      if (!included.has(key) && (!best || score > best.score)) {
        best = { key, score };
      }
    }
    return best?.key ?? null;
  }

  // Phase 1: one anchor per region
  for (const region of [FB_PUSH_REGION, FB_PULL_REGION, FB_LOWER_REGION]) {
    if (included.size >= maxSlots) break;
    const anchor = pickAnchor(region);
    if (anchor) included.add(anchor);
  }

  // Phase 2: fill remaining capacity with highest-priority primaries
  const candidates = template.slots
    .filter((s) => s.role === 'Primary')
    .map((s) => ({ key: `${s.muscle}-Primary`, score: priorityScore(dayMuscles.get(s.muscle)) }))
    .filter(({ key, score }) => !included.has(key) && score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { key } of candidates) {
    if (included.size >= maxSlots) break;
    included.add(key);
  }

  // Phase 3: secondaries for emphasize/grow if there is still room
  for (const spec of template.slots) {
    if (included.size >= maxSlots) break;
    if (spec.role !== 'Secondary') continue;
    const p = dayMuscles.get(spec.muscle);
    if (p !== 'emphasize' && p !== 'grow') continue;
    const key = `${spec.muscle}-Secondary`;
    if (!included.has(key)) included.add(key);
  }

  return included;
}

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

  // Phase 4 — backfill to minimum: Phases 1–3 can leave very few slots when
  // most assigned muscles land at mev priority (e.g. a Legs day where Quads/
  // Hamstrings/Glutes only have Primary/Secondary template slots). Scan the
  // template in order — Primary before Secondary — adding any assigned muscle
  // until we hit MIN_SLOTS_PER_SESSION.
  if (included.size < MIN_SLOTS_PER_SESSION) {
    for (const spec of template.slots) {
      if (included.size >= MIN_SLOTS_PER_SESSION) break;
      if (!dayMuscles.has(spec.muscle)) continue;
      const key = `${spec.muscle}-${spec.role}`;
      if (!included.has(key)) included.add(key);
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
  const includedPairs = template.sessionType === 'FullBody'
    ? selectIncludedPairsFullBody(dayMuscles, template, maxSlots)
    : selectIncludedPairs(dayMuscles, template, maxSlots);

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

  // HV-008: Forearm placement — always after the last Back/Biceps/Traps slot.
  // This enforces the rule at generation time regardless of template ordering.
  const forearmIndices = result.reduce<number[]>((acc, slot, i) => {
    if (slot.muscle === 'Forearms') acc.push(i);
    return acc;
  }, []);

  if (forearmIndices.length > 0) {
    const pullMuscles: MuscleGroup[] = ['Back', 'Biceps', 'Traps'];
    let lastPullIdx = -1;
    for (let i = result.length - 1; i >= 0; i--) {
      if (pullMuscles.includes(result[i].muscle)) {
        lastPullIdx = i;
        break;
      }
    }

    if (lastPullIdx >= 0 && forearmIndices.some((fi) => fi <= lastPullIdx)) {
      // Remove Forearm slots from their current positions, then insert after lastPullIdx.
      const forearmSlots = forearmIndices.map((fi) => result[fi]);
      const nonForearm = result.filter((_, i) => !forearmIndices.includes(i));
      // Find new insertion point (position after last pull slot in the non-forearm array)
      const insertAfter = nonForearm.reduce((acc, slot, i) => {
        if (pullMuscles.includes(slot.muscle)) return i;
        return acc;
      }, -1);
      nonForearm.splice(insertAfter + 1, 0, ...forearmSlots);
      // Recompute sortOrder
      for (let i = 0; i < nonForearm.length; i++) {
        nonForearm[i] = { ...nonForearm[i], sortOrder: i };
      }
      return nonForearm;
    }
  }

  return result;
}
