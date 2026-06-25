import { SESSION_MUSCLES } from './assignment';
import { PRIMARY_ROLE_OVERLAP } from '../data/roleOverlap';
import { SLOT_ROLE_CONFIGS } from '../data/slotRoleConfig';
import type {
  AdjustedVolumeTarget,
  ExperienceLevel,
  MuscleGroup,
  MusclePriority,
  ProgramFocus,
  SessionType,
} from '../types/program';

// ─── Target effective sets per focus × priority ───────────────────────────────
const TARGET_EFFECTIVE_SETS: Record<ProgramFocus, Record<MusclePriority | 'mev', number>> = {
  hypertrophy:   { emphasize: 18, grow: 12, maintain: 6,  mev: 4 },
  strength:      { emphasize: 12, grow: 8,  maintain: 5,  mev: 3 },
  powerbuilding: { emphasize: 15, grow: 10, maintain: 6,  mev: 4 },
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
function estimateWeeklyIndirectSets(
  muscle: MuscleGroup,
  weekSessions: SessionType[],
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>,
): number {
  let total = 0;
  for (const sessionType of weekSessions) {
    const sessionMuscles = SESSION_MUSCLES[sessionType];
    for (const activeMuscle of sessionMuscles) {
      if (activeMuscle === muscle) continue;
      const coeff = PRIMARY_ROLE_OVERLAP[activeMuscle]?.[muscle] ?? 0;
      if (coeff === 0) continue;
      const priority: MusclePriority | 'mev' = musclePriorities[activeMuscle] ?? 'mev';
      const estimatedSets = SLOT_ROLE_CONFIGS.Primary[priority].sets;
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

    const baseTarget = TARGET_EFFECTIVE_SETS[focus][priority];
    const emphasisScale = priority === 'emphasize'
      ? emphasisScaleFactor(muscle, musclePriorities)
      : 1.0;
    const targetEffectiveSets = Math.round(baseTarget * emphasisScale * beginnerScale);

    const estimatedIndirectSets = parseFloat(
      estimateWeeklyIndirectSets(muscle, weekSessions, musclePriorities).toFixed(1),
    );
    const directSetsNeeded = Math.max(
      MEV_DIRECT[focus],
      Math.round(targetEffectiveSets - estimatedIndirectSets),
    );

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
