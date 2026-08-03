import { PRIMARY_ROLE_OVERLAP } from '../data/roleOverlap';
import type { MuscleGroup, SessionType, WeeklyVolumeTarget } from '../types/program';

export const SESSION_MUSCLES: Record<SessionType, MuscleGroup[]> = {
  FullBody:            ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes'],
  Upper:               ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
  Lower:               ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'],
  Push:                ['Chest', 'Shoulders', 'Triceps'],
  Pull:                ['Back', 'Biceps', 'Traps', 'Forearms'],
  Legs:                ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  LowerQuadFocus:      ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'],
  LowerPosteriorChain: ['Hamstrings', 'Glutes', 'Quads', 'Calves', 'Abs'],
  LowerGluteQuad:      ['Glutes', 'Quads', 'Hamstrings', 'Calves', 'Abs'],
};

// Preferred session types per muscle, ordered from most to least ideal.
// Determines which sessions receive direct work when downsampling.
// e.g. Triceps prefers Push over Upper — on Push they are a primary mover,
// on Upper they are a tertiary assistor. Training them on Push maximises
// quality and allows Upper to be a pure compound-pair session.
// Preferred session types per muscle, ordered most → least ideal.
// Specialized lower types are listed before generic Lower/Legs so that each
// muscle gravitates toward its designated "home" session when multiple lower
// day types are present (e.g., Quads prefers LowerQuadFocus over LowerGluteQuad).
const SESSION_PREFERENCE: Record<MuscleGroup, SessionType[]> = {
  Chest:      ['Push', 'FullBody', 'Upper'],
  Shoulders:  ['Push', 'FullBody', 'Upper'],
  Triceps:    ['Push', 'FullBody', 'Upper'],
  Back:       ['Pull', 'FullBody', 'Upper'],
  Biceps:     ['Pull', 'FullBody', 'Upper'],
  Traps:      ['Pull', 'FullBody', 'Upper'],
  Forearms:   ['Pull', 'FullBody', 'Upper'],
  // Quads: quad-focused sessions first, posterior chain last (squat is secondary there)
  // Hamstrings: posterior chain primary, then quad-focus (RDL after squats is standard)
  // Glutes: glute sessions first, then quad-focus (hip thrust pairs with squats well)
  // This ensures all three muscles spread across all three lower day types when freq≥2,
  // rather than clustering Hamstrings + Glutes on just two of the three days.
  Quads:      ['LowerQuadFocus', 'LowerGluteQuad', 'Lower', 'Legs', 'LowerPosteriorChain', 'FullBody'],
  Hamstrings: ['LowerPosteriorChain', 'LowerQuadFocus', 'LowerGluteQuad', 'Legs', 'Lower', 'FullBody'],
  Glutes:     ['LowerGluteQuad', 'LowerQuadFocus', 'LowerPosteriorChain', 'Legs', 'Lower', 'FullBody'],
  // Calves prefer LQF then LGQ: spreads them Mon + Fri so each lower day pairing has calf work
  // Abs prefer LQF then LPC: spreads them Mon + Wed, complementing Calves on the other two days
  Calves:     ['LowerQuadFocus', 'LowerGluteQuad', 'Lower', 'Legs', 'LowerPosteriorChain', 'FullBody'],
  Abs:        ['LowerQuadFocus', 'LowerPosteriorChain', 'Lower', 'Legs', 'LowerGluteQuad', 'FullBody'],
};

function sessionTypesForMuscle(muscle: MuscleGroup): SessionType[] {
  return (Object.entries(SESSION_MUSCLES) as [SessionType, MuscleGroup[]][])
    .filter(([, muscles]) => muscles.includes(muscle))
    .map(([type]) => type);
}

// Rank an index by how preferred its session type is for this muscle.
// Lower score = more preferred = picked first.
function preferenceRank(sessionType: SessionType, muscle: MuscleGroup): number {
  const prefs = SESSION_PREFERENCE[muscle] ?? [];
  const idx = prefs.indexOf(sessionType);
  return idx === -1 ? prefs.length : idx; // unranked types come last
}

// RC-008: max of both directions since PRIMARY_ROLE_OVERLAP is asymmetric
// (e.g. Chest -> Triceps 0.40 is listed, Triceps -> Chest is not).
// Source: Dr. Mike Israetel / RP Hypertrophy — secondary muscle stimulus
// coefficients (see roleOverlap.ts VA-014).
function overlapCoefficient(a: MuscleGroup, b: MuscleGroup): number {
  return Math.max(PRIMARY_ROLE_OVERLAP[a]?.[b] ?? 0, PRIMARY_ROLE_OVERLAP[b]?.[a] ?? 0);
}

