// ─── HV-043: Per-muscle rep-band floors ────────────────────────────────────
//
// Rep bands were derived from slot role × muscle priority alone, with no
// awareness of which muscle filled the slot. An emphasized Primary slot is
// 5-10 reps, so putting calves or abs on one prescribed 5-rep calf raises and
// 5-rep sit-ups - loads and rep counts that are not achievable, let alone
// productive, for those muscles.
//
// Sources:
//   - RP Hypertrophy is deliberately agnostic across 5-30 reps, "only flagging
//     extremes beyond those boundaries" (RP Help Center, "What should my rep
//     range be?"), so nothing here narrows a band - it only raises a floor that
//     was set too low for the muscle.
//   - RP recommends 10-20 reps for calves specifically, and groups calves and
//     forearms as muscles where heavy loading is impractical (RP Help Center,
//     "Calves"; rpstrength.com, "How to Get Bigger Calves").
//   - Abs sit in the same category: the movements are overwhelmingly bodyweight
//     or lightly loaded, so a low-rep prescription cannot be met with load and
//     just becomes an under-stimulating set.
//
// Applied as a floor, never a ceiling: a band already at or above these values
// is left exactly as the role/priority table set it.
export interface MuscleRepBand {
  repsMin: number;
  repsMax: number;
}

export const MUSCLE_REP_BAND_FLOORS: Record<string, MuscleRepBand> = {
  Calves: { repsMin: 10, repsMax: 20 },
  Forearms: { repsMin: 10, repsMax: 20 },
  Abs: { repsMin: 10, repsMax: 25 },
};

/**
 * Raise a role/priority rep band to the floor this muscle needs. Never lowers
 * either bound, so a band that is already higher is returned untouched.
 */
export function applyMuscleRepBand(muscle: string, repsMin: number, repsMax: number): MuscleRepBand {
  const floor = MUSCLE_REP_BAND_FLOORS[muscle];
  if (!floor) return { repsMin, repsMax };
  return {
    repsMin: Math.max(repsMin, floor.repsMin),
    repsMax: Math.max(repsMax, floor.repsMax),
  };
}
