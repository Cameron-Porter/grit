// ─── Core domain types ────────────────────────────────────────────────────────

export type ProgramFocus =
  | 'hypertrophy'
  | 'strength'
  | 'powerbuilding'
  | 'general'
  | 'maintenance'
  | 'cut';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingPhase = 'bulk' | 'cut' | 'maintenance';

export type MusclePriority = 'emphasize' | 'grow' | 'maintain';

// Role of a slot within a session.
// Primary   = main compound movement for this muscle (highest intensity).
// Secondary = volume variation for this muscle (moderate intensity).
// Accessory = isolation/detail work or supporting muscle in this session.
export type SlotRole = 'Primary' | 'Secondary' | 'Accessory';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Abs'
  | 'Traps';

export type ExerciseType =
  | 'barbell-compound'
  | 'dumbbell-compound'
  | 'machine-compound'
  | 'bodyweight-compound'
  | 'isolation'
  | 'core';

// SFR tier: stimulus-to-fatigue quality ranking per doctrine.
// tier1 = best SFR for this movement (first recommendation)
// tier2 = solid SFR, good alternative
// tier3 = acceptable, higher fatigue or lower stimulus
// tier4 = situational (constraint-driven selection only)
export type SfrTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

// How easily progressive overload can be applied over time.
export type ProgressionSuitability = 'high' | 'medium' | 'low';

export type MovementPattern =
  | 'horizontal-push'
  | 'incline-push'
  | 'vertical-push'
  | 'horizontal-pull'
  | 'vertical-pull'
  | 'squat'
  | 'hinge'
  | 'hip-extension'
  | 'knee-flexion'
  | 'knee-extension'
  | 'lateral-raise'
  | 'rear-delt'
  | 'curl'
  | 'tricep-extension'
  | 'calf-raise'
  | 'core';

export type SplitType =
  | 'full-body'
  | 'upper-lower-full'
  | 'upper-lower'
  | 'upper-lower-ppl'
  | 'ppl-x2';

export type SessionType =
  // Original types — kept for backward compat and as valid outputs
  | 'FullBody'
  | 'Upper'
  | 'Lower'
  | 'Push'
  | 'Pull'
  | 'Legs'
  // Lower-focused specializations — generated when lower muscles are emphasized
  | 'LowerQuadFocus'        // quads first, posterior chain secondary
  | 'LowerPosteriorChain'   // hinge/hip-thrust first, quads secondary
  | 'LowerGluteQuad';       // glutes primary, quads co-primary

// Derivation metadata returned alongside the session sequence.
export interface SplitDerivation {
  upperScore: number;
  lowerScore: number;
  upperDays: number;
  lowerDays: number;
  pushScore: number;
  pullScore: number;
  upperTypes: SessionType[];
  lowerTypes: SessionType[];
}

// ─── Exercise library types ───────────────────────────────────────────────────

export interface ExerciseDefinition {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  fatigueCost: 1 | 2 | 3;
  exerciseType: ExerciseType;
  sfrTier: SfrTier;
  progressionSuitability: ProgressionSuitability;
  // Exercises sharing a varietyGroup are mechanically redundant substitutes.
  // Selecting one will demote others in the recommendation ranking.
  varietyGroup?: string;
  // HV-019: minimum RIR permitted for this exercise regardless of prescription.
  hardRirFloor?: number;
  // HV-013/HV-020: rule-engine tags for intra-session compatibility checks.
  exerciseTags?: string[];
}

// ─── Slot template — defines what type of exercise belongs in each slot ───────

export interface SlotTemplate {
  slotKey: string;
  muscle: MuscleGroup;
  name: string;
  movementPattern: MovementPattern;
  exerciseType: ExerciseType;
  priority: 1 | 2 | 3;
  minSetsForInclusion: number;
  defaultSets: number;
  approvedExercises: string[];
  // Subset shown when experienceLevel === 'beginner'.
  // If omitted, all approvedExercises are considered beginner-suitable.
  beginnerExercises?: string[];
}

// ─── Generated slot — one slot within a training day ─────────────────────────

export interface ExerciseSlot {
  id: string;                          // e.g. 'Chest-Primary-0'
  muscle: MuscleGroup;
  role: SlotRole;
  priority: MusclePriority | 'mev';
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  sortOrder: number;
  selectedExercise?: string;
}

// ─── Volume targets ───────────────────────────────────────────────────────────

export interface WeeklyVolumeTarget {
  muscle: MuscleGroup;
  priority: MusclePriority | 'mev';
  weeklySets: number;
  sessionFrequency: number;
  setsPerSession: number;
}

export interface AdjustedVolumeTarget extends WeeklyVolumeTarget {
  targetEffectiveSets: number;
  estimatedIndirectSets: number;
  directSetsNeeded: number;
  // MEV floor per session — used as the Week 1 set count for progressive loading.
  mevSetsPerSession: number;
}

// ─── Week-level progression params ────────────────────────────────────────────
// Passed to buildDaySlots to apply RIR and set-count scaling across the meso.
//
// Doctrine:
//   Training weeks: sets scale 70 % → 100 % (MEV → peak); RIR decrements 1/week.
//   Deload week:    sets = 50 % of peak; RIR = 4 for all slots.

export interface WeekParams {
  weekNumber: number;         // 1-indexed position within the mesocycle
  totalTrainingWeeks: number; // total weeks excluding the deload week
  isDeload: boolean;
}

// ─── Program validation ───────────────────────────────────────────────────────

export interface ProgramValidationIssue {
  type: 'session_sets' | 'session_exercises' | 'weekly_volume' | 'ordering' | 'movement_balance' | 'proportionality' | 'back_plane' | 'muscle_coverage';
  severity: 'error' | 'warning';
  message: string;
  dayIndex?: number;
}

export interface ProgramValidationResult {
  valid: boolean;
  issues: ProgramValidationIssue[];
  weeklyEffectiveSets: Partial<Record<MuscleGroup, number>>;
}

// ─── Day / program structure ──────────────────────────────────────────────────

export interface DayPlan {
  dayIndex: number;
  weekNumber: number;
  isDeload: boolean;
  sessionType: SessionType;
  splitName: string;
  trainingDay: string;
  primaryMuscles: MuscleGroup[];
  slots: ExerciseSlot[];
  totalSets: number;
  estimatedMinutes: number;
}

// One week within the mesocycle, containing all training days for that week.
export interface WeekPlan {
  weekNumber: number;
  isDeload: boolean;
  days: DayPlan[];
}

export interface GeneratedProgram {
  focus: ProgramFocus;
  splitType: string;
  daysPerWeek: number;
  totalWeeks: number;
  volumeTargets: AdjustedVolumeTarget[];
  // Convenience alias for weeks[0].days — kept for backward compatibility.
  days: DayPlan[];
  // All weeks of the mesocycle in order. Last week is always the deload.
  weeks: WeekPlan[];
  validation: ProgramValidationResult;
  derivation: SplitDerivation;
}

// ─── Session template — canonical slot ordering per session type ──────────────

export interface SessionSlotSpec {
  muscle: MuscleGroup;
  role: SlotRole;
  sortOrder: number;
}

export interface SessionTemplate {
  sessionType: SessionType;
  slots: SessionSlotSpec[];
}

// ─── Input config ─────────────────────────────────────────────────────────────

export interface ProgramConfig {
  name: string;
  focus: ProgramFocus;
  experienceLevel: ExperienceLevel;
  trainingPhase?: TrainingPhase;
  daysPerWeek: number;
  selectedDays: string[];
  musclePriorities: Partial<Record<MuscleGroup, MusclePriority>>;
  totalWeeks: number;
}
