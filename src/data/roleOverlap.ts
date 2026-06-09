import type { MuscleGroup } from '../types/program';

// Secondary muscle stimulus per PRIMARY slot, expressed as a fraction of one
// direct working set.
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
export const PRIMARY_ROLE_OVERLAP: Record<MuscleGroup, Partial<Record<MuscleGroup, number>>> = {
  // ── Upper push ────────────────────────────────────────────────────────────
  Chest:      { Shoulders: 0.40, Triceps: 0.40 },
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
  Glutes:     { Hamstrings: 0.30 },
  Calves:     {},
  Abs:        {},
};

export const SECONDARY_ROLE_MULTIPLIER = 0.60;
export const ACCESSORY_ROLE_MULTIPLIER = 0.30;
