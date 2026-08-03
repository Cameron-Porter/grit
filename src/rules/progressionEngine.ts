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
  // Increment used to compute the load change (for display: "Add 5 lb").
  // ST-010: always 5 — see getLoadIncrement.
  loadIncrement: number;
  // True for PLATEAU_DELOAD, DELOAD_NEEDED, REDUCE_LOAD — prompts UI warning.
  isPlateauWarning: boolean;
}

// ─── Load increment table (doctrine Section 1–3) ──────────────────────────────
//
// ST-010: Flat 5 lb increment, every role/experience/focus tier, no exceptions.
// A 2.5 lb micro-loading tier (and a finer 1.25 lb tier before it) existed
// here previously for isolation/accessory work and cut-phase halving. Both
// were removed per explicit user direction: fractional-plate increments
// (1.25 lb, 2.5 lb) aren't reliably available on gym equipment, so the extra
// granularity produced targets that couldn't actually be loaded. 5 lb is now
// a hard floor and ceiling for every case — this is a deliberate constraint,
// not a gap to fill back in with a new fractional tier. Do not reintroduce
// sub-5-lb increments here under any circumstance.

export function getLoadIncrement(
  _exerciseType: ExerciseType = 'barbell-compound',
  _role: SlotRole = 'Primary',
  _experienceLevel: ExperienceLevel = 'intermediate',
  _programFocus?: ProgramFocus,
): number {
  return 5;
}

// ─── Rounding helpers ─────────────────────────────────────────────────────────

