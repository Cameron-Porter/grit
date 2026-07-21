/**
 * Evidence-based weekly volume landmarks (sets per muscle group).
 * Source: RP Strength / Israetel et al. ranges adapted for intermediate lifters.
 *
 * MEV = Minimum Effective Volume  — below this, little stimulus
 * MAV = Maximum Adaptive Volume   — sweet spot; most progress here
 * MRV = Maximum Recoverable Volume — above this, accumulate fatigue faster than you adapt
 */

export interface VolumeLandmark {
  mev: number;
  mav: number;
  mrv: number;
}

const LANDMARKS: Record<string, VolumeLandmark> = {
  Chest:      { mev: 8,  mav: 16, mrv: 22 },
  Back:       { mev: 10, mav: 18, mrv: 25 },
  Shoulders:  { mev: 6,  mav: 14, mrv: 20 },
  Biceps:     { mev: 6,  mav: 14, mrv: 20 },
  Triceps:    { mev: 6,  mav: 14, mrv: 18 },
  Quads:      { mev: 8,  mav: 16, mrv: 22 },
  Hamstrings: { mev: 6,  mav: 12, mrv: 18 },
  Glutes:     { mev: 4,  mav: 12, mrv: 20 },
  Traps:      { mev: 4,  mav: 12, mrv: 18 },
  Calves:     { mev: 8,  mav: 16, mrv: 20 },
  Abs:        { mev: 4,  mav: 16, mrv: 25 },
  Forearms:   { mev: 4,  mav: 10, mrv: 16 },
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
    label = `${weeklySets} sets · above MRV (${landmark.mrv})`;
  }

  return { sets: weeklySets, landmark, status, label };
}

/**
 * Counts total completed sets per muscle group from the active workout exercises.
 */
export function countSetsByMuscle(
  exercises: { muscleGroup: string; sets: { completed: boolean }[] }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ex of exercises) {
    if (!ex.muscleGroup) continue;
    const completed = ex.sets.filter((s) => s.completed).length;
    counts[ex.muscleGroup] = (counts[ex.muscleGroup] ?? 0) + completed;
  }
  return counts;
}
