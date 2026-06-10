import type { MuscleGroup, MusclePriority, SessionType, SplitDerivation } from '../types/program';

// ─── Region constants ─────────────────────────────────────────────────────────
export const UPPER_MUSCLES: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Traps', 'Forearms',
];
export const LOWER_MUSCLES: MuscleGroup[] = [
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs',
];
const PUSH_MUSCLES: MuscleGroup[] = ['Chest', 'Shoulders', 'Triceps'];
const PULL_MUSCLES: MuscleGroup[] = ['Back', 'Biceps', 'Traps'];

export const LOWER_SESSION_TYPES: readonly SessionType[] = [
  'Lower', 'Legs', 'LowerQuadFocus', 'LowerPosteriorChain', 'LowerGluteQuad',
];

// ─── Priority weights ─────────────────────────────────────────────────────────
// mev = 0 so muscles the user didn't explicitly prioritize don't drive split
// decisions — only explicit priorities allocate training days.
const PRIORITY_WEIGHTS: Record<MusclePriority | 'mev', number> = {
  mev:      0,
  maintain: 1,
  grow:     2,
  emphasize: 3,
};

function priorityWeight(p: MusclePriority | undefined): number {
  return PRIORITY_WEIGHTS[p ?? 'mev'];
}

function scoreRegion(
  muscles: MuscleGroup[],
  priorities: Partial<Record<MuscleGroup, MusclePriority>>,
): number {
  return muscles.reduce((sum, m) => sum + priorityWeight(priorities[m]), 0);
}

// ─── Session labels ───────────────────────────────────────────────────────────
export const SESSION_LABELS: Record<SessionType, string> = {
  Push:                'Push',
  Pull:                'Pull',
  Legs:                'Legs',
  Upper:               'Upper Body',
  Lower:               'Lower Body',
  FullBody:            'Full Body',
  LowerQuadFocus:      'Lower: Quad Focus',
  LowerPosteriorChain: 'Lower: Posterior Chain',
  LowerGluteQuad:      'Lower: Glute & Quad',
};

// Short slugs used to build the human-readable split-type label.
const SESSION_TYPE_SLUG: Record<SessionType, string> = {
  Push:                'push',
  Pull:                'pull',
  Legs:                'legs',
  Upper:               'upper',
  Lower:               'lower',
  FullBody:            'full',
  LowerQuadFocus:      'lower-quad',
  LowerPosteriorChain: 'lower-pc',
  LowerGluteQuad:      'lower-gq',
};

// ─── Regional day allocation ──────────────────────────────────────────────────
// Cap at 60 % prevents degenerate outcomes (e.g. 4 upper + 1 lower even when
// lower score is non-zero). Spec examples confirm: upper=12, lower=3, 5 days
// → 3 upper + 2 lower (not 4+1).
const MAX_REGION_FRACTION = 0.60;

function allocateRegionDays(
  upperScore: number,
  lowerScore: number,
  total: number,
): { upperDays: number; lowerDays: number } {
  const totalScore = upperScore + lowerScore;
  if (totalScore === 0) {
    return { upperDays: Math.ceil(total / 2), lowerDays: Math.floor(total / 2) };
  }

  const upperRatio = upperScore / totalScore;
  let upperDays = Math.round(upperRatio * total);

  // Dominant region capped at 60 % — applies symmetrically to both sides
  const maxDominant = Math.ceil(total * MAX_REGION_FRACTION);
  upperDays = Math.min(upperDays, maxDominant);           // upper can't over-dominate
  upperDays = Math.max(upperDays, total - maxDominant);   // lower can't over-dominate

  // Each region that has any priority weight gets ≥ 1 day
  if (lowerScore > 0) upperDays = Math.min(upperDays, total - 1);
  if (upperScore > 0) upperDays = Math.max(upperDays, 1);

  return { upperDays, lowerDays: total - upperDays };
}

// ─── Upper day type selection ─────────────────────────────────────────────────
// When push muscles score higher than pull, push gets the extra day and vice versa.
// Single upper day → generic 'Upper' (interleaved push/pull compounds).
function selectUpperDayTypes(
  upperDays: number,
  pushScore: number,
  pullScore: number,
): SessionType[] {
  switch (upperDays) {
    case 0: return [];
    case 1: return ['Upper'];
    case 2:
      return pushScore >= pullScore ? ['Push', 'Pull'] : ['Pull', 'Push'];
    case 3:
      if (pushScore > pullScore) return ['Push', 'Pull', 'Push'];
      if (pullScore > pushScore) return ['Pull', 'Push', 'Pull'];
      return ['Push', 'Pull', 'Upper'];
    default: {
      // 4+ upper days: cycle starting from dominant side
      const cycle: SessionType[] = pushScore >= pullScore
        ? ['Push', 'Pull', 'Push', 'Pull', 'Upper']
        : ['Pull', 'Push', 'Pull', 'Push', 'Upper'];
      return cycle.slice(0, upperDays);
    }
  }
}