// Round to the nearest valid increment. ST-010: increment is always 5 in
// practice, but this stays general so callers can round to other steps
// (e.g. deload-week displayed weights) without a second helper.
export function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
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
  // MRV-capped. Every other focus keeps the original per-exercise doctrine:
  //   emphasize → add 1 set per week above base (volume accumulation)
  //   grow      → hold at template value
  //   maintain  → never exceed template value
  //
  // VA-014: the emphasize ramp step itself is gated by this session's reported
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
  const rampWeek = ctx.soreness === 'Not sore' ? ctx.mesoWeek + 1
    : ctx.soreness === 'Just in time' ? ctx.mesoWeek - 1
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
  const effectiveSets = stillSore ? Math.max(baseSetCount, rawEffectiveSets - 1) : rawEffectiveSets;

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
    const trainingWeeks = ctx.totalMesoWeeks - 1; // last week is deload
    const weeksRemaining = trainingWeeks - ctx.mesoWeek; // 0 on final training week
    const taperFloor = ctx.experienceLevel === 'beginner' ? 2 : 0;
    base.nextRir = Math.max(taperFloor, base.nextRir - weeksRemaining);
  }

  // HV-019: Hard RIR floor for deadlift-pattern exercises.
  // Applied after the taper so the floor wins over any taper reduction.
  if (prescription.hardRirFloor !== undefined) {
    base.nextRir = Math.max(base.nextRir, prescription.hardRirFloor);
  }

  // ── Priority 1: Deload week — protocol varies by focus ────────────────────
  if (ctx.isDeload) {
    const lastWeight = sessions.length > 0 ? sessionPerf(sessions[0]).weight : 0;
    // HV-025: flat 50% load reduction for the whole deload week — applies to
    // every focus, not just strength (ST-004 below). Previously the
    // hypertrophy/powerbuilding branch held nextWeight unchanged and only cut
    // volume, but Hypertrophy Made Simple's own deload protocol also calls
    // for reduced load (80-100% first half / 50% second half of the week for
    // full deloads; half weight for single-muscle "recovery sessions") — a
    // deload that never reduces load under-recovers exactly the way ST-004
    // already fixed for strength. Same whole-week-granularity simplification
    // as ST-004: a flat 50% instead of RP's two-stage split, since this app's
    // progression model operates at whole-week granularity, not half-weeks.
    // Source: RP Strength "Hypertrophy Made Simple" (2023).
    const deloadWeight = Math.max(roundToIncrement(lastWeight * 0.5, increment), increment);
    if (isStrength) {
      // ST-004: Strength deload — reduce load 50%, hold reps and sets.
      // Unlike hypertrophy deloads (halve volume, hold load), strength deloads
      // must preserve neuromuscular coordination. Cutting sets on heavy compound
      // movements degrades motor patterns built over the meso. A load drop
      // with full rep/set maintenance keeps the pattern intact while reducing
      // systemic fatigue. Source: RP Strength "Strength Training Made Simple"
      // (2023) — deload week protocol (50% of last week's weight, same sets
      // and reps). RP's own guide actually splits this across the week (70%
      // first half, 50% second half); we use a flat 50% since this app's
      // progression model operates at whole-week granularity, not half-weeks.
      return {
        ...base,
        nextWeight: deloadWeight,
        nextSets: baseSetCount,
        nextRir: Math.max(3, prescription.rir),
        action: 'DELOAD',
        reason: `Strength deload — load reduced to 50% (${lastWeight} → ${deloadWeight} lbs), reps and sets maintained to preserve neuromuscular coordination.`,
      };
    }
    // PB-004: Powerbuilding deload uses the hypertrophy protocol (halve volume,
    // now also halve load per HV-025, cap effort at RIR 4). PHAT and Kizen both
    // distribute CNS fatigue across power and hypertrophy days throughout the
    // meso, so accumulated load is lower than pure strength, but recovery still
    // benefits from a reduced load, not volume cuts alone. Source: Kizen Week 9
    // deload structure.
    //
    // HV-021: hypertrophy focus with a resolved landmark target deloads sets to
    // that muscle's own MV (Maintenance Volume) instead of a flat 50% — see
    // ProgressionContext.hypertrophyVolumeOverride. Load reduction (HV-025)
    // still applies uniformly regardless of which set-count path is used.
    const hasVolumeOverride = ctx.programFocus === 'hypertrophy' && !!ctx.hypertrophyVolumeOverride;
    const deloadSets = hasVolumeOverride
      ? ctx.hypertrophyVolumeOverride!.deloadSets
      : Math.max(1, Math.ceil(baseSetCount * 0.5));
    return {
      ...base,
      nextWeight: deloadWeight,
      nextSets: deloadSets,
      nextRepsMin: Math.max(1, Math.ceil(effectiveRepsMin * 0.5)),
      nextRepsMax: Math.max(1, Math.ceil(prescription.repsMax * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'DELOAD',
      reason: hasVolumeOverride
        ? `Deload week — sets dropped to Maintenance Volume, reps halved, load reduced to 50% (${lastWeight} → ${deloadWeight} lbs), effort capped at RIR 4.`
        : `Deload week — sets and reps halved, load reduced to 50% (${lastWeight} → ${deloadWeight} lbs), effort capped at RIR 4.`,
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
    // HV-025: same flat 50% load reduction as the scheduled-deload branch
    // above — an immediate deload triggered by accumulated fatigue needs the
    // same load relief a scheduled one gets; holding weight unchanged here
    // while cutting sets only addresses volume, not the load driving the
    // fatigue.
    const deloadWeight = Math.max(roundToIncrement(lastPerf.weight * 0.5, increment), increment);
    return {
      ...base,
      nextWeight: deloadWeight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'DELOAD_NEEDED',
      reason: `${badSessions} consecutive sessions with fewer reps than the session before. Deload now — load reduced to 50% (${lastPerf.weight} → ${deloadWeight} lbs); this is accumulated fatigue, not a plateau.`,
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
    // HV-025: same flat 50% load reduction as the scheduled-deload branch.
    const deloadWeight = Math.max(roundToIncrement(lastPerf.weight * 0.5, increment), increment);
    return {
      ...base,
      nextWeight: deloadWeight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'PLATEAU_DELOAD',
      reason: `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Deload first — load reduced to 50% (${lastPerf.weight} → ${deloadWeight} lbs); fatigue masking is the most likely cause. Retest at the reduced load after deload.`,
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
        nextRepsMax: effectiveRepsMin,
        action: 'REDUCE_LOAD',
        reason: `Below rep floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. Reducing by ${increment} lb — rebuild from new base.`,
        isPlateauWarning: true,
      };
    }
    // ST-007: nudge toward the floor 1 rep at a time rather than restating the
    // full ceiling while still below the minimum.
    const nextTarget = nextRepTarget(lastPerf.maxReps, prescription.repsMax);
    return {
      ...base,
      nextWeight: lastPerf.weight,
      nextRepsMax: nextTarget,
      action: 'HOLD',
      reason: `${lastPerf.maxReps} reps at ${lastPerf.weight} lb — below floor of ${effectiveRepsMin}. Aim for ${nextTarget} next session.`,
    };
  }

  // Rep ceiling hit with bar speed intact (approximated: reps ≥ ceiling).
  // Beginner: advance load every session per linear progression.
  if (lastPerf.maxReps >= prescription.repsMax && lastPerf.weight > 0) {
    const nextWeight = roundToIncrement(lastPerf.weight + increment, increment);
    return {
      ...base,
      nextWeight,
      // ST-007: reset the rep target to the floor at the new load — double
      // progression restarts the climb, it doesn't ask for the old ceiling
      // again at a heavier weight.
      nextRepsMax: effectiveRepsMin,
      action: 'ADVANCE_LOAD',
      reason: `Hit ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb). Linear progression: add ${increment} lb.`,
    };
  }

  // Within rep band — rep progress is occurring. ST-007: target last session's
  // reps + 1 (capped at the ceiling) instead of restating the full ceiling.
  const prev = sessions.length >= 2 ? sessionPerf(sessions[1]) : null;
  const repProgress = prev !== null && lastPerf.maxReps > prev.maxReps;
  const nextTarget = nextRepTarget(lastPerf.maxReps, prescription.repsMax);
  const reason = repProgress
    ? `Reps progressed ${prev!.maxReps} → ${lastPerf.maxReps} at ${lastPerf.weight} lb. Aim for ${nextTarget} next session (ceiling ${prescription.repsMax}).`
    : `${lastPerf.maxReps}/${prescription.repsMax} reps at ${lastPerf.weight} lb. Aim for ${nextTarget} next session.`;

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
    // HV-025: same flat 50% load reduction as the scheduled-deload branch —
    // only for the fatigue-masking case, since that's the one whose reason
    // text already claimed a "deload" (retest at load). The true-plateau
    // branch below has its own distinct 10%-reduction recommendation, which
    // is out of scope for this fix — it's advisory text pending a "true
    // plateau" retest flow that isn't implemented yet, not the deload-week
    // protocol HV-025 addresses.
    const deloadWeight = Math.max(roundToIncrement(lastPerf.weight * 0.5, increment), increment);
    return {
      ...base,
      nextWeight: fatigueLikely ? deloadWeight : lastPerf.weight,
      nextSets: Math.max(1, Math.ceil(prescription.sets * 0.5)),
      nextRir: Math.max(4, prescription.rir),
      action: 'PLATEAU_DELOAD',
      reason: fatigueLikely
        ? `${stalls + 1} sessions unchanged at ${lastPerf.weight} lb × ${lastPerf.maxReps} reps. Deload first — load reduced to 50% (${lastPerf.weight} → ${deloadWeight} lbs); fatigue masking is probable${weeksSince ? ` (${weeksSince} weeks since last deload)` : ''}. Retest at the reduced load after deload.`
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
        nextRepsMax: effectiveRepsMin,
        action: 'REDUCE_LOAD',
        reason: `Below floor (${lastPerf.maxReps} reps) for 2 sessions at ${lastPerf.weight} lb. Reducing by ${increment} lb — rebuild to ${effectiveRepsMin} reps before advancing.`,
        isPlateauWarning: true,
      };
    }
    // ST-007: nudge toward the floor 1 rep at a time rather than restating the
    // full ceiling while still below the minimum.
    const nextTarget = nextRepTarget(lastPerf.maxReps, prescription.repsMax);
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
  // "ceiling hit + RIR ≤ prescribedRir + 1" assumption.)
  if (lastPerf.maxReps >= prescription.repsMax && lastPerf.weight > 0) {
    const nextWeight = roundToIncrement(lastPerf.weight + increment, increment);
    return {
      ...base,
      nextWeight,
      // ST-007: reset the rep target to the floor at the new load — double
      // progression restarts the climb, it doesn't ask for the old ceiling
      // again at a heavier weight.
      nextRepsMax: effectiveRepsMin,
      action: 'ADVANCE_LOAD',
      reason: `Hit ceiling (${lastPerf.maxReps} reps × ${lastPerf.weight} lb). Double progression: add ${increment} lb → target ${effectiveRepsMin} reps at new load.`,
    };
  }

  // ── Within rep band — normal hold ────────────────────────────────────────
  // ST-007: target last session's reps + 1 (capped at the ceiling) instead of
  // restating the full ceiling every week.
  const repProgress = prev !== null && lastPerf.maxReps > prev.maxReps;
  const nextTarget = nextRepTarget(lastPerf.maxReps, prescription.repsMax);
  const reason = repProgress
    ? `Reps progressed ${prev!.maxReps} → ${lastPerf.maxReps} at ${lastPerf.weight} lb. Aim for ${nextTarget} next session (ceiling ${prescription.repsMax}).`
    : `${lastPerf.maxReps}/${prescription.repsMax} reps at ${lastPerf.weight} lb. Aim for ${nextTarget} next session.`;

  return {
    ...base,
    nextWeight: lastPerf.weight,
    nextRepsMax: nextTarget,
    action: 'HOLD',
    reason,
  };
}
