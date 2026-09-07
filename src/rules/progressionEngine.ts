import type { ExerciseType, ExperienceLevel, SlotRole } from '../types/program';
import type { ExerciseProgressionProfile } from '../data/exerciseProgressionProfiles';
import { PROGRESSION_CATEGORY_PROFILES } from '../data/exerciseProgressionProfiles';
import { rirForWeek } from './volumeRamp';
import { loadIncrementFor } from '../data/loadIncrements';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SlotPrescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  // Optional — used for micro-loading table and compound vs. isolation logic.
  // Defaults to 'Primary' / 'barbell-compound' when omitted (5 lb increment, conservative).
  role?: SlotRole;
  exerciseType?: ExerciseType;
  // HV-019: when set, nextRir will never go below this value regardless of taper.
  hardRirFloor?: number;
  // HV-028: from the Supabase-sourced ProgramExercise.equipment column (per
  // AGENTS.md — never the local exerciseDatabase.ts fixture). When
  // 'Bodyweight', every weight-adjustment branch below holds at the last
  // logged weight instead of adding/reducing/halving it — see HV-028's
  // doctrine comment further down for why.
  equipment?: string;
  // HV-029/HV-030: category-level Exercise Progression Profile, resolved by
  // the caller via getProgressionProfile(exerciseDef) in
  // src/data/exerciseProgressionProfiles.ts. Drives load-increment sizing
  // (ST-011), volume-transition rep compensation (HV-032), and RIR/failure
  // floors (HV-036). Defaults to the heavy_compound profile when omitted —
  // the closest analog to the old implicit 'barbell-compound' default —
  // so callers/tests that don't pass one keep prior behavior.
  profile?: ExerciseProgressionProfile;
}

// One completed session for a single exercise.
// Only working sets — warm-up sets must be excluded before passing to this engine.
// Sorted newest-first at call site.
export interface SessionPerformance {
  date: string;
  // HV-033: rir is optional user-reported actual RIR. Legacy sessions may
  // production caller — workout_sets.rir stores only the prescribed RIR
  // omit it; current sessions populate it through workout_sets.reported_rir.
  // Plateau comparison uses it only when every set in both sessions reports
  // RIR; partial effort data is not strong enough to classify a stall.
  sets: { weight: number; reps: number; rir?: number }[];
}

export type ProgramFocus = 'hypertrophy' | 'strength' | 'powerbuilding' | 'general' | 'maintenance' | 'cut';
export type MusclePriority = 'emphasize' | 'grow' | 'maintain';
// Single source of truth for this union — SorenessModal.tsx and src/api/
// progression.ts both import it from here rather than each keeping their own
// copy, to avoid string-literal drift.
export type SorenessLevel = 'Not sore' | 'Healed early' | 'Just in time' | 'Still sore';

export interface ProgressionContext {
  experienceLevel: ExperienceLevel;
  isDeload: boolean;
  mesoWeek: number;
  totalMesoWeeks: number;
  // NOTE: currently unused by recommendProgression — cut-phase behavior is
  // driven entirely by `programFocus === 'cut'` below (see isCut). No call
  // site (src/api/progression.ts, src/api/quickWorkout.ts) ever sets this
  // field today. Kept for a possible future "cut phase within a non-cut-focus
  // program" feature; flag to the user before repurposing or removing it.
  trainingPhase?: 'bulk' | 'cut' | 'maintenance';
  // Weeks elapsed since the last completed deload.
  // Used to gate "fatigue masking" vs "true plateau" disambiguation.
  weeksSinceLastDeload?: number;
  // Program-level goal — drives deload protocol, load increment, and maintenance behavior.
  programFocus?: ProgramFocus;
  // Per-muscle volume priority — drives RIR taper within the meso.
  musclePriority?: MusclePriority;
  // VA-013: soreness this muscle reported for the session just logged (the
  // one whose performance is in `sessions[0]`) — used to hold volume flat
  // rather than progress it into next week. See getMuscleSorenessForWorkout
  // in src/api/history.ts for where this is fetched from.
  soreness?: SorenessLevel;
  // VA-020: consecutive program-scoped exposures where this muscle was still
  // sore. Two signals trigger a recovery exposure rather than another ramp.
  consecutiveStillSoreCount?: number;
  // VA-020: first productive exposure after two recovery failures restarts
  // from MEV/MV rather than jumping back to the calendar ramp.
  restartAtVolumeAnchor?: boolean;
  // VA-018: when the caller (src/api/progression.ts's byMuscle loop) has
  // computed a fatigue-weighted redistribution of the VA-013 soreness trim
  // across this muscle's sibling exercises (redistributeSorenessTrim in
  // volumeBudget.ts), this is that exercise's specific trim amount — used
  // instead of the flat 1-set trim below. Only progression.ts's muscle-level
  // grouping can compute this; quickWorkout.ts has no sibling-exercise
  // visibility and always leaves it unset, falling back to the flat trim.
  sorenessTrimOverride?: number;
  // HV-021: pre-resolved landmark-driven weekly set target for this exercise's
  // muscle (RP Strength / Israetel et al. MV/MEV/MAV/MRV), computed by the
  // caller — see rampSets() in volumeRamp.ts and computeAndSaveProgressionTargets
  // in src/api/progression.ts, which aggregates across all of this muscle's
  // exercises before resolving each one's share. Present only for hypertrophy
  // focus where a landmark exists for the muscle; when set, it replaces the
  // flat per-priority set math below for both training weeks and deload, so
  // this file and the generation-time path (slotBuilder.ts) run the exact
  // same volume philosophy instead of two independent ones.
  hypertrophyVolumeOverride?: { trainingSets: number; deloadSets: number };
}

// ── Actions ──────────────────────────────────────────────────────────────────
//
// Each action maps to a specific doctrine state and drives a distinct UI message.
//
// FIRST_SESSION     — no history; show empty weight field with starting cues
// DELOAD            — scheduled deload week; reduce sets + RIR, hold load
// ADVANCE_LOAD      — rep ceiling hit cleanly → increase load next session
// HOLD              — rep progress is occurring or stable; stay at current load
// REDUCE_LOAD       — two consecutive sessions below rep floor → drop weight
// PLATEAU_DELOAD    — stall count exceeded threshold → deload before any load change
// DELOAD_NEEDED     — two consecutive bad sessions (reps regressed) → immediate deload
// CUT_HOLD          — maintenance focus: maintain current performance, no auto-increment
// CUT_PROGRESS      — RC-011: fat-loss phase, ceiling hit → reduced-speed load advance
// ADVANCE_DIFFICULTY — HV-037: bodyweight exercise hit its rep ceiling → advance via
//                       tempo/ROM/leverage/external load instead of more reps
// LENGTHENED_PARTIALS — RC-003: experienced accessory isolation hits the rep ceiling
//                       but load is equipment-limited → extend the final set in the
//                       lengthened position instead of chasing an oversized jump
export type ProgressionAction =
  | 'FIRST_SESSION'
  | 'DELOAD'
  | 'ADVANCE_LOAD'
  | 'HOLD'
  | 'REDUCE_LOAD'
  | 'PLATEAU_DELOAD'
  | 'DELOAD_NEEDED'
  | 'CUT_HOLD'
  | 'CUT_PROGRESS'
  | 'ADVANCE_DIFFICULTY'
  | 'LENGTHENED_PARTIALS';

export interface ProgressionRecommendation {
  nextWeight: number;
  nextSets: number;
  nextRepsMin: number;
  nextRepsMax: number;
  nextRir: number;
  action: ProgressionAction;
  reason: string;
  // Increment used to compute the load change (for display: "Add 5 lb").
  // ST-011: category- and weight-dependent — see getLoadIncrementAmount.
  loadIncrement: number;
  // True for PLATEAU_DELOAD, DELOAD_NEEDED, REDUCE_LOAD — prompts UI warning.
  isPlateauWarning: boolean;
}

// ─── ST-011: Load increment — percentage-based, equipment-gated ───────────────
// SUPERSEDED 2026-08-04 — see ST-011 below. Kept per this file's existing
// citation-history culture (comments get retracted, not silently deleted).
//
// ST-010 (original): Flat 5 lb increment, every role/experience/focus tier,
// no exceptions. A 2.5 lb micro-loading tier (and a finer 1.25 lb tier
// before it) existed here previously for isolation/accessory work and
// cut-phase halving. Both were removed per explicit user direction:
// fractional-plate increments (1.25 lb, 2.5 lb) aren't reliably available on
// gym equipment, so the extra granularity produced targets that couldn't
// actually be loaded. 5 lb was made a hard floor and ceiling for every case
// — this was a deliberate constraint, not a gap to fill back in with a new
// fractional tier.
//
// ST-011: that constraint is explicitly reversed per direct user instruction
// (2026-08-04). A flat 5 lb on a 20 lb Dumbbell Lateral Raise is a 25% jump
// — confirmed as a live, already-tested bug (the old
// src/api/__tests__/progression.test.ts "role-aware load increment" test
// asserted 20 -> 25 lb as *correct* behavior). Increment sizing now comes
// from the exercise's ExerciseProgressionProfile (HV-029/HV-030):
//   - percentage_based (heavy_compound, hypertrophy_compound): target % of
//     current weight, rounded to the nearest realistic increment for that
//     weight class.
//   - fixed_increment (machine_compound): flat 5 lb, unchanged — plate
//     stacks/pins genuinely are fixed-increment hardware.
//   - equipment_limited (isolation, cable_accessory): the smallest realistic
//     increment (2.5 lb under 100 lb), but GATED — only taken when it's
//     <= maxAcceptableEquipmentLimitedPct of current weight; otherwise load
//     holds and reps extend past the ceiling instead. This is what actually
//     prevents the 20 lb lateral raise from jumping to 25 lb (2.5/20 = 12.5%
//     > the 10% gate, so even the smaller 2.5 lb increment is held).
//   - bodyweight has no load axis — handled entirely by HV-037's rep-ceiling
//     ladder, never reaches this function.
// Percentage ranges (2.5-5% heavy/hypertrophy compound, 1-3% isolation) and
// the equipment-limited gate threshold are the user's own doctrine spec
// (2026-08-04); targetIncrementPct is pinned to the low end of each cited
// range to minimize disruptive jumps, consistent with Nuckols-style general
// strength-progression guidance that a load jump should be the smallest
// increment that still represents genuine progress.

