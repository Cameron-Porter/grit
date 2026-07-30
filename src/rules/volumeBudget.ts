import { SESSION_MUSCLES } from './assignment';
import { PRIMARY_ROLE_OVERLAP } from '../data/roleOverlap';
import { getSlotRoleConfigs } from '../data/slotRoleConfig';
import { getLandmark } from '../utils/volumeLandmarks';
import type {
  AdjustedVolumeTarget,
  ExperienceLevel,
  MuscleGroup,
  MusclePriority,
  ProgramFocus,
  SessionType,
} from '../types/program';

// ─── Target effective sets per focus × priority ───────────────────────────────
//
// ST-006: Strength weekly volume — lower than hypertrophy because each set
// carries far higher CNS cost at 85-95% 1RM. Prilepin's optimal ~10 total reps
// per session × 2 sessions/week ÷ 2-5 reps/set ≈ 10-12 direct sets/week for
// emphasized muscles. Source: Prilepin's Chart.
//
// PB-005: Powerbuilding weekly volume — between strength (12/8) and hypertrophy
// (18/12), reflecting the concurrent adaptation goal. Kizen's 16-week program
// runs 3-6 compound sets + 6-12 accessory sets per session across 6 days;
// direct weekly sets per muscle land in the 10-15 range for emphasized muscles.
// Source: Kizen 16-Week Powerbuilding; PHAT program volume audit.
const TARGET_EFFECTIVE_SETS: Record<ProgramFocus, Record<MusclePriority | 'mev', number>> = {
  hypertrophy:   { emphasize: 18, grow: 12, maintain: 6,  mev: 4 },
  strength:      { emphasize: 12, grow: 8,  maintain: 5,  mev: 3 },  // ST-006
  powerbuilding: { emphasize: 15, grow: 10, maintain: 6,  mev: 4 },  // PB-005
  general:       { emphasize: 12, grow: 9,  maintain: 6,  mev: 4 },
  maintenance:   { emphasize: 8,  grow: 7,  maintain: 6,  mev: 4 },
  // RC-005: cut phase uses lower volume to match the 90-min session cap.
  // Target is ~70% of maintenance — enough stimulus to retain muscle under deficit.
  cut:           { emphasize: 6,  grow: 5,  maintain: 4,  mev: 3 },
};

const MEV_DIRECT: Record<ProgramFocus, number> = {
  hypertrophy:   3,
  strength:      2,
  powerbuilding: 2,
  general:       3,
  maintenance:   2,
  cut:           2,
};

// ─── Synergistic scaling ──────────────────────────────────────────────────────
const SYNERGISTIC_GROUPS: readonly MuscleGroup[][] = [
  ['Chest', 'Shoulders', 'Triceps'],
  ['Back', 'Biceps', 'Traps', 'Forearms'],
  ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'],
] as const;

function emphasisScaleFactor(
  muscle: MuscleGroup,
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
): number {
  const group = SYNERGISTIC_GROUPS.find((g) => g.includes(muscle));
  if (!group) return 1.0;
  const coEmphasized = group.filter((m) => musclePriorities[m] === 'emphasize').length;
  if (coEmphasized <= 1) return 1.0;
  if (coEmphasized === 2) return 0.90;
  if (coEmphasized === 3) return 0.82;
  return 0.75;
}

// ─── Indirect set estimator ───────────────────────────────────────────────────
// Reads Primary-slot sets from the focus-appropriate table (getSlotRoleConfigs)
// rather than always the hypertrophy table — previously this silently borrowed
// hypertrophy's Primary numbers for strength/powerbuilding indirect estimates.
function estimateWeeklyIndirectSets(
  muscle: MuscleGroup,
  weekSessions: SessionType[],
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
  focus: ProgramFocus,
): number {
  const slotRoleConfigs = getSlotRoleConfigs(focus);
  let total = 0;
  for (const sessionType of weekSessions) {
    const sessionMuscles = SESSION_MUSCLES[sessionType];
    for (const activeMuscle of sessionMuscles) {
      if (activeMuscle === muscle) continue;
      const coeff = PRIMARY_ROLE_OVERLAP[activeMuscle]?.[muscle] ?? 0;
      if (coeff === 0) continue;
      const priority: MusclePriority | 'mev' = musclePriorities[activeMuscle] ?? 'mev';
      const estimatedSets = slotRoleConfigs.Primary[priority].sets;
      total += estimatedSets * coeff;
    }
  }
  return total;
}

// ─── Frequency helper ────────────────────────────────────────────────────────
function sessionFrequency(directSetsNeeded: number, priority: MusclePriority | 'mev'): number {
  const base = directSetsNeeded <= 4 ? 1 : directSetsNeeded <= 11 ? 2 : 3;
  return priority === 'emphasize' ? Math.max(2, base) : base;
}

