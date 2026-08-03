import type { MuscleGroup } from '../types/program';

// VA-014: Secondary muscle stimulus per PRIMARY slot, expressed as a fraction
// of one direct working set.
//
// Source: Dr. Mike Israetel / RP Hypertrophy — secondary muscle stimulus
// coefficients (used here for both weekly volume accounting in
// volumeBudget.ts/validation.ts, and for overlap-avoidance day-spacing in
// assignment.ts — see RC-008).
//
// Basis (from literature on EMG and mechanical overlap):
//   0.50 — substantial: close to a direct working set
//           (biceps during rows, hamstrings during squats)
//   0.40 — meaningful: significant partial activation
//           (triceps during bench, glutes during RDLs)
//   0.25 — moderate: real but not the limiting factor
//           (hamstrings during hip thrust)
//   0.15 — minor: worth accounting at high volumes
//   0.10 — minimal: mostly MEV-level muscles
//
// Role multipliers are applied when the slot is not Primary:
//   Secondary  × 0.60
//   Accessory  × 0.30
//
// A handful of coefficients below (Shoulders→Chest 0.20, Shoulders→Triceps
// 0.45, Glutes→Hamstrings 0.30) don't land exactly on one of the five named
// tiers above — they're interpolated between tiers for movements that don't
// cleanly match one of the five cited examples, not typos or tier
// violations. Flagging inline at each one below.
export const PRIMARY_ROLE_OVERLAP: Record<MuscleGroup, Partial<Record<MuscleGroup, number>>> = {
  // ── Upper push ────────────────────────────────────────────────────────────
  Chest:      { Shoulders: 0.40, Triceps: 0.40 },
  // Shoulders->Chest (0.20): between "moderate" (0.25) and "minimal" (0.10) —
  // overhead pressing gives the chest (mainly upper/clavicular fibers) less
  // carryover than a true moderate-tier movement, but more than negligible.
  // Shoulders->Triceps (0.45): between "substantial" (0.50) and "meaningful"
  // (0.40) — overhead pressing is triceps-limited in lockout nearly as much
  // as a direct press, but not quite to the "close to a direct working set"
  // substantial tier.
  Shoulders:  { Chest: 0.20, Triceps: 0.45 },
  Triceps:    {},

  // ── Upper pull ────────────────────────────────────────────────────────────
  Back:       { Biceps: 0.50, Traps: 0.25 },
  Biceps:     {},
  Traps:      { Back: 0.10 },
  Forearms:   {},

  // ── Lower ─────────────────────────────────────────────────────────────────
  Quads:      { Glutes: 0.40, Hamstrings: 0.25 },
  Hamstrings: { Glutes: 0.50, Back: 0.15 },
  // Glutes->Hamstrings (0.30): between "moderate" (0.25) and "meaningful"
  // (0.40) — hip-hinge-pattern glute work (hip thrusts, RDLs) recruits the
  // hamstrings as a synergist more than a "moderate" isolation crossover,
  // but a well-executed hip thrust is still glute-limited, not hamstring-
  // limited, so it stops short of "meaningful."
  Glutes:     { Hamstrings: 0.30 },
  Calves:     {},
  Abs:        {},
};

export const SECONDARY_ROLE_MULTIPLIER = 0.60;
export const ACCESSORY_ROLE_MULTIPLIER = 0.30;
