import type { ExerciseDefinition, ExperienceLevel, MuscleGroup, SlotRole } from '../types/program';
import { EXERCISE_DATABASE, getExerciseByName } from '../data/exerciseDatabase';

// ─── Context ──────────────────────────────────────────────────────────────────

export interface PickerContext {
  muscle: MuscleGroup;
  role: SlotRole;
  experienceLevel: ExperienceLevel;
  preferredEquipment: string[];
  // When provided, exercises with equipment outside this list are filtered out.
  // Falls back to showing all if filtering removes all candidates.
  availableEquipment?: string[];
  // Exercise names already chosen in other slots of the same session.
  // Used to penalise redundancy.
  alreadySelectedInSession?: string[];
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface RankedExercise {
  exercise: ExerciseDefinition;
  score: number;
  isPreferred: boolean;
  isAvailable: boolean;
  isVarietyConflict: boolean;
}

// ─── Scoring weights ──────────────────────────────────────────────────────────
//
// Total max score ≈ 100 (40 SFR + 30 equip + 20 exp + 10 progression)
// Variety penalty can push score negative — exercises are still shown, just ranked lower.
//
// SFR tier:     tier1=40, tier2=30, tier3=15, tier4=5
// Equipment:    preferred=30, available=15, unavailable=0
// Experience:   beginner=15 (always safe), intermediate/advanced=20 (match), 5 (mismatch)
// Progression:  high=10, medium=5, low=0
// Variety:      same varietyGroup=-25, same pattern+equip=-15

const SFR_SCORES: Record<string, number> = { tier1: 40, tier2: 30, tier3: 15, tier4: 5 };
const PROGRESSION_SCORES: Record<string, number> = { high: 10, medium: 5, low: 0 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function equipIsPreferred(exercise: ExerciseDefinition, preferred: string[]): boolean {
  if (exercise.equipment === 'Bodyweight') return true;
  return preferred.some((p) => p.toLowerCase() === exercise.equipment.toLowerCase());
}

function equipIsAvailable(exercise: ExerciseDefinition, available?: string[]): boolean {
  if (!available) return true;
  if (exercise.equipment === 'Bodyweight') return true;
  return available.some((a) => a.toLowerCase() === exercise.equipment.toLowerCase());
}

function scoreEquipment(exercise: ExerciseDefinition, ctx: PickerContext): number {
  if (equipIsPreferred(exercise, ctx.preferredEquipment)) return 30;
  if (equipIsAvailable(exercise, ctx.availableEquipment)) return 15;
  return 0;
}

function scoreExperience(exercise: ExerciseDefinition, level: ExperienceLevel): number {
  const d = exercise.difficulty;
  if (d === 'beginner') return 15;
  if (d === 'intermediate') return level === 'beginner' ? 5 : 20;
  return level === 'advanced' ? 20 : 5;
}

function computeVarietyPenalty(
  exercise: ExerciseDefinition,
  alreadySelected: ExerciseDefinition[],
): number {
  let penalty = 0;
  for (const sel of alreadySelected) {
    if (exercise.id === sel.id) continue;
    if (
      exercise.varietyGroup &&
      sel.varietyGroup &&
      exercise.varietyGroup === sel.varietyGroup
    ) {
      penalty = Math.max(penalty, 25);
    } else if (
      exercise.movementPattern === sel.movementPattern &&
      exercise.equipment === sel.equipment
    ) {
      penalty = Math.max(penalty, 15);
    }
  }
  return penalty;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Returns exercises for the given slot context, sorted by score (highest first).
// Exercises with unavailable equipment are filtered out when availableEquipment
// is provided, but if that would leave zero results, all candidates are kept.
export function getRecommendedExercises(ctx: PickerContext): RankedExercise[] {
  const candidates = EXERCISE_DATABASE.filter((ex) =>
    ex.primaryMuscles.includes(ctx.muscle),
  );

  let pool = candidates;
  if (ctx.availableEquipment) {
    const strict = candidates.filter((ex) => equipIsAvailable(ex, ctx.availableEquipment));
    if (strict.length > 0) pool = strict;
  }

  const selectedDefs = (ctx.alreadySelectedInSession ?? [])
    .map((name) => getExerciseByName(name))
    .filter((ex): ex is ExerciseDefinition => ex !== undefined);

  return pool
    .map((exercise) => {
      const sfr = SFR_SCORES[exercise.sfrTier] ?? 15;
      const equip = scoreEquipment(exercise, ctx);
      const experience = scoreExperience(exercise, ctx.experienceLevel);
      const progression = PROGRESSION_SCORES[exercise.progressionSuitability] ?? 5;
      const variety = computeVarietyPenalty(exercise, selectedDefs);
      const score = sfr + equip + experience + progression - variety;

      return {
        exercise,
        score,
        isPreferred: equipIsPreferred(exercise, ctx.preferredEquipment),
        isAvailable: equipIsAvailable(exercise, ctx.availableEquipment),
        isVarietyConflict: variety > 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
}