// VA-011: hypertrophy-focus targets read straight from each muscle's own
// MV/MEV/MAV/MRV landmarks (RP Strength / Israetel et al., volumeLandmarks.ts)
// instead of one flat number shared by every muscle. Mapping mirrors the
// priority tier names directly onto the matching landmark:
//   mev       → that muscle's own MEV (deprioritized — just enough for growth)
//   maintain  → that muscle's own MV (literally "maintain" = hold current size)
//   grow      → that muscle's own MAV (the textbook sweet spot)
//   emphasize → that muscle's own MRV (the overreach ceiling for this cycle's focus)
// Scoped to hypertrophy only — strength/powerbuilding volume is already cited
// to Prilepin/NSCA (ST-XXX) and Kizen/PHAT (PB-XXX); swapping in RP/Israetel
// landmarks there would contradict those tags rather than extend them. Falls
// back to the flat TARGET_EFFECTIVE_SETS table if a muscle has no landmark.
function hypertrophyPriorityTarget(muscle: MuscleGroup, priority: MusclePriority | 'mev'): number {
  const landmark = getLandmark(muscle);
  if (!landmark) return TARGET_EFFECTIVE_SETS.hypertrophy[priority];
  if (priority === 'mev') return landmark.mev;
  if (priority === 'maintain') return landmark.mv;
  if (priority === 'grow') return landmark.mav;
  return landmark.mrv; // emphasize
}

// ─── Public API ──────────────────────────────────────────────────────────────
// VA-009: beginners receive 0.8× volume across all muscles.
export function calculateVolumeBudget(
  focus: ProgramFocus,
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
  allMuscles: MuscleGroup[],
  weekSessions: SessionType[],
  experienceLevel: ExperienceLevel = 'intermediate',
): AdjustedVolumeTarget[] {
  const beginnerScale = experienceLevel === 'beginner' ? 0.8 : 1.0;

  return allMuscles.map((muscle) => {
    const priority: MusclePriority | 'mev' = musclePriorities[muscle] ?? 'mev';

    const baseTarget = focus === 'hypertrophy'
      ? hypertrophyPriorityTarget(muscle, priority)
      : TARGET_EFFECTIVE_SETS[focus][priority];
    const emphasisScale = priority === 'emphasize'
      ? emphasisScaleFactor(muscle, musclePriorities)
      : 1.0;
    const targetEffectiveSets = Math.round(baseTarget * emphasisScale * beginnerScale);

    const estimatedIndirectSets = parseFloat(
      estimateWeeklyIndirectSets(muscle, weekSessions, musclePriorities, focus).toFixed(1),
    );
    const uncappedDirectSetsNeeded = Math.max(
      MEV_DIRECT[focus],
      Math.round(targetEffectiveSets - estimatedIndirectSets),
    );

    // VA-010: cap weekly direct sets at the muscle's MRV (Maximum Recoverable
    // Volume) — RP Strength / Israetel et al. landmarks in volumeLandmarks.ts.
    // Since VA-011, hypertrophy's own targets already top out at each muscle's
    // MRV by construction (emphasize === landmark.mrv), so this is a no-op
    // backstop there — kept for safety against future data changes, and still
    // fully load-bearing for strength/powerbuilding/general/maintenance/cut,
    // which stay on the flat TARGET_EFFECTIVE_SETS table.
    const mrv = getLandmark(muscle)?.mrv;
    const directSetsNeeded = mrv != null ? Math.min(uncappedDirectSetsNeeded, mrv) : uncappedDirectSetsNeeded;

    const freq = sessionFrequency(directSetsNeeded, priority);
    const setsPerSession = Math.round(directSetsNeeded / freq);
    const mevSetsPerSession = Math.max(1, Math.round(MEV_DIRECT[focus] / freq));

    return {
      muscle,
      priority,
      weeklySets: directSetsNeeded,
      sessionFrequency: freq,
      setsPerSession,
      targetEffectiveSets,
      estimatedIndirectSets,
      directSetsNeeded,
      mevSetsPerSession,
    };
  });
}

// VA-012: recommended weekly training-frequency range by training age.
// Beginners overestimate recoverable frequency before habit/technique are
// solid; advanced lifters need more frequent stimulus to keep driving
// adaptation. This is advisory (see validation.ts's 'frequency' warning) —
// daysPerWeek is still whatever the user picks, never hard-blocked.
// Source: Dr. Mike Israetel / RP Hypertrophy — training frequency by
// experience level.
export function recommendedDaysPerWeekRange(level: ExperienceLevel): { min: number; max: number } {
  switch (level) {
    case 'beginner':     return { min: 2, max: 3 };
    case 'advanced':     return { min: 4, max: 6 };
    case 'intermediate':
    default:             return { min: 3, max: 5 };
  }
}