// HV-041: hardware granularity is a property of the equipment, not of how
// heavy the weight happens to be. This used to return 2.5 below 100 lb and 5
// above, which prescribed loads that do not exist — most visibly a 77.5 lb
// dumbbell. See src/data/loadIncrements.ts for the per-equipment steps and
// their sourcing.
function roundToRealisticIncrement(equipment: string | null | undefined): number {
  return loadIncrementFor(equipment) || 5;
}

// ST-011: an equipment-limited exercise (isolation/cable_accessory) that's
// proportionally too light for its own smallest increment climbs reps past
// its prescribed ceiling for up to this many reps before the engine forces
// the jump anyway — otherwise a sufficiently light exercise could stall on
// the reps axis forever.
const EQUIPMENT_LIMITED_REP_BUFFER = 5;

// HV-042: default ceiling on how large a single load jump may be as a share
// of the current working weight, for categories that do not set their own.
const MAX_PROPORTIONAL_JUMP = 0.10;

interface LoadIncrementResult {
  amount: number;
  // True when loadIncrementStrategy is 'equipment_limited' and even the
  // smallest realistic increment exceeds maxAcceptableEquipmentLimitedPct of
  // current weight — caller must hold load and extend reps instead.
  equipmentLimited: boolean;
}

export function getLoadIncrementAmount(
  currentWeight: number,
  profile: ExerciseProgressionProfile,
  equipment?: string | null,
): LoadIncrementResult {
  const granularity = roundToRealisticIncrement(equipment);
  if (currentWeight <= 0) return { amount: granularity, equipmentLimited: false };

  if (profile.loadIncrementStrategy === 'fixed_increment') {
    // HV-042 applies here too: a 10 lb stack pin is a third of a 30 lb setting.
    return gateProportionalJump(granularity, currentWeight, profile);
  }
  if (profile.loadIncrementStrategy === 'percentage_based') {
    // Rounded to 4 decimals before roundToIncrement to correct binary
    // floating-point drift (e.g. 500 * 0.025 = 12.499999999999998, not
    // 12.5) that would otherwise push an exact tie-breaking case like
    // 12.5/5 = 2.5 to the wrong side of Math.round.
    const raw = Math.round(currentWeight * (profile.targetIncrementPct ?? 0.025) * 10000) / 10000;
    const amount = Math.max(granularity, roundToIncrement(raw, granularity));
    return gateProportionalJump(amount, currentWeight, profile);
  }
  // equipment_limited ('none' — bodyweight — never reaches this function).
  return gateProportionalJump(granularity, currentWeight, profile);
}

// ─── HV-042: no jump may be a large fraction of the current load ───────────
//
// The proportional gate used to apply only to the equipment_limited
// categories (isolation, cable_accessory). Every other category took the
// smallest hardware step regardless of how big that was relative to the
// weight on the bar — so a dumbbell press at 30 lb took the 5 lb dumbbell
// step, a 17% jump, every time the rep ceiling was hit.
//
// RP's own progression guidance is that load should climb slowly and that
// dumbbells specifically should not climb every week: "Maybe 5lb on the bar
// every week, maybe increasing dumbbell weights every 2 or 3 weeks"
// (rpstrength.com, "Progressing for Hypertrophy"), because volume - not load
// - is the primary hypertrophy driver. Holding load and letting reps
// accumulate until the same step is a smaller share of the total is exactly
// how that every-2-or-3-weeks cadence arises, so the gate now applies to
// every loadable category rather than two of them.
function gateProportionalJump(
  amount: number,
  currentWeight: number,
  profile: ExerciseProgressionProfile,
): LoadIncrementResult {
  const ceiling = profile.maxAcceptableEquipmentLimitedPct ?? MAX_PROPORTIONAL_JUMP;
  if (amount / currentWeight <= ceiling) return { amount, equipmentLimited: false };
  return { amount: 0, equipmentLimited: true };
}

// ─── Rounding helpers ─────────────────────────────────────────────────────────

// Round to the nearest valid increment. Stays general so callers can round
// to other steps (e.g. deload-week displayed weights) without a second
// helper.
export function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

// ─── HV-028: Bodyweight has no external load to adjust ────────────────────────
//
// Every branch below that changes `nextWeight` does so by adding, subtracting,
// or halving a fixed increment of the *previous logged weight*. That's a sound
// model when weight means "plates/pins on an implement" — it breaks down when
// weight means body weight, since a training decision can't add 5 lb to (or
// take 50% off) someone's actual mass. Deload halving, bad-session/plateau
// deload halving, REDUCE_LOAD, and ADVANCE_LOAD all hit this. For bodyweight
// equipment, weight holds at whatever was last logged in every one of those
// cases — the training decision still happens, just entirely on the reps
// axis (see advanceRepsForBodyweight below for the ADVANCE_LOAD case
// specifically). Source: standard bodyweight/calisthenics progression model —
// reps-first progression, with external load only entering via a genuinely
// weighted variation (weighted vest/belt), which isn't something this app
// can auto-detect from a rep-ceiling hit.
export function isUsableLoggedWeight(weight: number, equipment?: string | null): boolean {
  return weight > 0 || (weight === 0 && equipment === 'Bodyweight');
}

function heldOrAdjustedWeight(
  lastWeight: number,
  isBodyweight: boolean,
  adjust: (w: number) => number,
): number {
  return isBodyweight ? lastWeight : adjust(lastWeight);
}

// HV-035/ST-012: reductionPct is now caller-supplied — hypertrophy and
// strength deloads use different percentages (see the deload branches
// below) instead of a single baked-in flat 50%.
function deloadWeightFor(lastWeight: number, isBodyweight: boolean, reductionPct: number, equipment?: string | null): number {
  return heldOrAdjustedWeight(lastWeight, isBodyweight, (w) => {
    const g = roundToRealisticIncrement(equipment);
    return Math.max(roundToIncrement(w * (1 - reductionPct), g), g);
  });
}

// Returns the actual reduction amount alongside the new weight — reducing
// load is never subject to the equipment-limited gate (only increasing load
// is), so the effective reduction can differ from the top-level `increment`
// in recommendProgression, which is 0 for a gated equipment-limited
// exercise. Callers should use `amount` in reason text, not the outer
// `increment`, to avoid displaying "Reducing by 0 lb."
function reducedWeightFor(
  lastWeight: number,
  isBodyweight: boolean,
  profile: ExerciseProgressionProfile,
  equipment?: string | null,
): { weight: number; amount: number } {
  if (isBodyweight) return { weight: lastWeight, amount: 0 };
  const g = roundToRealisticIncrement(equipment);
  const { amount: gatedAmount } = getLoadIncrementAmount(lastWeight, profile, equipment);
  const amount = Math.max(gatedAmount, g);
  return { weight: Math.max(roundToIncrement(lastWeight - amount, g), g), amount };
}

// HV-028: the ADVANCE_LOAD counterpart — a bodyweight exercise past its rep
// ceiling can't "add load," so the rep target keeps climbing past the
// ceiling (uncapped, unlike nextRepTarget's floor-to-ceiling nudge) instead
// of resetting to the floor at a heavier weight. The ceiling still means
// something (it's when this branch fires at all), it just isn't a hard cap
// once there's no load to trade the extra reps in for.
function advanceRepsForBodyweight(lastReps: number): number {
  return lastReps + 1;
}

// ST-007: Double-progression rep target — advance the prescribed rep count by
// 1 from last session's actual performance (capped at the exercise's rep
// ceiling), rather than always prescribing the full band ceiling outright.
// Climbing one rep at a time before adding load is the standard double
// progression method (NSCA Essentials of Strength Training and Conditioning).
// This matters most where the band is wide relative to what's achievable
// session to session — e.g. a bodyweight Pull-Up spanning an 8–15 rep band —
// where jumping straight to the ceiling reads as an unrealistic ask instead
// of a coached, week-over-week nudge.
function nextRepTarget(lastReps: number, ceiling: number): number {
  return Math.max(1, Math.min(lastReps + 1, ceiling));
}

// ─── Session analysis helpers ─────────────────────────────────────────────────

// Working weight = highest weight completed in the session.
function workingWeight(session: SessionPerformance): number {
  if (!session.sets.length) return 0;
  return Math.max(...session.sets.map((s) => s.weight));
}

// Peak reps completed at the working weight.
function peakRepsAtWorkingWeight(session: SessionPerformance): number {
  if (!session.sets.length) return 0;
  const ww = workingWeight(session);
  const atWW = session.sets.filter((s) => s.weight === ww);
  return atWW.length > 0 ? Math.max(...atWW.map((s) => s.reps)) : 0;
}

export interface InitialMesocycleTarget {
  weight: number;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  seededFromHistory: boolean;
}

