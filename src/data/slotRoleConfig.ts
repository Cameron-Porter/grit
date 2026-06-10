import type { MusclePriority, SlotRole } from '../types/program';

export interface SlotRoleConfig {
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
}

// Sets and rep ranges per slot role × muscle priority.
//
// Primary   — main compound for the session's focus muscle; heaviest work
// Secondary — volume variation compound; moderate loading
// Accessory — isolation / detail work; higher reps, lower RIR
//
// Rep ranges follow the hypertrophy research sweet spots:
//   5–10  at Primary emphasize = strength-hypertrophy overlap
//   8–15  at Secondary = mechanical tension + metabolic stress
//   10–20 at Accessory = pump / mind-muscle / isolation range
export const SLOT_ROLE_CONFIGS: Record<SlotRole, Record<MusclePriority | 'mev', SlotRoleConfig>> = {
  Primary: {
    emphasize: { sets: 4, repsMin: 5,  repsMax: 10, rir: 2 },
    grow:      { sets: 3, repsMin: 6,  repsMax: 12, rir: 2 },
    maintain:  { sets: 3, repsMin: 8,  repsMax: 12, rir: 3 },
    mev:       { sets: 2, repsMin: 8,  repsMax: 15, rir: 3 },
  },
  Secondary: {
    emphasize: { sets: 3, repsMin: 8,  repsMax: 12, rir: 2 },
    grow:      { sets: 3, repsMin: 8,  repsMax: 15, rir: 2 },
    maintain:  { sets: 2, repsMin: 10, repsMax: 15, rir: 3 },
    mev:       { sets: 2, repsMin: 10, repsMax: 20, rir: 3 },
  },
  Accessory: {
    emphasize: { sets: 3, repsMin: 10, repsMax: 20, rir: 2 },
    grow:      { sets: 2, repsMin: 12, repsMax: 20, rir: 2 },
    maintain:  { sets: 2, repsMin: 12, repsMax: 20, rir: 3 },
    mev:       { sets: 2, repsMin: 15, repsMax: 20, rir: 3 },
  },
};
