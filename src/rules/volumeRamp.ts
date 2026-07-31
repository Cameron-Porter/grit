import type { WeekParams } from '../types/program';

export interface SetAnchors {
  week1: number;
  peak: number;
  deload: number;
}

// HV-021: one shared ramp shape for how weekly sets move across a mesocycle —
// used both when a program is first generated (slotBuilder.ts) and when
// computing week-to-week progression for an already-running program
// (progressionEngine.ts / src/api/progression.ts), so the two paths can't
// silently diverge into two different volume philosophies.
//
// Training weeks: linear interpolation from the Week 1 anchor to the peak
// anchor across the meso. Deload: drops to a separate deload anchor
// regardless of position — deload is a distinct target (MV), not a
// percentage of wherever the ramp happened to be.
export function rampSets(anchors: SetAnchors, params: WeekParams): number {
  if (params.isDeload) {
    return Math.max(1, Math.round(anchors.deload));
  }

  const { weekNumber, totalTrainingWeeks } = params;
  const progressFraction = totalTrainingWeeks <= 1
    ? 1.0
    : (weekNumber - 1) / (totalTrainingWeeks - 1);

  return Math.max(1, Math.round(anchors.week1 + (anchors.peak - anchors.week1) * progressFraction));
}

// HV-023: hard ceiling on sets prescribed to a single exercise in one
// session, regardless of how high a muscle's landmark-driven per-session
// target climbs. A muscle's own weekly MEV->MAV/MRV ramp is uncapped by
// design (that's the point of HV-021), but when a muscle has only one
// exercise in a given session, its entire per-session share concentrates
// onto that one movement — and past a handful of sets on a single exercise,
// sets stop landing close enough to true failure to carry real stimulus and
// just add fatigue instead (junk volume). This caps the final per-exercise
// number after any role/exercise-share split (see callers in slotBuilder.ts
// and src/api/progression.ts) — it's still the muscle's per-session target
// that ramps freely; a second exercise for the same muscle that session can
// absorb whatever this one doesn't.
// Source: RP Strength "Hypertrophy Made Simple" (2023) — per-session set
// counts by training age ("Beginner: can often be 1-5 sets per session...
// Intermediate: 2-10... Advanced: 3-12"). Those ranges are a muscle's whole
// session total, which can span more than one exercise — 5 is set at the low
// end of even the Advanced range so a single movement can never silently
// absorb an entire muscle's session allotment on its own, regardless of
// experience level. NOTE: the Strength Made Simple guide's "2-5 sets per
// movement type per session" line was used for this constant previously —
// that guide is scoped to the `strength` focus only (see ST-009 in
// sessionTrimmer.ts) and should not be cited for hypertrophy-focus doctrine
// like this one.
export const MAX_SETS_PER_EXERCISE = 5;

export function capSetsPerExercise(sets: number): number {
  return Math.min(MAX_SETS_PER_EXERCISE, sets);
}