// ─── HV-040: Known-performance seed for a new hypertrophy mesocycle ─────────
// Source: Dr. Mike Israetel / RP Hypertrophy — begin a new mesocycle at its
// conservative Week-1 volume and effort while using established exercise
// performance to select a realistic working load. Starting a block is not a
// load-progression event: retain a successfully demonstrated load, clamp its
// completed reps into the new slot's authored band, and never copy the old
// session's larger set count into the Week-1 MEV prescription.
export function recommendInitialMesocycleTarget(
  prescription: SlotPrescription,
  sessions: SessionPerformance[],
): InitialMesocycleTarget {
  const fallback: InitialMesocycleTarget = {
    weight: 0,
    sets: prescription.sets,
    repsMin: prescription.repsMin,
    repsMax: prescription.repsMax,
    rir: prescription.rir,
    seededFromHistory: false,
  };
  const latest = sessions[0];
  if (!latest?.sets.length) return fallback;
  const weights = new Set(latest.sets.map((set) => set.weight));
  const successful = weights.size === 1
    && latest.sets.every((set) => set.reps >= prescription.repsMin
      && (prescription.equipment === 'Bodyweight' || set.weight > 0));
  if (!successful) return fallback;
  const demonstratedReps = Math.min(...latest.sets.map((set) => set.reps));
  const seededReps = Math.max(prescription.repsMin, Math.min(prescription.repsMax, demonstratedReps));
  const demonstratedWeight = latest.sets[0].weight;
  return {
    weight: prescription.equipment === 'Bodyweight' ? 0 : demonstratedWeight,
    sets: prescription.sets,
    repsMin: seededReps,
    repsMax: seededReps,
    rir: prescription.rir,
    seededFromHistory: true,
  };
}

// ST-013: A load increase requires the whole working-weight prescription to
// clear the rep ceiling, not one standout top set. Standard double progression
// advances load only after all prescribed working sets reach the top of the
// range with the intended effort (NSCA Essentials of Strength Training and
// Conditioning). Using the minimum working-set reps also makes set-to-set
// fatigue visible instead of hiding it behind the best set.
function completedRepsAtWorkingWeight(session: SessionPerformance): number {
  if (!session.sets.length) return 0;
  const ww = workingWeight(session);
  const atWW = session.sets.filter((s) => s.weight === ww);
  return atWW.length > 0 ? Math.min(...atWW.map((s) => s.reps)) : 0;
}

interface Perf { weight: number; maxReps: number; completedReps: number }

function sessionPerf(session: SessionPerformance): Perf {
  return {
    weight: workingWeight(session),
    maxReps: peakRepsAtWorkingWeight(session),
    completedReps: completedRepsAtWorkingWeight(session),
  };
}

// HV-044: when the rep ceiling was reached but reported effort blocked the load
// increase, say so. The generic "aim for N next session" text repeats a target
// the lifter has just hit and gives no clue why the weight is not moving.
function effortHoldReason(reps: number, ceiling: number, weight: number, prescribedRir: number): string {
  return `${reps}/${ceiling} reps at ${weight} lb, but reported RIR was below the ${prescribedRir} target — load holds until the same reps come back at ${prescribedRir}+ RIR.`;
}

// ─── HV-044: missing effort data must not block progression ───────────────
//
// ST-013 required *complete* RIR evidence before an intermediate or advanced
// lifter could add load, and treated no evidence as disqualifying. Reporting
// RIR is optional in the UI — the prompt has an explicit "Not sure — skip" —
// so this silently froze progression: an advanced lifter who topped the rep
// range was told to "aim for 12 next session" having just done 12, with no
// mention of RIR anywhere in the reason. Repeating that identical session
// three times then tripped plateau detection and *deloaded* them ~22%, for
// failing to progress in a way the engine itself prevented. A beginner with
// byte-identical history advanced normally.
//
// The intent was right — do not add load when the last session was already
// harder than prescribed — but absence of evidence was being read as evidence
// of maximal effort. It now holds only on positive evidence of over-reach,
// which is also how RP autoregulates: their app progresses by default and uses
// feedback to pull back, rather than refusing to move without it.
function reportedEffortAllowsLoad(
  session: SessionPerformance,
  prescribedRir: number,
): boolean {
  const reported = session.sets.filter((set) => set.rir !== undefined);
  // No effort data at all — defer to the rep-ceiling gate, which already
  // requires the lifter to have topped the prescribed range to get here.
  if (reported.length === 0) return true;
  // Sets that were not reported cannot testify either way, so judge on the
  // ones that were rather than discarding partial evidence entirely.
  return reported.every((set) => (set.rir as number) >= prescribedRir);
}

// ST-013/ST-015: NSCA double progression assumes a completed straight-set
// prescription. Until top and backoff sets are explicitly modeled, mixed
// loads or fewer-than-prescribed sets hold automatically.
function completedStraightSetPrescription(
  session: SessionPerformance,
  prescribedSets: number,
  repCeiling: number,
  allowZeroLoad: boolean,
): boolean {
  if (session.sets.length < prescribedSets || session.sets.length === 0) return false;
  const load = session.sets[0].weight;
  // HV-028: bodyweight work uses zero to mean valid zero external load, not
  // missing performance. Loaded exercises still require a positive load.
  return (load > 0 || allowZeroLoad)
    && session.sets.every((set) => set.weight === load)
    && session.sets.every((set) => set.reps >= repCeiling);
}

// ─── HV-033: Comparable performance trend ────────────────────────────────────
//
// Plateau detection compares like-for-like sessions rather than collapsing
// load, reps, set count, and RIR into a directionally ambiguous tonnage score.
// A set-count change is not comparable. At identical output, higher reported
// RIR means the athlete achieved the work with more reserve and therefore
// improved; lower or equal RIR is not improvement. Partial RIR histories are
// not strong enough evidence to classify a plateau.
function isStalledPair(current: SessionPerformance, previous: SessionPerformance): boolean {
  if (current.sets.length !== previous.sets.length || current.sets.length === 0) return false;
  const currentPerf = sessionPerf(current);
  const previousPerf = sessionPerf(previous);
  if (currentPerf.weight !== previousPerf.weight
    || currentPerf.completedReps !== previousPerf.completedReps
    || currentPerf.maxReps !== previousPerf.maxReps) return false;

  const currentRir = current.sets.map((set) => set.rir);
  const previousRir = previous.sets.map((set) => set.rir);
  const neitherRated = currentRir.every((rir) => rir === undefined)
    && previousRir.every((rir) => rir === undefined);
  if (neitherRated) return true;
  if (currentRir.some((rir) => rir === undefined) || previousRir.some((rir) => rir === undefined)) return false;

  const average = (values: (number | undefined)[]) =>
    values.reduce<number>((sum, value) => sum + (value as number), 0) / values.length;
  return average(currentRir) <= average(previousRir);
}

