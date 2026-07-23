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