// ─── Lower day type selection ─────────────────────────────────────────────────
// Uses specialized variants only when ≥1 lower muscle is emphasized.
// Otherwise generic 'Lower' days are sufficient (maintain/grow doesn't warrant
// session-type differentiation within the lower region).
function selectLowerDayTypes(
  lowerDays: number,
  priorities: Partial<Record<MuscleGroup, MusclePriority>>,
): SessionType[] {
  const anyLowerEmphasis = (['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'] as MuscleGroup[])
    .some((m) => priorities[m] === 'emphasize');

  if (!anyLowerEmphasis) {
    return Array.from({ length: lowerDays }, (): SessionType => 'Lower');
  }

  const quadScore      = priorityWeight(priorities['Quads']);
  const hamScore       = priorityWeight(priorities['Hamstrings']);
  const gluteScore     = priorityWeight(priorities['Glutes']);
  const posteriorScore = hamScore + gluteScore;

  switch (lowerDays) {
    case 0: return [];
    case 1: return ['Lower'];
    case 2:
      return quadScore >= posteriorScore
        ? ['LowerQuadFocus', 'LowerPosteriorChain']
        : ['LowerPosteriorChain', 'LowerQuadFocus'];
    case 3:
      return ['LowerQuadFocus', 'LowerPosteriorChain', 'LowerGluteQuad'];
    default: {
      const cycle: SessionType[] = ['LowerQuadFocus', 'LowerPosteriorChain', 'LowerGluteQuad', 'Lower'];
      return Array.from({ length: lowerDays }, (_, i) => cycle[i % cycle.length]);
    }
  }
}

// ─── Recovery-aware interleaving ─────────────────────────────────────────────
// Alternates upper and lower as evenly as possible so the same region never
// trains on back-to-back days when the other region still has work remaining.
// When one side has more days, its extra sessions are distributed around the
// other side's sessions (e.g., 3L + 2U → L U L U L, not L L U U L).
function orderDaysForRecovery(
  upperTypes: SessionType[],
  lowerTypes: SessionType[],
): SessionType[] {
  const result: SessionType[] = [];
  let ui = 0;
  let li = 0;
  const total = upperTypes.length + lowerTypes.length;
  const upperFirst = upperTypes.length >= lowerTypes.length;

  for (let i = 0; i < total; i++) {
    const upperLeft = upperTypes.length - ui;
    const lowerLeft = lowerTypes.length - li;

    let pickUpper: boolean;

    if (ui >= upperTypes.length) {
      pickUpper = false;
    } else if (li >= lowerTypes.length) {
      pickUpper = true;
    } else if (result.length === 0) {
      // First day: open with whichever region has more sessions so that the
      // "extra" day of the larger region falls at the END of the week rather
      // than back-to-back in the middle. This produces strict alternation for
      // the 3+2 case: L-U-L-U-L rather than U-L-U-L-L.
      pickUpper = upperFirst;
    } else {
      const prevIsUpper = !LOWER_SESSION_TYPES.includes(result[result.length - 1]);

      if (prevIsUpper && lowerLeft > 0) {
        // Just did upper — switch to lower
        pickUpper = false;
      } else if (!prevIsUpper && upperLeft > 0) {
        // Just did lower — switch to upper
        pickUpper = true;
      } else {
        // Both equally due — pick the region with more remaining sessions
        pickUpper = upperLeft > lowerLeft || (upperLeft === lowerLeft && upperFirst);
      }
    }

    result.push(pickUpper ? upperTypes[ui++] : lowerTypes[li++]);
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function deriveSplit(
  daysPerWeek: number,
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
): {
  sessionSequence: SessionType[];
  splitType: string;
  derivation: SplitDerivation;
} {
  const upperScore = scoreRegion(UPPER_MUSCLES, musclePriorities);
  const lowerScore = scoreRegion(LOWER_MUSCLES, musclePriorities);
  const pushScore  = scoreRegion(PUSH_MUSCLES,  musclePriorities);
  const pullScore  = scoreRegion(PULL_MUSCLES,  musclePriorities);

  const { upperDays, lowerDays } = allocateRegionDays(upperScore, lowerScore, daysPerWeek);

  const upperTypes = selectUpperDayTypes(upperDays, pushScore, pullScore);
  const lowerTypes = selectLowerDayTypes(lowerDays, musclePriorities);

  const sessionSequence = orderDaysForRecovery(upperTypes, lowerTypes);
  const splitType = sessionSequence.map((t) => SESSION_TYPE_SLUG[t]).join('-');

  return {
    sessionSequence,
    splitType,
    derivation: {
      upperScore, lowerScore,
      upperDays, lowerDays,
      pushScore, pullScore,
      upperTypes, lowerTypes,
    },
  };
}