// Count identical consecutive *pairs* (sessions[i] == sessions[i+1]) from the
// most-recent session inward.
//
// HV-034: thresholds updated 2026-08-04 (SUPERSEDES the doctrine-5.3
// thresholds below — kept for history, not silently deleted):
//   Beginner    : 3 consecutive sessions = 2 pairs
//   Intermediate: 3 consecutive weeks    = 2 pairs
//   Advanced    : 2 consecutive weeks    = 1 pair (accommodation arrives faster)
// New thresholds (beginner 4 exposures / 3 pairs, intermediate+advanced 3
// exposures / 2 pairs each) are applied where stallThreshold is computed in
// recommendProgression — this function's pair-counting logic is unchanged,
// only what counts as a "stalled pair" is stricter: HV-034 additionally
// requires comparable set counts, whole-prescription reps, and no RIR
// improvement, not just identical peak load+reps. The old
// "advanced accommodates faster, so flag sooner" rationale is explicitly
// retracted, not just renumbered — advanced now requires the same 2-pair
// confirmation as intermediate before calling a plateau.
function countConsecutiveStalls(sessions: SessionPerformance[]): number {
  if (sessions.length < 2) return 0;
  let count = 0;
  for (let i = 0; i < sessions.length - 1; i++) {
    if (isStalledPair(sessions[i], sessions[i + 1])) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// Count consecutive bad sessions from the most-recent session inward.
// A bad session = reps decreased at same or lower load vs. the prior session.
// This is a conservative proxy for the doctrine definition (which also requires
// same prescribedRir and non-deload week — data not yet stored per session).
function countConsecutiveBadSessions(sessions: SessionPerformance[]): number {
  if (sessions.length < 2) return 0;
  let count = 0;
  for (let i = 0; i < sessions.length - 1; i++) {
    const curr = sessionPerf(sessions[i]);
    const prev = sessionPerf(sessions[i + 1]);
    if (curr.weight <= prev.weight && curr.maxReps < prev.maxReps) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ─── HV-032: Volume transition compensation ────────────────────────────────
//
// The core fix this file was reworked for: when the weekly volume ramp adds
// a set to an exercise, the rep/load engine used to keep expecting the exact
// same reps on the new, higher-fatigue set (3x10@200 -> a naive 4x10@200).
// This lowers the rep ceiling for the one session where sets went up, sized
// by the exercise's category (setAdditionRepPenaltyPct — user doctrine spec
// 2026-08-04) and how much fatigue was already in play (sets added, prior
// RIR). Example from the spec: 3x10@200 -> volume engine adds a set -> a
// high-fatigue compound should see something like 4x8-10@200, not 4x10@200
// — this function is what produces that lowered ceiling; the exact number in
// that example (~20%) sits above even heavy_compound's cited 5-10% range, so
// treat it as illustrative rather than a literal arithmetic target.
export interface VolumeTransitionAdjustment {
  adjustedRepsMax: number;
  // True when the penalty is severe enough that load should hold even if
  // the (already-lowered) ceiling is hit this session.
  holdLoad: boolean;
  reason: string;
}

export function calculateVolumeTransitionAdjustment(
  previousSets: number,
  newSets: number,
  prescription: { repsMin: number; repsMax: number },
  profile: ExerciseProgressionProfile,
  previousRir?: number,
): VolumeTransitionAdjustment {
  const setsAdded = Math.max(0, newSets - previousSets);
  if (setsAdded === 0) {
    return { adjustedRepsMax: prescription.repsMax, holdLoad: false, reason: 'No set increase this transition.' };
  }
  const { min, max } = profile.setAdditionRepPenaltyPct;
  const setsSeverity = Math.min(1, (setsAdded - 1) / 2); // 1 set added -> 0, 3+ sets -> 1
  const rirSeverity = previousRir === undefined ? 0.5 : previousRir <= 1 ? 1 : previousRir >= 3 ? 0 : 0.5;
  const penaltyPct = min + (max - min) * ((setsSeverity + rirSeverity) / 2);
  const adjustedRepsMax = Math.max(prescription.repsMin, Math.round(prescription.repsMax * (1 - penaltyPct)));
  return {
    adjustedRepsMax,
    holdLoad: penaltyPct >= max,
    reason: `Sets increased ${previousSets} → ${newSets}; rep ceiling lowered ${Math.round(penaltyPct * 100)}% (${prescription.repsMax} → ${adjustedRepsMax}) to offset added-set fatigue.`,
  };
}

// ─── Main engine ──────────────────────────────────────────────────────────────
//
// sessions must be sorted newest-first (index 0 = most recent session).
// sessions must contain only completed working sets — no warm-ups, no skipped sets.
//
// Decision priority (doctrine Section 4.1, extended 2026-08-04 per HV-032/
// HV-034 — see those tags above):
//   1. DELOAD_ACTIVE (isDeload week) — no progression decisions
//   2. FIRST_SESSION (no history) — starter defaults. Checked before every
//      focus-specific branch below (maintenance, cut) so a brand-new exercise
//      always gets the "enter your starting weight" flow instead of a
//      focus-specific hold/deload message built from zeroed-out history.
//   3. Maintenance focus — hold performance, no auto-increment
//   4. BAD_SESSION threshold → DELOAD_NEEDED
//   5. Cut/fat-loss focus — RC-011: reduced-speed progression, not a hold
//   6. Experience-level dispatch (beginner linear / intermediate+advanced double)
//   7. Plateau resolution (inside the dispatch functions) — gated off when
//      volume recently increased (HV-034); that session's rep expectation is
//      already handled by HV-032's transition adjustment instead.

export function recommendProgression(
  prescription: SlotPrescription,
  sessions: SessionPerformance[],
  ctx: ProgressionContext,
): ProgressionRecommendation {

  // HV-029/HV-030: defaults to heavy_compound when the caller doesn't
  // resolve one — the closest analog to the old implicit 'barbell-compound'
  // default, so callers/tests that don't pass a profile keep prior behavior.
  const profile: ExerciseProgressionProfile = prescription.profile ?? PROGRESSION_CATEGORY_PROFILES.heavy_compound;
  // HV-028: see the doctrine comment on heldOrAdjustedWeight above.
  const isBodyweight = prescription.equipment === 'Bodyweight' || profile.category === 'bodyweight';
  // ST-011: increment sizing is now weight-dependent (percentage-based /
  // equipment-gated), computed once here off the most recent logged weight
  // — every branch below that changes load operates on that same session,
  // so the weight doesn't move mid-evaluation.
  const baselineWeight = sessions.length > 0 ? sessionPerf(sessions[0]).weight : 0;
  const { amount: increment, equipmentLimited } = isBodyweight
    ? { amount: 0, equipmentLimited: false }
    : getLoadIncrementAmount(baselineWeight, profile, prescription.equipment);

  // Bug fix: this used to read ctx.trainingPhase, a field no call site ever
  // populates, so cut-phase behavior below was unreachable in production.
  // programFocus is what's actually threaded through from the program's
  // focus (src/api/progression.ts), matching how isMaintenance/isStrength
  // are already derived just below.
  const isCut = ctx.programFocus === 'cut';
  const isMaintenance = ctx.programFocus === 'maintenance';
  const isStrength = ctx.programFocus === 'strength';

  // Set-count progression within meso. HV-021: for hypertrophy with a
  // pre-resolved landmark target (see ProgressionContext.hypertrophyVolumeOverride),
  // that target wins outright — it's already muscle-level MEV/MAV/MRV-aware and
  // MRV-capped. This includes 'maintain' priority: the override resolves to
  // that muscle's own Maintenance Volume landmark (flat, no ramp — see
  // resolveMusclePerSessionAnchors in src/api/progression.ts), which can be
  // higher OR lower than whatever the template/last-actual set count was —
  // "maintain" tracks true MV, not "whatever you were already doing."
  // Confirmed as intentional 2026-08-04 (a muscle at 2 sets/week jumping to
  // 5 after a refresh, because 2 sets was below that muscle's real MV, is
  // expected — not a bug to special-case around).
  // Every other focus (no landmark override available) keeps the original
  // flat per-exercise doctrine:
  //   emphasize → add 1 set per week above base (volume accumulation)
  //   grow      → hold at template value
  //   maintain  → never exceed template value
  //
  // VA-015: the emphasize ramp step itself is gated by this session's reported
  // soreness rather than advancing unconditionally with mesoWeek. Source:
  // Dr. Mike Israetel / RP Hypertrophy autoregulation (recovery.md; doctrine
  // "Response Indicators" — muscle groups that recover within 24h and don't
  // get pumped/sore from current volume grow better with more volume, while
  // muscle groups still sore at the next session have exceeded recoverable
  // volume). Implemented by shifting which week's ramp step applies:
  //   Not sore     → take next week's step early (under-dosed, push further)
  //   Healed early → normal ramp (unchanged)
  //   Just in time → repeat last week's step (recovery and volume are
  //                  matched — this is the MRV signal, don't advance further)
  //   Still sore   → handled below by the existing VA-013 one-set trim
  // Only affects the flat per-exercise ramp — the HV-021 landmark override is
  // already muscle-level MRV-aware and isn't second-guessed here except by
  // the VA-013 safety trim, which still applies to both paths unchanged.
  const rampWeek = ctx.soreness === 'Just in time' ? ctx.mesoWeek - 1
    : ctx.mesoWeek;
  const baseSetCount = prescription.sets;
  const weekBonus = ctx.musclePriority === 'emphasize' ? Math.max(0, rampWeek - 1) : 0;
  const rawEffectiveSets = ctx.programFocus === 'hypertrophy' && ctx.hypertrophyVolumeOverride
    ? ctx.hypertrophyVolumeOverride.trainingSets
    : ctx.musclePriority === 'maintain'
      ? baseSetCount
      : baseSetCount + weekBonus;

  // VA-013: back off one set rather than progress it if this muscle reported
  // 'Still sore' walking into the session just logged — a full reset to
  // baseSetCount overcorrects for a single sore session; a one-set trim is
  // the modest autoregulation response doctrine calls for. Applied to
  // rawEffectiveSets so this composes with both the flat weekBonus path and
  // the HV-021 landmark-override path without needing to special-case which
  // one produced the number. Never drops sets below baseSetCount — this
  // holds volume down, it doesn't cut below where the meso started.
  // Source: Dr. Mike Israetel / RP Hypertrophy — recovery autoregulation via
  // soreness feedback.
  const stillSore = ctx.soreness === 'Still sore';
  // VA-018: when the caller has computed a fatigue-weighted per-exercise
  // trim (redistributeSorenessTrim in volumeBudget.ts), use that instead of
  // the flat 1-set trim — extends VA-013, doesn't replace its "never below
  // baseSetCount" invariant.
  const sorenessTrim = ctx.sorenessTrimOverride ?? 1;
  // The landmark override has already applied soreness in rampSets(). Do not
  // trim it twice. Unlike the legacy path, rampSets floors at Week-1 MEV/MV,
  // not last session's actual sets, so it can genuinely reduce an excessive
  // prior workload.
  const hasLandmarkOverride = ctx.programFocus === 'hypertrophy' && !!ctx.hypertrophyVolumeOverride;
  let effectiveSets = stillSore && !hasLandmarkOverride
    ? Math.max(1, rawEffectiveSets - sorenessTrim)
    : rawEffectiveSets;
  if (ctx.restartAtVolumeAnchor) {
    effectiveSets = Math.max(1, Math.min(effectiveSets, baseSetCount));
  }

  // HV-032: previous sets = last actual logged set count (no separate stored
  // field needed — sessions[0] IS last week's real performance). Falls back
  // to the prescription's own sets when there's no history yet (FIRST_SESSION
  // will win before this matters).
  const previousSets = sessions.length > 0 ? sessions[0].sets.length : prescription.sets;
  const previousRir = sessions.length > 0 ? sessions[0].sets.find((s) => s.rir !== undefined)?.rir : undefined;
  const volumeAdjustment = calculateVolumeTransitionAdjustment(
    previousSets,
    effectiveSets,
    { repsMin: prescription.repsMin, repsMax: prescription.repsMax },
    profile,
    previousRir,
  );
  // HV-034: plateau branches gate off when volume just increased — that
  // session's rep expectation is already handled by volumeAdjustment above.
  const volumeRecentlyIncreased = previousSets < effectiveSets;

  // During a cut, raise the rep floor to 8 to reduce injury risk from heavy loading.
  const effectiveRepsMin = isCut
    ? Math.max(prescription.repsMin, 8)
    : prescription.repsMin;
  // HV-032: this session's rep ceiling — lowered from the template's
  // repsMax when sets just increased; unchanged otherwise.
  const effectiveRepsMax = volumeAdjustment.adjustedRepsMax;

  // HV-034: stall threshold — exposures required before a plateau is called
  // (SUPERSEDES the doctrine-5.3 thresholds referenced above — see
  // countConsecutiveStalls's doctrine comment for the full explanation,
  // including the retracted "advanced accommodates faster" rationale).
  //   Beginner            : 4 exposures = 3 pairs
  //   Intermediate/Advanced: 3 exposures = 2 pairs each
  const stallThreshold = ctx.experienceLevel === 'beginner' ? 3 : 2;

  // Bad session threshold: how many consecutive regressions trigger an early
  // deload. RC-011: cut phase now matches the base threshold (2) instead of
  // the previous relaxed 3 — see the cut-phase branch below for why.
  const badSessionThreshold = 2;

  const base = {
    nextSets: effectiveSets,
    nextRepsMin: effectiveRepsMin,
    nextRepsMax: prescription.repsMax,
    nextRir: prescription.rir,
    loadIncrement: increment,
    isPlateauWarning: false,
  };

  // HV-001: Intra-mesocycle RIR taper for non-deload weeks. Applied to
  // emphasize/grow muscles: RIR drops by weeks remaining so effort peaks on
  // the final training week (weeksRemaining = 0).
  // Deload overrides nextRir further below so this only affects working weeks.
  //
  // HV-027: previously this taper was gated off entirely for beginners
  // (`ctx.experienceLevel !== 'beginner'`), but Hypertrophy Made Simple's
  // beginner RIR table still calls for a taper — just a gentler one, from
  // 4-5 RIR down to 2 RIR rather than all the way to failure, since beginner
  // technique under fatigue is less reliable and doesn't yet warrant the
  // intermediate/advanced 0-RIR peak week. So the floor is 2 for beginners
  // instead of 0, and the beginner exclusion is removed — beginners now taper
  // toward that higher floor instead of not tapering at all. Same floor value
  // used by slotBuilder.ts's generation-time taper (HV-026) so the two paths
  // can't diverge.
  // Source: RP Strength "Hypertrophy Made Simple" (2023).
  if (
    !ctx.isDeload &&
    (ctx.musclePriority === 'emphasize' || ctx.musclePriority === 'grow') &&
    ctx.mesoWeek !== undefined &&
    ctx.totalMesoWeeks !== undefined
  ) {
    base.nextRir = rirForWeek(base.nextRir, ctx.musclePriority, {
      weekNumber: ctx.mesoWeek,
      totalTrainingWeeks: Math.max(1, ctx.totalMesoWeeks - 1),
      isDeload: false,
      experienceLevel: ctx.experienceLevel,
    });
  }

  // HV-019: Hard RIR floor for deadlift-pattern exercises.
  // Applied after the taper so the floor wins over any taper reduction.
  if (prescription.hardRirFloor !== undefined) {
    base.nextRir = Math.max(base.nextRir, prescription.hardRirFloor);
  }

  // HV-036: category failure-policy floor — composes with hardRirFloor via
  // Math.max rather than a separate precedence rule, so hardRirFloor (more
  // specific, per-exercise) naturally wins whenever it's higher, and the
  // category floor (e.g. heavy compounds never truly hit 0-RIR failure even
  // at peak week) still applies to every exercise in that category, not just
  // the handful with an explicit hardRirFloor override. RC-011 bumps this
  // further during a cut (below, before the taper's peak-week floor would
  // otherwise let effort run all the way to the category's normal floor).
  // Source: RP Strength "Hypertrophy Made Simple" RIR-taper guidance + NSCA
  // technical-breakdown-risk-near-failure for loaded compounds — same
  // citation lineage as HV-001/HV-027's taper.
  const categoryFailureFloor: Record<typeof profile.failurePolicy, number> = { avoid: 1, limited: 1, allowed: 0 };
  base.nextRir = Math.max(
    base.nextRir,
    categoryFailureFloor[profile.failurePolicy] + (ctx.programFocus === 'cut' ? 1 : 0),
  );

  // HV-038/HV-039: RP fatigue management reserves true failure for the final
  // training week on failure-tolerant exercises with positive recovery. If
  // sets rise or recovery is late, effort cannot intensify at the same time.
  const finalTrainingWeek = ctx.mesoWeek >= Math.max(1, ctx.totalMesoWeeks - 1);
  const zeroRirEligible = finalTrainingWeek
    && profile.failurePolicy === 'allowed'
    && !volumeRecentlyIncreased
    && (ctx.soreness === 'Healed early' || ctx.soreness === 'Just in time');
  if (!zeroRirEligible) base.nextRir = Math.max(1, base.nextRir);
  if (volumeRecentlyIncreased || ctx.soreness === 'Still sore' || ctx.soreness === 'Just in time') {
    base.nextRir = Math.max(base.nextRir, prescription.rir);
  }
  const repeatedRecoveryFailure = ctx.soreness === 'Still sore'
    && (ctx.consecutiveStillSoreCount ?? 1) >= 2;

  // ── Priority 1: Deload week — protocol varies by focus ────────────────────
  // HV-035/ST-012: deload load-reduction percentages — SUPERSEDES HV-025 and
  // ST-004 below (kept for history, not silently deleted).
  //
  // HV-025 (original): flat 50% load reduction for the whole deload week —
  // applies to every focus, not just strength (ST-004 below). Previously the
  // hypertrophy/powerbuilding branch held nextWeight unchanged and only cut
  // volume, but Hypertrophy Made Simple's own deload protocol also calls
  // for reduced load (80-100% first half / 50% second half of the week for
  // full deloads; half weight for single-muscle "recovery sessions") — a
  // deload that never reduces load under-recovers exactly the way ST-004
  // already fixed for strength. Same whole-week-granularity simplification
  // as ST-004: a flat 50% instead of RP's two-stage split, since this app's
  // progression model operates at whole-week granularity, not half-weeks.
  // Source: RP Strength "Hypertrophy Made Simple" (2023).
  //
  // ST-004 (original): Strength deload — reduce load 50%, hold reps and sets
  // flat (100%). Unlike hypertrophy deloads (halve volume, hold load),
  // strength deloads must preserve neuromuscular coordination — cutting sets
  // on heavy compound movements degrades motor patterns built over the meso.
  //
  // HV-035/ST-012 (2026-08-04, user doctrine spec): the flat-50%-load
  // philosophy is replaced with cited ranges — hypertrophy/powerbuilding
  // load reduction 15-30% (using the 22.5% midpoint), strength load
  // reduction 15-25% (20% midpoint). Strength ALSO now cuts volume 30-50%
  // (40% midpoint) instead of holding sets flat at 100% — "maintain
  // movement exposure" per the new spec means never dropping the pattern to
  // zero, not never touching set count at all, so sets are floored at 2
  // rather than held unchanged.
  if (ctx.isDeload) {
    const lastWeight = sessions.length > 0 ? sessionPerf(sessions[0]).weight : 0;
    const deloadLoadReductionPct = isStrength ? 0.20 : 0.225;
    // HV-028: bodyweight has no load to reduce — see heldOrAdjustedWeight.
    const deloadWeight = deloadWeightFor(lastWeight, isBodyweight, deloadLoadReductionPct, prescription.equipment);
    if (isStrength) {
      const scheduledDeloadSets = Math.max(2, Math.ceil(baseSetCount * 0.60));
      const recoverySets = sessions.length > 0 ? Math.max(1, Math.ceil(sessions[0].sets.length * 0.5)) : scheduledDeloadSets;
      const deloadSets = repeatedRecoveryFailure ? Math.min(scheduledDeloadSets, recoverySets) : scheduledDeloadSets;
      return {
        ...base,
        nextWeight: deloadWeight,
        nextSets: deloadSets,
        nextRir: Math.max(3, prescription.rir),
        action: 'DELOAD',
        reason: isBodyweight
          ? `Strength deload — sets reduced to ${deloadSets} (pattern maintained, never dropped), bodyweight held at ${lastWeight} lb (no external load to reduce).`
          : `Strength deload — load reduced ${Math.round(deloadLoadReductionPct * 100)}% (${lastWeight} → ${deloadWeight} lbs), sets reduced to ${deloadSets} (pattern maintained, never dropped).`,
      };
    }
    // PB-006: Powerbuilding deload still borrows the hypertrophy protocol
    // wholesale — pointer-only supersession of PB-004, no numbers of its own.
    // PHAT and Kizen both distribute CNS fatigue across power and
    // hypertrophy days throughout the meso, so accumulated load is lower
    // than pure strength. Source: Kizen Week 9 deload structure.
    //
    // HV-021: hypertrophy focus with a resolved landmark target deloads sets
    // to that muscle's own MV (Maintenance Volume) instead of a flat
    // percentage — see ProgressionContext.hypertrophyVolumeOverride. Load
    // reduction (HV-035) still applies uniformly regardless of which
    // set-count path is used.
    const hasVolumeOverride = ctx.programFocus === 'hypertrophy' && !!ctx.hypertrophyVolumeOverride;
    const scheduledDeloadSets = hasVolumeOverride
      ? ctx.hypertrophyVolumeOverride!.deloadSets
      : Math.max(1, Math.ceil(baseSetCount * 0.5));
    const recoverySets = sessions.length > 0 ? Math.max(1, Math.ceil(sessions[0].sets.length * 0.5)) : scheduledDeloadSets;
    const deloadSets = repeatedRecoveryFailure ? Math.min(scheduledDeloadSets, recoverySets) : scheduledDeloadSets;
    // HV-035: bodyweight deload reps soften 25% rather than the loaded-lift
    // 50% halving — reps are bodyweight's only progression axis, so halving
    // them every deload is disproportionate versus a loaded lift softening
    // on two axes (load + reps) simultaneously at once. Not explicit in the
    // user's spec; an interpolation from "bodyweight: reduce sets/reps only."
    const repReductionPct = isBodyweight ? 0.25 : 0.5;
    return {
      ...base,
      nextWeight: deloadWeight,
      nextSets: deloadSets,
      nextRepsMin: Math.max(1, Math.ceil(effectiveRepsMin * (1 - repReductionPct))),
      nextRepsMax: Math.max(1, Math.ceil(prescription.repsMax * (1 - repReductionPct))),
      nextRir: Math.max(4, prescription.rir),
      action: 'DELOAD',
      reason: isBodyweight
        ? (hasVolumeOverride
          ? `Deload week — sets dropped to Maintenance Volume, reps reduced ${Math.round(repReductionPct * 100)}%, bodyweight held at ${lastWeight} lb (no external load to reduce), effort capped at RIR 4.`
          : `Deload week — sets and reps reduced ${Math.round(repReductionPct * 100)}%, bodyweight held at ${lastWeight} lb (no external load to reduce), effort capped at RIR 4.`)
        : (hasVolumeOverride
          ? `Deload week — sets dropped to Maintenance Volume, reps halved, load reduced ${Math.round(deloadLoadReductionPct * 100)}% (${lastWeight} → ${deloadWeight} lbs), effort capped at RIR 4.`
          : `Deload week — sets and reps halved, load reduced ${Math.round(deloadLoadReductionPct * 100)}% (${lastWeight} → ${deloadWeight} lbs), effort capped at RIR 4.`),
    };
  }

  // ── Priority 2: First session — no history ────────────────────────────────
  // Bug fix: this used to run after the maintenance-focus branch below, so a
  // maintenance-focus muscle with zero logged history returned a nonsense
  // CUT_HOLD recommendation ("holding 0 reps × 0 lbs") instead of prompting
  // for a starting weight. Every focus-specific branch needs real history to
  // say anything meaningful, so FIRST_SESSION must win regardless of focus.
  if (sessions.length === 0) {
    return {
      ...base,
      nextWeight: 0,
      action: 'FIRST_SESSION',
      reason: 'First session — enter your starting weight.',
    };
  }

  // VA-020/RC-012: Dr. Mike Israetel / RP response indicators. A second
  // consecutive recovery failure becomes a temporary recovery exposure at
  // half the last actual volume (minimum one), RIR 4, and the existing deload
  // load reduction. MEV/MV are not floors for an unrecovered athlete.
  if (repeatedRecoveryFailure) {
    const lastPerf = sessionPerf(sessions[0]);
    const recoveryReductionPct = isStrength ? 0.20 : 0.225;
    const recoveryWeight = deloadWeightFor(lastPerf.weight, isBodyweight, recoveryReductionPct, prescription.equipment);
    const recoverySets = Math.max(1, Math.ceil(sessions[0].sets.length * 0.5));
    return {
      ...base,
      nextWeight: recoveryWeight,
      nextSets: recoverySets,
      nextRepsMin: Math.max(1, Math.ceil(effectiveRepsMin * 0.5)),
      nextRepsMax: Math.max(1, Math.ceil(prescription.repsMax * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'DELOAD_NEEDED',
      reason: `Still sore for 2 consecutive exposures. Recovery session: ${recoverySets} sets, reduced load and reps, RIR 4. Resume from the starting volume anchor after recovery.`,
      isPlateauWarning: true,
    };
  }

  // ── Priority 3: Maintenance focus — hold performance, no auto-increment ──
  // Equivalent to fat-loss hold: maintaining is the success criterion.
  if (isMaintenance) {
    const lastWeight = sessionPerf(sessions[0]).weight;
    const lastReps = sessionPerf(sessions[0]).maxReps;
    return {
      ...base,
      nextWeight: lastWeight,
      nextSets: baseSetCount,
      action: 'CUT_HOLD',
      reason: `Maintenance focus — holding ${lastReps} reps × ${lastWeight} lbs. No auto-increment; maintaining muscle is the goal.`,
    };
  }

  const last = sessions[0];
  const lastPerf = sessionPerf(last);
  const effortAllowsLoad = reportedEffortAllowsLoad(last, prescription.rir)
    && completedStraightSetPrescription(last, prescription.sets, effectiveRepsMax, isBodyweight);
  const stalls = countConsecutiveStalls(sessions);
  const badSessions = countConsecutiveBadSessions(sessions);

  // ── Priority 4: Consecutive bad sessions → immediate deload ───────────────
  // Doctrine 2.3 Trigger 2 / 3.3 Trigger 2: ≥2 consecutive bad sessions
  // means accumulated fatigue or overreaching; deload before any load change.
  // RC-011: badSessionThreshold is now 2 even during a cut (see its
  // computation above) — this branch itself is otherwise unchanged.
  if (badSessions >= badSessionThreshold) {
    // HV-035: same category-aware load reduction as the scheduled-deload
    // branch above — an immediate deload triggered by accumulated fatigue
    // needs the same load relief a scheduled one gets. HV-028: bodyweight
    // has no load to reduce.
    const badSessionReductionPct = isStrength ? 0.20 : 0.225;
    const deloadWeight = deloadWeightFor(lastPerf.weight, isBodyweight, badSessionReductionPct, prescription.equipment);
    return {
      ...base,
      nextWeight: deloadWeight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'DELOAD_NEEDED',
      reason: isBodyweight
        ? `${badSessions} consecutive sessions with fewer reps than the session before. Deload now — bodyweight held at ${lastPerf.weight} lb (no external load to reduce); this is accumulated fatigue, not a plateau.`
        : `${badSessions} consecutive sessions with fewer reps than the session before. Deload now — load reduced ${Math.round(badSessionReductionPct * 100)}% (${lastPerf.weight} → ${deloadWeight} lbs); this is accumulated fatigue, not a plateau.`,
      isPlateauWarning: true,
    };
  }

  // ── Priority 5: Cut phase — reduced-speed progression, not a hold ────────
  // RC-011 (2026-08-04, user doctrine spec) — SUPERSEDES the original
  // "fat-loss hold" branch below (kept for history, not silently deleted).
  //
  // Original: During a cut, auto-increment was disabled entirely (doctrine
  // 4.4). Maintaining current performance was the success criterion. A load
  // increase was still surfaced if the user organically hit the ceiling, but
  // as CUT_HOLD (informational) rather than the automatic ADVANCE_LOAD.
  // badSessionThreshold was also relaxed to 3 for cut specifically, reasoned
  // as "deficits cause 1-2 natural bad sessions."
  //
  // RC-011: cut no longer disables progression outright — it runs at 50-70%
  // speed (CUT_SPEED_FACTOR = 0.65 midpoint) instead. This directly reverses
  // the old badSessionThreshold leniency too: "increase fatigue sensitivity"
  // means cut should catch real regression at least as fast as a normal
  // week, not slower — badSessionThreshold is computed as a flat 2 above,
  // not relaxed to 3 for cut anymore. Bodyweight exercises have no load axis
  // to throttle, so their reps keep climbing unscaled during a cut — a
  // reasonable interpretation, not explicit in the spec.
  if (isCut) {
    const ceilingHit = lastPerf.completedReps >= effectiveRepsMax && lastPerf.weight > 0;
    if (ceilingHit && effortAllowsLoad && !isBodyweight && !volumeAdjustment.holdLoad && !volumeRecentlyIncreased) {
      const CUT_SPEED_FACTOR = 0.65;
      const granularity = roundToRealisticIncrement(prescription.equipment);
      const cutIncrement = roundToIncrement(increment * CUT_SPEED_FACTOR, granularity);
      if (cutIncrement > 0) {
        const nextWeight = roundToIncrement(lastPerf.weight + cutIncrement, granularity);
        return {
          ...base,
          nextWeight,
          nextRepsMin: effectiveRepsMin,
          nextRepsMax: effectiveRepsMin,
          loadIncrement: cutIncrement,
          action: 'CUT_PROGRESS',
          reason: `Hit ceiling during fat-loss phase — partial progression: +${cutIncrement} lb (~65% of the full +${increment} lb this would otherwise get).`,
        };
      }
      // Scaled increment rounds to 0 at this weight — falls through to
      // CUT_HOLD below; naturally re-attempted next session as
      // percentage-based increments grow with weight, no separate "banked
      // progress" state needed.
    }
    return {
      ...base,
      nextWeight: lastPerf.weight,
      action: 'CUT_HOLD',
      reason: ceilingHit
        ? `Hit rep ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb) during fat-loss phase. Maintaining is still success.`
        : `Fat-loss phase — maintaining ${lastPerf.maxReps} reps × ${lastPerf.weight} lb is the target.`,
    };
  }

  // ── Priority 6: Experience-level dispatch ─────────────────────────────────

  if (ctx.experienceLevel === 'beginner') {
    return evaluateBeginnerLinear(prescription, sessions, ctx, {
      lastPerf, stalls, stallThreshold, increment, equipmentLimited, effectiveRepsMin, effectiveRepsMax, base, isBodyweight, profile, volumeRecentlyIncreased, holdLoad: volumeRecentlyIncreased || volumeAdjustment.holdLoad, effortAllowsLoad,
    });
  }

  return evaluateDoubleProgression(prescription, sessions, ctx, {
    lastPerf, stalls, stallThreshold, increment, equipmentLimited, effectiveRepsMin, effectiveRepsMax, base, isBodyweight, profile, volumeRecentlyIncreased, holdLoad: volumeRecentlyIncreased || volumeAdjustment.holdLoad, effortAllowsLoad,
  });
}

// ─── Shared ceiling-hit resolution ─────────────────────────────────────────
//
// ST-011/HV-037: extracted because equipment-limited fallback and the
// bodyweight difficulty ladder are nontrivial branches that would otherwise
// duplicate identically between evaluateBeginnerLinear and
// evaluateDoubleProgression, which already handled a plain ceiling hit
// identically (both reset to effectiveRepsMin at the new load — the only
// difference was reason-text wording).
function resolveCeilingHit(
  prescription: SlotPrescription,
  lastPerf: Perf,
  effectiveRepsMin: number,
  profile: ExerciseProgressionProfile,
  isBodyweight: boolean,
  increment: number,
  equipmentLimited: boolean,
  base: EvalInputs['base'],
  progressionLabel: 'Linear progression' | 'Double progression',
  experienceLevel: ExperienceLevel,
): ProgressionRecommendation {
  // HV-037: bodyweight has its own multi-dimension ladder (reps -> tempo ->
  // range of motion -> leverage -> external load), not more reps forever —
  // SUPERSEDES HV-028's original "uncapped by design" framing below (kept
  // for history). This branch only fires once the exercise's rep ceiling is
  // hit, so it composes with (doesn't replace) the below-floor/stalled
  // bodyweight paths in the calling functions, which never reach here.
  //
  // HV-028 (original): a bodyweight exercise past its rep ceiling can't "add
  // load," so the rep target kept climbing past the ceiling uncapped instead
  // of resetting to the floor at a heavier weight — the ceiling meant
  // something (it's when this branch fired at all), it just wasn't a hard
  // cap once there was no load to trade the extra reps in for.
  //
  // HV-037 (2026-08-04, user doctrine spec): "do not allow unlimited reps
  // forever" — a per-exercise/category rep ceiling (default 30, see
  // ExerciseDefinition.bodyweightRepCeiling / PROGRESSION_CATEGORY_PROFILES)
  // now caps the reps-only climb; past it, the engine signals a difficulty
  // change instead. No exercise-substitution dataset exists to auto-pick a
  // harder variant, so this is advisory text only.
  if (isBodyweight) {
    const ceiling = profile.bodyweightRepCeiling ?? 30;
    if (lastPerf.maxReps < ceiling) {
      const nextTarget = advanceRepsForBodyweight(lastPerf.maxReps);
      return {
        ...base,
        nextWeight: lastPerf.weight,
        nextRepsMax: nextTarget,
        action: 'HOLD',
        reason: `Bodyweight exercise — no load to add. ${lastPerf.maxReps} reps at ${lastPerf.weight} lb cleared the ${prescription.repsMax}-rep ceiling; climbing toward the ${ceiling}-rep ceiling before advancing difficulty. Aim for ${nextTarget} next session.`,
      };
    }
    return {
      ...base,
      nextWeight: lastPerf.weight,
      nextRepsMax: ceiling,
      action: 'ADVANCE_DIFFICULTY',
      reason: `Reached the ${ceiling}-rep ceiling at bodyweight. Advance difficulty instead: tempo → range of motion → leverage (e.g. feet-elevated, single-limb) → external load (weighted vest/belt). Advisory only — pick the next variation yourself.`,
    };
  }

  // ST-011: equipment-limited exercise (isolation/cable_accessory) whose own
  // smallest realistic increment is still proportionally too large — hold
  // load and extend reps past the ceiling instead, up to a rep buffer, then
  // force the jump anyway so it can't stall forever.
  if (equipmentLimited) {
    // RC-003: lengthened-position partials are reserved for experienced
    // lifters on stable accessory/isolation work when the load jump is too
    // large; the 3–5 partial-rep cue comes from the G.R.I.T. doctrine update
    // citing the 2026 IJES lengthened-partials study.
    const lengthenedPartialsEligible =
      experienceLevel !== 'beginner' &&
      prescription.role === 'Accessory' &&
      (profile.category === 'isolation' || profile.category === 'cable_accessory');
    if (lengthenedPartialsEligible) {
      return {
        ...base,
        nextWeight: lastPerf.weight,
        nextRepsMax: prescription.repsMax,
        action: 'LENGTHENED_PARTIALS',
        reason: `Hit the ${prescription.repsMax}-rep ceiling at ${lastPerf.weight} lb, but the next load jump is too large. Add 3–5 lengthened partials at the bottom of the final set instead of increasing load.`,
      };
    }

    const repsPastCeiling = lastPerf.maxReps - prescription.repsMax;
    if (repsPastCeiling < EQUIPMENT_LIMITED_REP_BUFFER) {
      const nextTarget = lastPerf.maxReps + 1;
      return {
        ...base,
        nextWeight: lastPerf.weight,
        nextRepsMax: nextTarget,
        action: 'HOLD',
        reason: `Smallest available increment would be a >${Math.round((profile.maxAcceptableEquipmentLimitedPct ?? 0.10) * 100)}% jump at ${lastPerf.weight} lb — holding load, extending reps instead. Aim for ${nextTarget} next session.`,
      };
    }
    const forced = roundToRealisticIncrement(prescription.equipment);
    const nextWeight = roundToIncrement(lastPerf.weight + forced, forced);
    return {
      ...base,
      nextWeight,
      nextRepsMax: effectiveRepsMin,
      loadIncrement: forced,
      action: 'ADVANCE_LOAD',
      reason: `Forced load increase — proportional gate exhausted after ${EQUIPMENT_LIMITED_REP_BUFFER}+ reps past ceiling. Add ${forced} lb → target ${effectiveRepsMin} reps at new load.`,
    };
  }

  // Round to the realistic plate/dumbbell granularity, not to `increment`
  // itself — increment can be a multiple of the granularity (e.g. 15 lb at
  // heavier weights), and rounding "weight + increment" to the nearest
  // *increment* step would drift the result to a value that isn't actually
  // weight + increment when weight isn't itself aligned to that step.
  const nextWeight = roundToIncrement(lastPerf.weight + increment, roundToRealisticIncrement(prescription.equipment));
  return {
    ...base,
    nextWeight,
    // ST-007: reset the rep target to the floor at the new load — double
    // progression restarts the climb, it doesn't ask for the old ceiling
    // again at a heavier weight.
    nextRepsMax: effectiveRepsMin,
    action: 'ADVANCE_LOAD',
    reason: progressionLabel === 'Linear progression'
      ? `Hit ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb). Linear progression: add ${increment} lb.`
      : `Hit ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb). Double progression: add ${increment} lb → target ${effectiveRepsMin} reps at new load.`,
  };
}

// ─── Beginner: Linear Progression ────────────────────────────────────────────
//
// Doctrine Section 1: Add load every session when reps complete the range
// with clean technique. Intensity proxy = bar speed (approximated here by
// rep-ceiling hit — no barSpeedDropped field available yet).
//
// HV-034: Stall threshold: 4 exposures (3 pairs) for beginners.

interface EvalInputs {
  lastPerf: Perf;
  stalls: number;
  stallThreshold: number;
  increment: number;
  equipmentLimited: boolean;
  effectiveRepsMin: number;
  effectiveRepsMax: number;
  base: Omit<ProgressionRecommendation, 'nextWeight' | 'action' | 'reason'>;
  isBodyweight: boolean;
  profile: ExerciseProgressionProfile;
  volumeRecentlyIncreased: boolean;
  // HV-032: true when the transition-adjustment penalty was severe enough
  // that load should hold even if the (already-lowered) ceiling is hit.
  holdLoad: boolean;
  effortAllowsLoad: boolean;
}

function evaluateBeginnerLinear(
  prescription: SlotPrescription,
  sessions: SessionPerformance[],
  ctx: ProgressionContext,
  { lastPerf, stalls, stallThreshold, increment, equipmentLimited, effectiveRepsMin, effectiveRepsMax, base, isBodyweight, profile, volumeRecentlyIncreased, holdLoad, effortAllowsLoad }: EvalInputs,
): ProgressionRecommendation {

  // Plateau detection — must deload before any load reduction (doctrine 1.2).
  // HV-034: gated off when volume recently increased — that session's rep
  // expectation is already handled by the HV-032 transition adjustment, and
  // an added set naturally producing lower reps isn't a plateau.
  if (stalls >= stallThreshold && !volumeRecentlyIncreased) {
    // HV-035: category-aware load reduction, same as the scheduled-deload
    // branch. HV-028: bodyweight has no load to reduce.
    const deloadWeight = deloadWeightFor(lastPerf.weight, isBodyweight, 0.225, prescription.equipment);
    return {
      ...base,
      nextWeight: deloadWeight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'PLATEAU_DELOAD',
      reason: isBodyweight
        ? `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Bodyweight held at ${lastPerf.weight} lb (no external load to reduce); fatigue masking is the most likely cause. Retest reps after deload.`
        : `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Deload first — load reduced 22.5% (${lastPerf.weight} → ${deloadWeight} lbs); fatigue masking is the most likely cause. Retest at the reduced load after deload.`,
      isPlateauWarning: true,
    };
  }

  // Below rep floor — hold or reduce.
  if (lastPerf.maxReps < effectiveRepsMin && (lastPerf.weight > 0 || isBodyweight)) {
    const prev = sessions.length >= 2 ? sessionPerf(sessions[1]) : null;
    const twoConsecutiveBelow =
      prev !== null &&
      prev.maxReps < effectiveRepsMin &&
      prev.weight === lastPerf.weight;

    if (twoConsecutiveBelow) {
      // HV-028: bodyweight has no load to reduce.
      const { weight: nextWeight, amount: reduction } = reducedWeightFor(lastPerf.weight, isBodyweight, profile, prescription.equipment);
      return {
        ...base,
        nextWeight,
        nextRepsMax: effectiveRepsMin,
        action: 'REDUCE_LOAD',
        reason: isBodyweight
          ? `Below rep floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. No external load to reduce — rebuild reps from the floor at bodyweight.`
          : `Below rep floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. Reducing by ${reduction} lb — rebuild from new base.`,
        isPlateauWarning: true,
      };
    }
    // ST-007: nudge toward the floor 1 rep at a time rather than restating the
    // full ceiling while still below the minimum.
    const nextTarget = nextRepTarget(lastPerf.maxReps, effectiveRepsMax);
    return {
      ...base,
      nextWeight: lastPerf.weight,
      nextRepsMax: nextTarget,
      action: 'HOLD',
      reason: `${lastPerf.maxReps} reps at ${lastPerf.weight} lb — below floor of ${effectiveRepsMin}. Aim for ${nextTarget} next session.`,
    };
  }

  // Rep ceiling hit with bar speed intact (approximated: reps ≥ ceiling).
  // Beginner: advance load every session per linear progression. HV-032: the
  // ceiling checked here is effectiveRepsMax (lowered this session if
  // volume just increased), not the template's raw repsMax, and load holds
  // when the transition penalty was severe enough (holdLoad).
  if (lastPerf.completedReps >= effectiveRepsMax && (lastPerf.weight > 0 || isBodyweight) && !holdLoad && effortAllowsLoad) {
    return resolveCeilingHit(prescription, lastPerf, effectiveRepsMin, profile, isBodyweight, increment, equipmentLimited, base, 'Linear progression', ctx.experienceLevel);
  }

  // Within rep band — rep progress is occurring. ST-007: target last session's
  // reps + 1 (capped at the ceiling) instead of restating the full ceiling.
  const prev = sessions.length >= 2 ? sessionPerf(sessions[1]) : null;
  const repProgress = prev !== null && lastPerf.maxReps > prev.maxReps;
  const nextTarget = nextRepTarget(lastPerf.maxReps, effectiveRepsMax);
  const heldByEffort = lastPerf.completedReps >= effectiveRepsMax && !effortAllowsLoad;
  const reason = heldByEffort
    ? effortHoldReason(lastPerf.maxReps, effectiveRepsMax, lastPerf.weight, prescription.rir)
    : repProgress
      ? `Reps progressed ${prev!.maxReps} → ${lastPerf.maxReps} at ${lastPerf.weight} lb. Aim for ${nextTarget} next session (ceiling ${effectiveRepsMax}).`
      : `${lastPerf.maxReps}/${effectiveRepsMax} reps at ${lastPerf.weight} lb. Aim for ${nextTarget} next session.`;

  return {
    ...base,
    nextWeight: lastPerf.weight,
    nextRepsMax: nextTarget,
    action: 'HOLD',
    reason,
  };
}

// ─── Intermediate + Advanced: Double Progression ──────────────────────────────
//
// Doctrine Sections 2–3:
//   - Accumulate reps within the target band at fixed load.
//   - When the rep ceiling is reached at the prescribed RIR, advance load.
//   - HV-034: Stall threshold: intermediate/advanced = 3 exposures (2 pairs) each.
//
// ST-013: when actual per-set RIR is available, every working set must meet
// the prescribed effort target before load advances. Legacy sessions without
// actual RIR retain the rep-based fallback.

function evaluateDoubleProgression(
  prescription: SlotPrescription,
  sessions: SessionPerformance[],
  ctx: ProgressionContext,
  { lastPerf, stalls, stallThreshold, increment, equipmentLimited, effectiveRepsMin, effectiveRepsMax, base, isBodyweight, profile, volumeRecentlyIncreased, holdLoad, effortAllowsLoad }: EvalInputs,
): ProgressionRecommendation {

  const prev = sessions.length >= 2 ? sessionPerf(sessions[1]) : null;

  // ── Stall threshold exceeded → PLATEAU_DELOAD ─────────────────────────────
  // Must deload before any load reduction (doctrine 2.2 Step 1 / 3.2 Step 1).
  // Post-deload retest determines whether it was fatigue masking or true
  // plateau. HV-034: gated off when volume recently increased.
  if (stalls >= stallThreshold && !volumeRecentlyIncreased) {
    const weeksSince = ctx.weeksSinceLastDeload;
    const fatigueLikely = weeksSince === undefined || weeksSince >= 3;
    // HV-035: category-aware load reduction, same as the scheduled-deload
    // branch — only for the fatigue-masking case, since that's the one whose
    // reason text already claims a "deload" (retest at load). The
    // true-plateau branch below has its own distinct 10%-reduction
    // recommendation, unchanged. HV-028: bodyweight has no load to reduce.
    const deloadWeight = deloadWeightFor(lastPerf.weight, isBodyweight, 0.225, prescription.equipment);
    return {
      ...base,
      nextWeight: fatigueLikely ? deloadWeight : lastPerf.weight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'PLATEAU_DELOAD',
      reason: fatigueLikely
        ? (isBodyweight
          ? `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Bodyweight held at ${lastPerf.weight} lb (no external load to reduce); fatigue masking is probable${weeksSince ? ` (${weeksSince} weeks since last deload)` : ''}. Retest reps after deload.`
          : `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Deload first — load reduced 22.5% (${lastPerf.weight} → ${deloadWeight} lbs); fatigue masking is probable${weeksSince ? ` (${weeksSince} weeks since last deload)` : ''}. Retest at the reduced load after deload.`)
        : `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps after a recent deload. This may be a true plateau — consider a 10% load reduction and rebuild.`,
      isPlateauWarning: true,
    };
  }

  // ── Below rep floor ───────────────────────────────────────────────────────
  if (lastPerf.maxReps < effectiveRepsMin && (lastPerf.weight > 0 || isBodyweight)) {
    const twoConsecutiveBelow =
      prev !== null &&
      prev.maxReps < effectiveRepsMin &&
      prev.weight === lastPerf.weight;

    if (twoConsecutiveBelow) {
      // HV-028: bodyweight has no load to reduce.
      const { weight: nextWeight, amount: reduction } = reducedWeightFor(lastPerf.weight, isBodyweight, profile, prescription.equipment);
      return {
        ...base,
        nextWeight,
        nextRepsMax: effectiveRepsMin,
        action: 'REDUCE_LOAD',
        reason: isBodyweight
          ? `Below floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. No external load to reduce — rebuild to ${effectiveRepsMin} reps at bodyweight before advancing.`
          : `Below floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. Reducing by ${reduction} lb — rebuild to ${effectiveRepsMin} reps before advancing.`,
        isPlateauWarning: true,
      };
    }
    // ST-007: nudge toward the floor 1 rep at a time rather than restating the
    // full ceiling while still below the minimum.
    const nextTarget = nextRepTarget(lastPerf.maxReps, effectiveRepsMax);
    return {
      ...base,
      nextWeight: lastPerf.weight,
      nextRepsMax: nextTarget,
      action: 'HOLD',
      reason: `${lastPerf.maxReps} reps at ${lastPerf.weight} lb — below floor of ${effectiveRepsMin}. Aim for ${nextTarget} next session.`,
    };
  }

  // ── Rep ceiling hit → ADVANCE_LOAD ───────────────────────────────────────
  // Double progression: advance load, reset to rep floor.
  // (Without reportedRir, ceiling hit alone is the gate — equivalent to doctrine's
  // "ceiling hit + RIR ≤ prescribedRir + 1" assumption.) HV-032: the ceiling
  // checked here is effectiveRepsMax, not the template's raw repsMax, and
  // load holds when the transition penalty was severe enough (holdLoad).
  if (lastPerf.completedReps >= effectiveRepsMax && (lastPerf.weight > 0 || isBodyweight) && !holdLoad && effortAllowsLoad) {
    return resolveCeilingHit(prescription, lastPerf, effectiveRepsMin, profile, isBodyweight, increment, equipmentLimited, base, 'Double progression', ctx.experienceLevel);
  }

  // ── Within rep band — normal hold ────────────────────────────────────────
  // ST-007: target last session's reps + 1 (capped at the ceiling) instead of
  // restating the full ceiling every week.
  const repProgress = prev !== null && lastPerf.maxReps > prev.maxReps;
  const nextTarget = nextRepTarget(lastPerf.maxReps, effectiveRepsMax);
  const heldByEffort = lastPerf.completedReps >= effectiveRepsMax && !effortAllowsLoad;
  const reason = heldByEffort
    ? effortHoldReason(lastPerf.maxReps, effectiveRepsMax, lastPerf.weight, prescription.rir)
    : repProgress
      ? `Reps progressed ${prev!.maxReps} → ${lastPerf.maxReps} at ${lastPerf.weight} lb. Aim for ${nextTarget} next session (ceiling ${effectiveRepsMax}).`
      : `${lastPerf.maxReps}/${effectiveRepsMax} reps at ${lastPerf.weight} lb. Aim for ${nextTarget} next session.`;

  return {
    ...base,
    nextWeight: lastPerf.weight,
    nextRepsMax: nextTarget,
    action: 'HOLD',
    reason,
  };
}
