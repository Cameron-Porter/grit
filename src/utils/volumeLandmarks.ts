/**
 * Evidence-based weekly volume landmarks (sets per muscle group).
 * Source: RP Strength / Israetel et al., "Training Volume Landmarks for Muscle
 * Growth" — MEV/MAV/MRV ranges adapted for intermediate lifters. A "set" here
 * assumes 30-85% 1RM, 5-30 reps, 0-4 RIR, and only counts sets where the
 * muscle is the prime mover or the direct target of an isolation exercise
 * (indirect stimulus from compounds is already factored into these numbers).
 *
 * MV  = Maintenance Volume        — floor; holds current size, no growth
 * MEV = Minimum Effective Volume  — below this, little stimulus; meso starting point
 * MAV = Maximum Adaptive Volume   — not a fixed number in the source, but the
 *        progression zone between MEV and MRV; here it names the top of that
 *        zone for a "grow"-priority muscle (see slotBuilder.ts HV-021 ramp)
 * MRV = Maximum Recoverable Volume — above this, recovery fails before growth
 *
 * The source states MV is "typically around 6 sets... whether beginner or
 * advanced," without a per-muscle breakdown. We derive each muscle's MV as
 * min(6, mev) — the cited ~6 figure, floored at that muscle's own MEV so MV
 * never exceeds MEV (the source is explicit that MV sits below MEV).
 */

export interface VolumeLandmark {
  mv: number;
  mev: number;
  mav: number;
  mrv: number;
}

const LANDMARKS: Record<string, VolumeLandmark> = {
  Chest:      { mv: 6, mev: 8,  mav: 16, mrv: 22 },
  Back:       { mv: 6, mev: 10, mav: 18, mrv: 25 },
  Shoulders:  { mv: 6, mev: 6,  mav: 14, mrv: 20 },
  Biceps:     { mv: 6, mev: 6,  mav: 14, mrv: 20 },
  Triceps:    { mv: 6, mev: 6,  mav: 14, mrv: 18 },
  Quads:      { mv: 6, mev: 8,  mav: 16, mrv: 22 },
  Hamstrings: { mv: 6, mev: 6,  mav: 12, mrv: 18 },
  Glutes:     { mv: 4, mev: 4,  mav: 12, mrv: 20 },
  Traps:      { mv: 4, mev: 4,  mav: 12, mrv: 18 },
  Calves:     { mv: 6, mev: 8,  mav: 16, mrv: 20 },
  Abs:        { mv: 4, mev: 4,  mav: 16, mrv: 25 },
  Forearms:   { mv: 4, mev: 4,  mav: 10, mrv: 16 },
};

export type VolumeStatus = 'below_mev' | 'mev_to_mav' | 'mav_to_mrv' | 'above_mrv';

export interface VolumeResult {
  sets: number;
  landmark: VolumeLandmark | null;
  status: VolumeStatus;
  label: string;
}

export function getLandmark(muscleGroup: string): VolumeLandmark | null {
  return LANDMARKS[muscleGroup] ?? null;
}

export function classifyVolume(muscleGroup: string, weeklySets: number): VolumeResult {
  const landmark = getLandmark(muscleGroup);
  if (!landmark) {
    return { sets: weeklySets, landmark: null, status: 'mev_to_mav', label: '' };
  }

  let status: VolumeStatus;
  let label: string;

  if (weeklySets < landmark.mev) {
    status = 'below_mev';
    label = `${weeklySets} sets · below MEV (${landmark.mev})`;
  } else if (weeklySets < landmark.mav) {
    status = 'mev_to_mav';
    label = `${weeklySets} sets · productive range`;
  } else if (weeklySets <= landmark.mrv) {
    status = 'mav_to_mrv';
    label = `${weeklySets} sets · near MRV (${landmark.mrv})`;
  } else {
    status = 'above_mrv';
    label = `${weeklySets} sets · may need more recovery time`;
  }

  return { sets: weeklySets, landmark, status, label };
}

/**
 * Counts scheduled sets per muscle group from the active workout's exercises —
 * completed or still-pending, but not skipped. This is the in-progress session's
 * contribution to the weekly MEV/MAV/MRV badge: pending sets you haven't logged
 * yet still count, since they're already planned for today, not missing volume.
 */
export function countSetsByMuscle(
  exercises: { muscleGroup?: string; sets: { completed: boolean; skipped?: boolean }[] }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ex of exercises) {
    if (!ex.muscleGroup) continue;
    const scheduled = ex.sets.filter((s) => !s.skipped).length;
    counts[ex.muscleGroup] = (counts[ex.muscleGroup] ?? 0) + scheduled;
  }
  return counts;
}
