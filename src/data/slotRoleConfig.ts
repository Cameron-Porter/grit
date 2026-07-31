import type { MusclePriority, ProgramFocus, SlotRole } from '../types/program';

export interface SlotRoleConfig {
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
}

// ─── Default: Hypertrophy / General ──────────────────────────────────────────
//
// Primary   — main compound for the session's focus muscle; heaviest work
// Secondary — volume variation compound; moderate loading
// Accessory — isolation / detail work; higher reps, lower RIR
//
// Rep ranges follow the hypertrophy research sweet spots:
//   5–10  at Primary emphasize = strength-hypertrophy overlap
//   8–15  at Secondary = mechanical tension + metabolic stress
//   10–25/30 at Accessory = pump / mind-muscle / isolation range (HV-024)
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
  // ─── HV-024: Accessory rep ceiling — dumbbell/machine/isolation range ──────
  //
  // Source: RP Strength "Hypertrophy Made Simple" (2023) — rep range is split
  // by exercise TYPE, not just slot role: "antigravity compounds" (rows,
  // squats, deadlifts) are stability-limited and stay in 5-15 reps, but
  // "dumbbell, machine, and isolation movements" are prescribed 15-30 reps,
  // with a recommended set distribution of ~50% of sets in 10-20 reps, 25% in
  // 5-10, and 25% in 20-30. Accessory-role slots are, by definition, the
  // isolation/detail work this guidance targets (Primary/Secondary carry the
  // antigravity-compound work), so their ceiling moves from the old flat 20
  // up toward this range: 25 for the higher-fatigue tiers (emphasize/grow/
  // maintain), 30 at `mev` where load is lightest and the highest-rep end is
  // most appropriate.
  Accessory: {
    emphasize: { sets: 3, repsMin: 10, repsMax: 25, rir: 2 },
    grow:      { sets: 2, repsMin: 12, repsMax: 25, rir: 2 },
    maintain:  { sets: 2, repsMin: 12, repsMax: 25, rir: 3 },
    mev:       { sets: 2, repsMin: 15, repsMax: 30, rir: 3 },
  },
};

// ─── ST-001: Strength Primary — Prilepin 85-95% zone ─────────────────────────
//
// Sources: Prilepin's Chart (Soviet weightlifting research, 1000+ athletes);
// RP Strength "Strength Training Made Simple" (2023) — "Limit Strength" zone
// (1-3 reps at 87.5%+ 1RM) for emphasize, bridging toward "Basic Strength"
// (3-6 reps at 82.5%+ 1RM) for grow. The 1-3/2-4 rep bands implemented below
// sit at the tight, CNS-conservative end of Prilepin's 85-95% zone (which
// itself spans 1-6 reps/set depending on exact %) rather than its 3-6 rep
// midpoint — the Made Simple guide's explicit Limit-Strength definition is
// what actually justifies emphasize being 1-3, not a generic Prilepin cite.
//
// At 85-95% 1RM, Prilepin's optimal total reps per session = 10 (range 6-14).
// We target 5 sets × 1-3 reps for emphasize = 5-15 total, hitting the optimal
// range while managing CNS cost per set.
//
// RIR 1: at near-max load you know you have one more rep but stop for technique.

// ─── ST-002: Strength Secondary — Prilepin 75-85% zone ───────────────────────
//
// At 75-85% 1RM, Prilepin's optimal total reps = 15 (range 10-20), 6-10 reps
// per set. This is the "myofibrillar hypertrophy" zone (Prilepin/Norton
// reverse-engineering: 4-7 reps = higher force-producing capacity vs. the
// sarcoplasmic 8-12 rep pump range).

