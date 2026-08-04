import type { ExerciseDefinition, MovementPattern, ProgressionCategory } from '../types/program';

// ─── Exercise Progression Profile ──────────────────────────────────────────
//
// Per-category metadata that drives progressionEngine.ts's load-increment
// sizing, volume-transition rep compensation, RIR/failure floors, and
// deload/plateau behavior. This is rules-engine-local metadata — like
// exerciseType/sfrTier/progressionSuitability on ExerciseDefinition, it is
// NOT synced to Supabase (see AGENTS.md "Legitimate uses of
// getExerciseByName()" — structural rules-engine metadata, not user-facing
// catalog data).
//
// Follows the same pattern as slotRoleConfig.ts: a doctrine-cited config
// table keyed by category, plus a selector function — not per-exercise
// hand-tagging across all 100 exerciseDatabase.ts rows.

export type StimulusType = 'primary' | 'secondary' | 'accessory';
export type ProgressionModel = 'linear' | 'double_progression' | 'rep_progression' | 'load_progression';
export type LoadIncrementStrategy = 'percentage_based' | 'fixed_increment' | 'equipment_limited' | 'none';
export type FailurePolicy = 'allowed' | 'limited' | 'avoid';

export interface FatigueRating {
  localFatigue: 1 | 2 | 3 | 4 | 5;
  systemicFatigue: 1 | 2 | 3 | 4 | 5;
  jointStress: 1 | 2 | 3 | 4 | 5;
}

export interface ExerciseProgressionProfile {
  category: ProgressionCategory;
  // Documentation-only default — SlotRole (assigned per-slot at runtime,
  // already threaded through SlotPrescription.role) remains the
  // authoritative "how is this exercise being used right now" signal.
  // Never branch engine logic on this field; it would create two competing
  // sources of truth for the same concept.
  stimulusType: StimulusType;
  fatigueRating: FatigueRating;
  progressionModel: ProgressionModel;
  loadIncrementStrategy: LoadIncrementStrategy;
  // percentage_based only.
  targetIncrementPct?: number;
  // equipment_limited only — above this fraction of current weight, the
  // engine holds load and extends reps instead of taking the jump.
  maxAcceptableEquipmentLimitedPct?: number;
  setAdditionRepPenaltyPct: { min: number; max: number };
  maxEffectiveSetsPerSession: number;
  failurePolicy: FailurePolicy;
  // category default for 'bodyweight' — see ExerciseDefinition.bodyweightRepCeiling
  // for the per-exercise override.
  bodyweightRepCeiling?: number;
}

// ─── HV-030: Category profile table ────────────────────────────────────────
//
// targetIncrementPct is set to the LOW end of each cited range (2.5% / 3% /
// 1%-equivalent via the equipment_limited gate) rather than the midpoint —
// conservative-by-default minimizes disruptive jumps, consistent with
// Nuckols-style general strength-progression guidance that per-session load
// jumps should be the smallest increment that still represents genuine
// progress. setAdditionRepPenaltyPct and the percentage ranges themselves
// are the user's own doctrine spec (2026-08-04, explicit override of
// ST-010 — see progressionEngine.ts's ST-011 comment for the supersession).
// maxEffectiveSetsPerSession: Dr. Mike Israetel / RP Hypertrophy "Sets Per
// Session" guidance — single-exercise stimulus diminishes past ~4-6 sets.
// failurePolicy floors: RP Strength "Hypertrophy Made Simple" RIR-taper
// guidance + NSCA technical-breakdown-risk-near-failure for loaded
// compounds — same citation lineage as HV-001/HV-027's taper.
export const PROGRESSION_CATEGORY_PROFILES: Record<ProgressionCategory, ExerciseProgressionProfile> = {
  heavy_compound: {
    category: 'heavy_compound',
    stimulusType: 'primary',
    fatigueRating: { localFatigue: 3, systemicFatigue: 5, jointStress: 4 },
    progressionModel: 'load_progression',
    loadIncrementStrategy: 'percentage_based',
    targetIncrementPct: 0.025,
    setAdditionRepPenaltyPct: { min: 0.05, max: 0.10 },
    maxEffectiveSetsPerSession: 5,
    failurePolicy: 'avoid',
  },
  hypertrophy_compound: {
    category: 'hypertrophy_compound',
    stimulusType: 'primary',
    fatigueRating: { localFatigue: 3, systemicFatigue: 3, jointStress: 2 },
    progressionModel: 'double_progression',
    loadIncrementStrategy: 'percentage_based',
    targetIncrementPct: 0.03,
    setAdditionRepPenaltyPct: { min: 0.10, max: 0.15 },
    maxEffectiveSetsPerSession: 4,
    failurePolicy: 'limited',
  },
  machine_compound: {
    category: 'machine_compound',
    stimulusType: 'secondary',
    fatigueRating: { localFatigue: 2, systemicFatigue: 2, jointStress: 1 },
    progressionModel: 'double_progression',
    loadIncrementStrategy: 'fixed_increment',
    setAdditionRepPenaltyPct: { min: 0.05, max: 0.10 },
    maxEffectiveSetsPerSession: 4,
    failurePolicy: 'allowed',
  },
  isolation: {
    category: 'isolation',
    stimulusType: 'accessory',
    fatigueRating: { localFatigue: 2, systemicFatigue: 1, jointStress: 1 },
    progressionModel: 'rep_progression',
    loadIncrementStrategy: 'equipment_limited',
    maxAcceptableEquipmentLimitedPct: 0.10,
    setAdditionRepPenaltyPct: { min: 0.05, max: 0.10 },
    maxEffectiveSetsPerSession: 4,
    failurePolicy: 'allowed',
  },
  cable_accessory: {
    category: 'cable_accessory',
    stimulusType: 'accessory',
    fatigueRating: { localFatigue: 1, systemicFatigue: 1, jointStress: 1 },
    progressionModel: 'rep_progression',
    loadIncrementStrategy: 'equipment_limited',
    maxAcceptableEquipmentLimitedPct: 0.10,
    setAdditionRepPenaltyPct: { min: 0.05, max: 0.10 },
    maxEffectiveSetsPerSession: 4,
    failurePolicy: 'allowed',
  },
  bodyweight: {
    category: 'bodyweight',
    stimulusType: 'primary',
    fatigueRating: { localFatigue: 3, systemicFatigue: 2, jointStress: 2 },
    progressionModel: 'rep_progression',
    loadIncrementStrategy: 'none',
    setAdditionRepPenaltyPct: { min: 0.05, max: 0.10 },
    maxEffectiveSetsPerSession: 4,
    failurePolicy: 'limited',
    bodyweightRepCeiling: 30,
  },
};