// RC-008: penalty for assigning `muscle` to `idx` given which other muscles
// already occupy which days this week. Same-day overlap counts in full;
// adjacent-day overlap (residual fatigue, not lost recovery time) counts at
// half weight. Zero when there's no meaningful overlap (most muscle pairs).
function overlapPenalty(
  idx: number,
  muscle: MuscleGroup,
  alreadyAssigned: Map<MuscleGroup, number[]>,
): number {
  let penalty = 0;
  for (const [otherMuscle, otherIndices] of alreadyAssigned) {
    if (otherMuscle === muscle) continue;
    const coeff = overlapCoefficient(muscle, otherMuscle);
    if (coeff === 0) continue;
    for (const otherIdx of otherIndices) {
      if (otherIdx === idx) penalty += coeff;
      else if (Math.abs(otherIdx - idx) === 1) penalty += coeff * 0.5;
    }
  }
  return penalty;
}

// RC-007: how far idx is from the nearest already-chosen day for this same
// muscle. Larger = better spacing. Infinity when nothing chosen yet (no
// spacing constraint to satisfy).
function minGapTo(idx: number, chosen: number[]): number {
  if (chosen.length === 0) return Infinity;
  return Math.min(...chosen.map((c) => Math.abs(c - idx)));
}

// RC-007/RC-008: greedily fill `needed` more slots from `candidates` (all in
// the same SESSION_PREFERENCE tier, so preference rank can't discriminate
// between them), preferring day-indices that (a) avoid overlap with muscles
// already assigned this week and (b) stay evenly spaced from this muscle's
// own already-chosen days (`seed`, e.g. picks from a more-preferred tier).
// Source: Dr. Mike Israetel / RP Hypertrophy — symmetrical weekly muscle
// spacing and overlap-aware scheduling.
const SPACING_WEIGHT = 0.3;

function selectSpacedAndDeconflicted(
  candidates: number[],
  needed: number,
  seed: number[],
  muscle: MuscleGroup,
  alreadyAssigned: Map<MuscleGroup, number[]>,
): number[] {
  const chosen = [...seed];
  const picked: number[] = [];
  const pool = [...candidates];

  while (picked.length < needed && pool.length > 0) {
    let bestPoolIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const idx = pool[i];
      const overlap = overlapPenalty(idx, muscle, alreadyAssigned);
      const gap = minGapTo(idx, chosen);
      const spacing = gap === Infinity ? 0 : -gap * SPACING_WEIGHT;
      const score = overlap + spacing;
      if (score < bestScore || (score === bestScore && idx < pool[bestPoolIdx])) {
        bestScore = score;
        bestPoolIdx = i;
      }
    }
    const pick = pool[bestPoolIdx];
    picked.push(pick);
    chosen.push(pick);
    pool.splice(bestPoolIdx, 1);
  }

  return picked;
}

// Returns the day indices (within weekSessions) on which this muscle should
// receive direct work, up to its sessionFrequency.
//
// When downsampling (more eligible sessions than frequency allows), sessions
// are ranked by SESSION_PREFERENCE so that e.g. Triceps always goes to Push
// before Upper. This keeps "primary" sessions focused and Upper/Lower sessions
// from becoming cluttered with tertiary accessory work. Within a preference
// tier (RC-007/RC-008), ties are broken by even spacing and overlap avoidance
// against muscles already assigned — not raw day-index order.
//
// `alreadyAssigned` should contain every muscle processed earlier in this
// week's assignment loop (see programBuilder.ts, which iterates ALL_MUSCLES in
// a fixed order and accumulates into the same map instance).
export function assignMuscleSessions(
  weekSessions: SessionType[],
  target: WeeklyVolumeTarget,
  alreadyAssigned?: Map<MuscleGroup, number[]>,
): number[] {
  const eligibleTypes = sessionTypesForMuscle(target.muscle);
  const matchingIndices = weekSessions
    .map((type, idx) => (eligibleTypes.includes(type) ? idx : -1))
    .filter((idx): idx is number => idx !== -1);

  if (matchingIndices.length === 0) return [];
  if (matchingIndices.length <= target.sessionFrequency) return matchingIndices;

  // Group into preference-rank tiers, most-preferred first.
  const byRank = new Map<number, number[]>();
  for (const idx of matchingIndices) {
    const rank = preferenceRank(weekSessions[idx], target.muscle);
    const bucket = byRank.get(rank) ?? [];
    bucket.push(idx);
    byRank.set(rank, bucket);
  }
  const ranks = [...byRank.keys()].sort((a, b) => a - b);

  const result: number[] = [];
  for (const rank of ranks) {
    if (result.length >= target.sessionFrequency) break;
    const tier = byRank.get(rank)!;
    const needed = target.sessionFrequency - result.length;
    if (tier.length <= needed) {
      result.push(...tier);
    } else {
      result.push(
        ...selectSpacedAndDeconflicted(tier, needed, result, target.muscle, alreadyAssigned ?? new Map()),
      );
    }
  }

  return result.sort((a, b) => a - b);
}