// ─── ST-003: Strength Accessory — 65-75% zone, assistance work ───────────────
//
// Kept in 6-10 rep range (not the full 10-20 Prilepin endurance zone) to
// maintain strength specificity. Assistance exercises at this intensity carry
// over directly to the main lift pattern without taxing CNS recovery.
//
// See also: ST-004 in progressionEngine.ts (deload protocol).
//           ST-005 in progressionEngine.ts (load increment).
const STRENGTH_SLOT_ROLE_CONFIGS: Record<SlotRole, Record<MusclePriority | 'mev', SlotRoleConfig>> = {
  Primary: {
    emphasize: { sets: 5, repsMin: 1,  repsMax: 3,  rir: 1 },  // ST-001
    grow:      { sets: 4, repsMin: 2,  repsMax: 4,  rir: 1 },  // ST-001
    maintain:  { sets: 3, repsMin: 3,  repsMax: 5,  rir: 2 },
    mev:       { sets: 2, repsMin: 3,  repsMax: 5,  rir: 2 },
  },
  Secondary: {
    emphasize: { sets: 4, repsMin: 4,  repsMax: 6,  rir: 1 },  // ST-002
    grow:      { sets: 3, repsMin: 4,  repsMax: 7,  rir: 2 },  // ST-002
    maintain:  { sets: 3, repsMin: 5,  repsMax: 8,  rir: 2 },
    mev:       { sets: 2, repsMin: 5,  repsMax: 8,  rir: 3 },
  },
  Accessory: {
    emphasize: { sets: 3, repsMin: 6,  repsMax: 10, rir: 2 },  // ST-003
    grow:      { sets: 3, repsMin: 6,  repsMax: 10, rir: 2 },  // ST-003
    maintain:  { sets: 2, repsMin: 8,  repsMax: 12, rir: 3 },
    mev:       { sets: 2, repsMin: 8,  repsMax: 12, rir: 3 },
  },
};

// ─── PB-001: Powerbuilding Primary — myofibrillar compound zone ───────────────
//
// Sources: PHAT (Layne Norton) power days: 3-5 sets × 3-5 reps, long rest.
//          Kizen 16-Week: Day 4 = 3×5-6 @ 70-77.5% 1RM.
//
// 3-7 reps sits in Prilepin's "myofibrillar hypertrophy" zone — builds the
// strength base that drives long-term size gains without the full CNS cost of
// the 1-3 rep max-strength zone.

// ─── PB-002: Powerbuilding Secondary — bridge zone ────────────────────────────
//
// Sources: Kizen Day 2: 3×8-10 @ 55-67.5%; Kizen Day 6: 3×7-8 @ 55-65%.
//          PHAT assistance sets: 6-10 reps following power main lifts.
//
// Enough reps to accumulate metabolic stress and induce sarcoplasmic
// adaptation while staying close enough to strength loads to reinforce
// movement pattern efficiency.

// ─── PB-003: Powerbuilding Accessory — sarcoplasmic / pump zone ──────────────
//
// Sources: PHAT hypertrophy days: 8-12, 12-15, 15-20 rep sets (1-2 min rest).
//          Kizen Days 1/3/5: 2-4 sets × 8-15 reps @ RPE 8-9 in superset pairs.
//
// Isolation and detail work at higher reps drives the size component of the
// powerbuilding adaptation — the counterpart to the strength-focused Primary.
//
// See also: PB-004 in progressionEngine.ts (deload uses hypertrophy protocol).
const POWERBUILDING_SLOT_ROLE_CONFIGS: Record<SlotRole, Record<MusclePriority | 'mev', SlotRoleConfig>> = {
  Primary: {
    emphasize: { sets: 4, repsMin: 3,  repsMax: 6,  rir: 2 },  // PB-001
    grow:      { sets: 4, repsMin: 4,  repsMax: 7,  rir: 2 },  // PB-001
    maintain:  { sets: 3, repsMin: 5,  repsMax: 8,  rir: 2 },
    mev:       { sets: 2, repsMin: 5,  repsMax: 8,  rir: 3 },
  },
  Secondary: {
    emphasize: { sets: 3, repsMin: 6,  repsMax: 10, rir: 2 },  // PB-002
    grow:      { sets: 3, repsMin: 6,  repsMax: 10, rir: 2 },  // PB-002
    maintain:  { sets: 3, repsMin: 8,  repsMax: 12, rir: 3 },
    mev:       { sets: 2, repsMin: 8,  repsMax: 12, rir: 3 },
  },
  Accessory: {
    emphasize: { sets: 3, repsMin: 10, repsMax: 15, rir: 2 },  // PB-003
    grow:      { sets: 3, repsMin: 10, repsMax: 15, rir: 2 },  // PB-003
    maintain:  { sets: 2, repsMin: 12, repsMax: 20, rir: 3 },
    mev:       { sets: 2, repsMin: 12, repsMax: 20, rir: 3 },
  },
};

// ─── Selector ─────────────────────────────────────────────────────────────────
export function getSlotRoleConfigs(
  focus?: ProgramFocus,
): Record<SlotRole, Record<MusclePriority | 'mev', SlotRoleConfig>> {
  if (focus === 'strength') return STRENGTH_SLOT_ROLE_CONFIGS;
  if (focus === 'powerbuilding') return POWERBUILDING_SLOT_ROLE_CONFIGS;
  return SLOT_ROLE_CONFIGS;
}