// ─── HV-029: Category derivation heuristic ─────────────────────────────────
//
// exerciseType alone is not a reliable compound/isolation signal — several
// single-joint movements are historically tagged 'barbell-compound'/
// 'machine-compound' in exerciseDatabase.ts (Barbell Curl, EZ-Bar Curl,
// Skull Crusher, Preacher Curl, Cable Overhead Tricep Extension) because
// exerciseType only ever distinguished equipment + rough movement class, not
// joint count. movementPattern is ground truth for "is this single-joint,"
// so it's checked first for exercises exerciseType would otherwise
// misclassify as compound.
const SINGLE_JOINT_PATTERNS = new Set<MovementPattern>([
  'curl',
  'tricep-extension',
  'lateral-raise',
  'rear-delt',
  'calf-raise',
  'knee-extension',
  'knee-flexion',
]);

// Barbell movement patterns trained near-maximal (1-6 rep strength zone) per
// Prilepin's Chart / RP Strength "Strength Training Made Simple" — matches
// the same movement-pattern set already implicitly treated as the "big
// lifts" by ST-001's Primary-slot doctrine.
const NEAR_MAXIMAL_BARBELL_PATTERNS = new Set<MovementPattern>([
  'squat',
  'horizontal-push',
  'incline-push',
  'vertical-push',
]);

export function deriveProgressionCategory(def: ExerciseDefinition): ProgressionCategory {
  if (def.progressionCategory) return def.progressionCategory;

  if (def.equipment === 'Bodyweight' || def.exerciseType === 'bodyweight-compound') return 'bodyweight';

  if (SINGLE_JOINT_PATTERNS.has(def.movementPattern)) {
    return def.equipment === 'Cable' ? 'cable_accessory' : 'isolation';
  }

  if (def.exerciseType === 'isolation' || def.exerciseType === 'core') {
    return def.equipment === 'Cable' ? 'cable_accessory' : 'isolation';
  }
  if (def.exerciseType === 'machine-compound') return 'machine_compound';
  if (def.exerciseType === 'dumbbell-compound') return 'hypertrophy_compound';

  if (def.exerciseType === 'barbell-compound') {
    if (NEAR_MAXIMAL_BARBELL_PATTERNS.has(def.movementPattern)) return 'heavy_compound';
    if (def.movementPattern === 'hinge') {
      // Only the true Deadlift is programmed near-maximal (1-3 reps).
      // RDL/Stiff-Leg Deadlift/Good Morning/Barbell Shrug share the 'hinge'
      // pattern but are difficulty: 'intermediate'/'beginner' and are
      // programmed as posterior-chain hypertrophy-accumulation work, never
      // near-maximal, per RP Hypertrophy / Nuckols row-and-hinge
      // accessory-programming norms.
      return def.difficulty === 'advanced' ? 'heavy_compound' : 'hypertrophy_compound';
    }
    // horizontal-pull (Barbell Row, T-Bar Row), hip-extension (Hip Thrust):
    // barbell-loaded but volume/hypertrophy-accumulation compounds, not
    // max-strength lifts.
    return 'hypertrophy_compound';
  }

  return 'isolation';
}

export function getProgressionProfile(def: ExerciseDefinition | undefined): ExerciseProgressionProfile {
  const category = def ? deriveProgressionCategory(def) : 'heavy_compound';
  const profile = PROGRESSION_CATEGORY_PROFILES[category];
  if (category === 'bodyweight' && def?.bodyweightRepCeiling !== undefined) {
    return { ...profile, bodyweightRepCeiling: def.bodyweightRepCeiling };
  }
  return profile;
}
