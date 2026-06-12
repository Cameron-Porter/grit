import type { ExerciseType, ExperienceLevel, SlotRole } from '../types/program';

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
}

// One completed session for a single exercise.
// Only working sets — warm-up sets must be excluded before passing to this engine.
// Sorted newest-first at call site.
export interface SessionPerformance {
  date: string;
  sets: { weight: number; reps: number }[];
}

export type ProgramFocus = 'hypertrophy' | 'strength' | 'powerbuilding' | 'general' | 'maintenance';
export type MusclePriority = 'emphasize' | 'grow' | 'maintain';

export interface ProgressionContext {
  experienceLevel: ExperienceLevel;
  isDeload: boolean;
  mesoWeek: number;
  totalMesoWeeks: number;
  trainingPhase?: 'bulk' | 'cut' | 'maintenance';
  // Weeks elapsed since the last completed deload.
  // Used to gate "fatigue masking" vs "true plateau" disambiguation.
  weeksSinceLastDeload?: number;
  // Program-level goal — drives deload protocol, load increment, and maintenance behavior.
  programFocus?: ProgramFocus;
  // Per-muscle volume priority — drives RIR taper within the meso.
  musclePriority?: MusclePriority;
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
// CUT_HOLD          — fat-loss phase: maintain current performance, no auto-increment
export type ProgressionAction =
  | 'FIRST_SESSION'
  | 'DELOAD'
  | 'ADVANCE_LOAD'
  | 'HOLD'
  | 'REDUCE_LOAD'
  | 'PLATEAU_DELOAD'
  | 'DELOAD_NEEDED'
  | 'CUT_HOLD';

export interface ProgressionRecommendation {
  nextWeight: number;
  nextSets: number;
  nextRepsMin: number;
  nextRepsMax: number;
  nextRir: number;
  action: ProgressionAction;
  reason: string;
  // Increment used to compute the load change (for display: "Add 1.25 lb").
  loadIncrement: number;
  // True for PLATEAU_DELOAD, DELOAD_NEEDED, REDUCE_LOAD — prompts UI warning.
  isPlateauWarning: boolean;
}

// ─── Load increment table (doctrine Section 1–3) ──────────────────────────────
//
// Beginner  : +5 lbs everywhere (neural adaptation phase)
// Intermediate: +5 lbs compound; +2.5 lbs accessory isolation
// Advanced  : +5 lbs compound; +2.5 lbs secondary isolation; +1.25 lbs accessory
//
// Micro-loading (1.25 / 2.5 lbs) applies to isolation-class exercises where
// standard 5 lb jumps would exceed the productive weekly adaptation rate.

function isIsolationClass(exerciseType: ExerciseType): boolean {
  return exerciseType === 'isolation' || exerciseType === 'core';
}

export function getLoadIncrement(
  exerciseType: ExerciseType = 'barbell-compound',
  role: SlotRole = 'Primary',
  experienceLevel: ExperienceLevel = 'intermediate',
  programFocus?: ProgramFocus,
): number {
  // Strength focus: compounds always get full 5 lb jumps regardless of role.
  // Doctrine: heavier loading drives neuromuscular adaptation; micro-loading only for isolation accessories.
  if (programFocus === 'strength') {
    if (isIsolationClass(exerciseType) && role === 'Accessory') return 2.5;
    return 5;
  }
  if (experienceLevel === 'beginner') return 5;
  if (experienceLevel === 'intermediate') {
    return role === 'Accessory' ? 2.5 : 5;
  }
  // Advanced: micro-loading for secondary + accessory isolation work
  if (role === 'Accessory') return 1.25;
  if (role === 'Secondary' && isIsolationClass(exerciseType)) return 2.5;
  return 5;
}

// ─── Rounding helpers ─────────────────────────────────────────────────────────

// Round to the nearest valid increment (supports 1.25, 2.5, 5, or any step).
export function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

// ─── Session analysis helpers ─────────────────────────────────────────────────

// Working weight = highest weight completed in the session.
function workingWeight(session: SessionPerformance): number {
  if (!session.sets.length) return 0;
  return Math.max(...session.sets.map((s) => s.weight));
}

// Peak reps completed at the working weight.
function peakRepsAtWorkingWeight(session: SessionPerformance): number {
  const ww = workingWeight(session);
  if (ww === 0) return 0;
  const atWW = session.sets.filter((s) => s.weight === ww);
  return atWW.length > 0 ? Math.max(...atWW.map((s) => s.reps)) : 0;
}

interface Perf { weight: number; maxReps: number }

function sessionPerf(session: SessionPerformance): Perf {
  return { weight: workingWeight(session), maxReps: peakRepsAtWorkingWeight(session) };
}

// Count identical consecutive *pairs* (sessions[i] == sessions[i+1]) from the
// most-recent session inward.
//
// Stall thresholds (doctrine 5.3):
//   Beginner    : 3 consecutive sessions = 2 pairs
//   Intermediate: 3 consecutive weeks    = 2 pairs
//   Advanced    : 2 consecutive weeks    = 1 pair
//
// This function returns the number of pairs, so compare >= stallThreshold(level).
function countConsecutiveStalls(sessions: SessionPerformance[]): number {
  if (sessions.length < 2) return 0;
  let count = 0;
  for (let i = 0; i < sessions.length - 1; i++) {
    const a = sessionPerf(sessions[i]);
    const b = sessionPerf(sessions[i + 1]);
    if (a.weight === b.weight && a.maxReps === b.maxReps) {
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

// ─── Main engine ──────────────────────────────────────────────────────────────
//
// sessions must be sorted newest-first (index 0 = most recent session).
// sessions must contain only completed working sets — no warm-ups, no skipped sets.
//
// Decision priority (doctrine Section 4.1):
//   1. DELOAD_ACTIVE (isDeload week) — no progression decisions
//   2. FIRST_SESSION (no history) — starter defaults
//   3. BAD_SESSION threshold → DELOAD_NEEDED
//   4. Experience-level dispatch (beginner linear / intermediate+advanced double)
//   5. Plateau resolution

export function recommendProgression(
  prescription: SlotPrescription,
  sessions: SessionPerformance[],
  ctx: ProgressionContext,
): ProgressionRecommendation {

  const role: SlotRole = prescription.role ?? 'Primary';
  const exerciseType: ExerciseType = prescription.exerciseType ?? 'barbell-compound';
  const increment = getLoadIncrement(exerciseType, role, ctx.experienceLevel, ctx.programFocus);

  const isCut = ctx.trainingPhase === 'cut';
  const isMaintenance = ctx.programFocus === 'maintenance';
  const isStrength = ctx.programFocus === 'strength';

  // Set-count progression within meso:
  //   emphasize → add 1 set per week above base (volume accumulation)
  //   grow      → hold at template value
  //   maintain  → never exceed template value
  const baseSetCount = prescription.sets;
  const weekBonus = ctx.musclePriority === 'emphasize' ? Math.max(0, ctx.mesoWeek - 1) : 0;
  const effectiveSets = ctx.musclePriority === 'maintain'
    ? baseSetCount
    : baseSetCount + weekBonus;

  // During a cut, raise the rep floor to 8 to reduce injury risk from heavy loading.
  const effectiveRepsMin = isCut
    ? Math.max(prescription.repsMin, 8)
    : prescription.repsMin;

  // Stall threshold: how many identical consecutive pairs trigger a plateau.
  //   Beginner    : 3 sessions = 2 pairs
  //   Intermediate: 3 sessions = 2 pairs
  //   Advanced    : 2 sessions = 1 pair  (accommodation arrives faster)
  const stallThreshold = ctx.experienceLevel === 'advanced' ? 1 : 2;

  // Bad session threshold: how many consecutive regressions trigger an early deload.
  //   Cut phase raises this to 3 — deficits cause 1–2 natural bad sessions.
  const badSessionThreshold = isCut ? 3 : 2;

  const base = {
    nextSets: effectiveSets,
    nextRepsMin: effectiveRepsMin,
    nextRepsMax: prescription.repsMax,
    nextRir: prescription.rir,
    loadIncrement: increment,
    isPlateauWarning: false,
  };

  // HV-001: Intra-mesocycle RIR taper for intermediate/advanced non-deload weeks.
  // Applied to emphasize/grow muscles: RIR drops by weeks remaining so effort
  // peaks on the final training week (weeksRemaining = 0).
  // Deload overrides nextRir further below so this only affects working weeks.
  if (
    !ctx.isDeload &&
    ctx.experienceLevel !== 'beginner' &&
    (ctx.musclePriority === 'emphasize' || ctx.musclePriority === 'grow') &&
    ctx.mesoWeek !== undefined &&
    ctx.totalMesoWeeks !== undefined
  ) {
    const trainingWeeks = ctx.totalMesoWeeks - 1; // last week is deload
    const weeksRemaining = trainingWeeks - ctx.mesoWeek; // 0 on final training week
    base.nextRir = Math.max(0, base.nextRir - weeksRemaining);
  }

  // HV-019: Hard RIR floor for deadlift-pattern exercises.
  // Applied after the taper so the floor wins over any taper reduction.
  if (prescription.hardRirFloor !== undefined) {
    base.nextRir = Math.max(base.nextRir, prescription.hardRirFloor);
  }

  // ── Priority 1: Deload week — protocol varies by focus ────────────────────
  if (ctx.isDeload) {
    const lastWeight = sessions.length > 0 ? sessionPerf(sessions[0]).weight : 0;
    if (isStrength) {
      // Strength deload doctrine: maintain reps, reduce load 10%, keep neuromuscular coordination.
      // Full volume cuts degrade motor patterns; active deloads are mandatory.
      const deloadWeight = Math.max(roundToIncrement(lastWeight * 0.9, increment), increment);
      return {
        ...base,
        nextWeight: deloadWeight,
        nextSets: baseSetCount,
        nextRir: Math.max(3, prescription.rir),
        action: 'DELOAD',
        reason: `Strength deload — load reduced 10% (${lastWeight} → ${deloadWeight} lbs), reps and sets maintained to preserve neuromuscular coordination.`,
      };
    }
    // Hypertrophy / powerbuilding / general: halve volume, hold load, cap effort.
    return {
      ...base,
      nextWeight: lastWeight,
      nextSets: Math.max(1, Math.ceil(baseSetCount * 0.5)),
      nextRepsMin: Math.max(1, Math.ceil(effectiveRepsMin * 0.5)),
      nextRepsMax: Math.max(1, Math.ceil(prescription.repsMax * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'DELOAD',
      reason: 'Deload week — sets and reps halved, load held, effort capped at RIR 4.',
    };
  }

  // ── Priority 2a: Maintenance focus — hold performance, no auto-increment ──
  // Equivalent to fat-loss hold: maintaining is the success criterion.
  if (isMaintenance) {
    const lastWeight = sessions.length > 0 ? sessionPerf(sessions[0]).weight : 0;
    const lastReps = sessions.length > 0 ? sessionPerf(sessions[0]).maxReps : 0;
    return {
      ...base,
      nextWeight: lastWeight,
      nextSets: baseSetCount,
      action: 'CUT_HOLD',
      reason: `Maintenance focus — holding ${lastReps} reps × ${lastWeight} lbs. No auto-increment; maintaining muscle is the goal.`,
    };
  }

  // ── Priority 2: First session — no history ────────────────────────────────
  if (sessions.length === 0) {
    return {
      ...base,
      nextWeight: 0,
      action: 'FIRST_SESSION',
      reason: 'First session — enter your starting weight.',
    };
  }

  const last = sessions[0];
  const lastPerf = sessionPerf(last);
  const stalls = countConsecutiveStalls(sessions);
  const badSessions = countConsecutiveBadSessions(sessions);

  // ── Priority 3: Consecutive bad sessions → immediate deload ───────────────
  // Doctrine 2.3 Trigger 2 / 3.3 Trigger 2: ≥2 consecutive bad sessions
  // means accumulated fatigue or overreaching; deload before any load change.
  if (badSessions >= badSessionThreshold) {
    return {
      ...base,
      nextWeight: lastPerf.weight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'DELOAD_NEEDED',
      reason: `${badSessions} consecutive sessions with fewer reps than the session before. Deload now — this is accumulated fatigue, not a plateau.`,
      isPlateauWarning: true,
    };
  }

  // ── Priority 4: Fat-loss hold ─────────────────────────────────────────────
  // During a cut, auto-increment is disabled (doctrine 4.4).
  // Maintaining current performance is the success criterion.
  // A load increase is still surfaced if the user organically hit the ceiling,
  // but as CUT_HOLD (informational) rather than the automatic ADVANCE_LOAD.
  if (isCut) {
    const ceilingHit = lastPerf.maxReps >= prescription.repsMax && lastPerf.weight > 0;
    return {
      ...base,
      nextWeight: lastPerf.weight,
      action: 'CUT_HOLD',
      reason: ceilingHit
        ? `Hit rep ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb) during fat-loss phase. Load increase available but not required — maintaining is success.`
        : `Fat-loss phase — maintaining ${lastPerf.maxReps} reps × ${lastPerf.weight} lb is the target. Load auto-advance is paused.`,
    };
  }

  // ── Priority 5: Experience-level dispatch ─────────────────────────────────

  if (ctx.experienceLevel === 'beginner') {
    return evaluateBeginnerLinear(prescription, sessions, ctx, {
      lastPerf, stalls, stallThreshold, increment, effectiveRepsMin, base,
    });
  }

  return evaluateDoubleProgression(prescription, sessions, ctx, {
    lastPerf, stalls, stallThreshold, increment, effectiveRepsMin, base,
  });
}

// ─── Beginner: Linear Progression ────────────────────────────────────────────
//
// Doctrine Section 1: Add load every session when reps complete the range
// with clean technique. Intensity proxy = bar speed (approximated here by
// rep-ceiling hit — no barSpeedDropped field available yet).
//
// Stall threshold: 3 sessions (2 pairs).

interface EvalInputs {
  lastPerf: Perf;
  stalls: number;
  stallThreshold: number;
  increment: number;
  effectiveRepsMin: number;
  base: Omit<ProgressionRecommendation, 'nextWeight' | 'action' | 'reason'>;
}

function evaluateBeginnerLinear(
  prescription: SlotPrescription,
  sessions: SessionPerformance[],
  ctx: ProgressionContext,
  { lastPerf, stalls, stallThreshold, increment, effectiveRepsMin, base }: EvalInputs,
): ProgressionRecommendation {

  // Plateau detection — must deload before any load reduction (doctrine 1.2).
  if (stalls >= stallThreshold) {
    return {
      ...base,
      nextWeight: lastPerf.weight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'PLATEAU_DELOAD',
      reason: `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Deload first — fatigue masking is the most likely cause. Retest at same load after deload.`,
      isPlateauWarning: true,
    };
  }

  // Below rep floor — hold or reduce.
  if (lastPerf.maxReps < effectiveRepsMin && lastPerf.weight > 0) {
    const prev = sessions.length >= 2 ? sessionPerf(sessions[1]) : null;
    const twoConsecutiveBelow =
      prev !== null &&
      prev.maxReps < effectiveRepsMin &&
      prev.weight === lastPerf.weight;

    if (twoConsecutiveBelow) {
      const nextWeight = Math.max(roundToIncrement(lastPerf.weight - increment, increment), increment);
      return {
        ...base,
        nextWeight,
        action: 'REDUCE_LOAD',
        reason: `Below rep floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. Reducing by ${increment} lb — rebuild from new base.`,
        isPlateauWarning: true,
      };
    }
    return {
      ...base,
      nextWeight: lastPerf.weight,
      action: 'HOLD',
      reason: `${lastPerf.maxReps} reps at ${lastPerf.weight} lb — below floor of ${effectiveRepsMin}. Hold load; build to ${effectiveRepsMin}+ reps.`,
    };
  }

  // Rep ceiling hit with bar speed intact (approximated: reps ≥ ceiling).
  // Beginner: advance load every session per linear progression.
  if (lastPerf.maxReps >= prescription.repsMax && lastPerf.weight > 0) {
    const nextWeight = roundToIncrement(lastPerf.weight + increment, increment);
    return {
      ...base,
      nextWeight,
      action: 'ADVANCE_LOAD',
      reason: `Hit ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb). Linear progression: add ${increment} lb.`,
    };
  }

  // Within rep band — rep progress is occurring.
  const prev = sessions.length >= 2 ? sessionPerf(sessions[1]) : null;
  const repProgress = prev !== null && lastPerf.maxReps > prev.maxReps;
  const reason = repProgress
    ? `Reps progressed ${prev!.maxReps} → ${lastPerf.maxReps} at ${lastPerf.weight} lb. Building toward ceiling (${prescription.repsMax}).`
    : `${lastPerf.maxReps}/${prescription.repsMax} reps at ${lastPerf.weight} lb. Continue.`;

  return {
    ...base,
    nextWeight: lastPerf.weight,
    action: 'HOLD',
    reason,
  };
}

// ─── Intermediate + Advanced: Double Progression ──────────────────────────────
//
// Doctrine Sections 2–3:
//   - Accumulate reps within the target band at fixed load.
//   - When the rep ceiling is reached at the prescribed RIR, advance load.
//   - Stall threshold: intermediate = 3 sessions (2 pairs), advanced = 2 (1 pair).
//
// NOTE: RIR validation (reportedRir vs prescribedRir) requires a reportedRir field
// that is not yet logged per-set. The ceiling-hit check is used as the sole
// advance-load gate until reportedRir is added to the session log schema.

function evaluateDoubleProgression(
  prescription: SlotPrescription,
  sessions: SessionPerformance[],
  ctx: ProgressionContext,
  { lastPerf, stalls, stallThreshold, increment, effectiveRepsMin, base }: EvalInputs,
): ProgressionRecommendation {

  const prev = sessions.length >= 2 ? sessionPerf(sessions[1]) : null;

  // ── Stall threshold exceeded → PLATEAU_DELOAD ─────────────────────────────
  // Must deload before any load reduction (doctrine 2.2 Step 1 / 3.2 Step 1).
  // Post-deload retest determines whether it was fatigue masking or true plateau.
  if (stalls >= stallThreshold) {
    const weeksSince = ctx.weeksSinceLastDeload;
    const fatigueLikely = weeksSince === undefined || weeksSince >= 3;
    return {
      ...base,
      nextWeight: lastPerf.weight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'PLATEAU_DELOAD',
      reason: fatigueLikely
        ? `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Deload first — fatigue masking is probable${weeksSince ? ` (${weeksSince} weeks since last deload)` : ''}. Retest at same load after deload.`
        : `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps after a recent deload. This may be a true plateau — consider a 10% load reduction and rebuild.`,
      isPlateauWarning: true,
    };
  }

  // ── Below rep floor ───────────────────────────────────────────────────────
  if (lastPerf.maxReps < effectiveRepsMin && lastPerf.weight > 0) {
    const twoConsecutiveBelow =
      prev !== null &&
      prev.maxReps < effectiveRepsMin &&
      prev.weight === lastPerf.weight;

    if (twoConsecutiveBelow) {
      const nextWeight = Math.max(roundToIncrement(lastPerf.weight - increment, increment), increment);
      return {
        ...base,
        nextWeight,
        action: 'REDUCE_LOAD',
        reason: `Below floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. Reducing by ${increment} lb — rebuild to ${effectiveRepsMin} reps before advancing.`,
        isPlateauWarning: true,
      };
    }
    return {
      ...base,
      nextWeight: lastPerf.weight,
      action: 'HOLD',
      reason: `${lastPerf.maxReps} reps at ${lastPerf.weight} lb — below floor of ${effectiveRepsMin}. Hold load; accumulate reps.`,
    };
  }

  // ── Rep ceiling hit → ADVANCE_LOAD ───────────────────────────────────────
  // Double progression: advance load, reset to rep floor.
  // (Without reportedRir, ceiling hit alone is the gate — equivalent to doctrine's
  // "ceiling hit + RIR ≤ prescribedRir + 1" assumption.)
  if (lastPerf.maxReps >= prescription.repsMax && lastPerf.weight > 0) {
    const nextWeight = roundToIncrement(lastPerf.weight + increment, increment);
    return {
      ...base,
      nextWeight,
      action: 'ADVANCE_LOAD',
      reason: `Hit ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb). Double progression: add ${increment} lb → target ${effectiveRepsMin} reps at new load.`,
    };
  }

  // ── Within rep band — normal hold ────────────────────────────────────────
  const repProgress = prev !== null && lastPerf.maxReps > prev.maxReps;
  const reason = repProgress
    ? `Reps progressed ${prev!.maxReps} → ${lastPerf.maxReps} at ${lastPerf.weight} lb. Building toward ceiling (${prescription.repsMax}).`
    : `${lastPerf.maxReps}/${prescription.repsMax} reps at ${lastPerf.weight} lb. Continue.`;

  return {
    ...base,
    nextWeight: lastPerf.weight,
    action: 'HOLD',
    reason,
  };
}
