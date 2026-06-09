import type { MuscleGroup } from '../types/program';

// Secondary muscle stimulus per slot key, expressed as a fraction of one direct set.
//
// Basis:
//   0.5 — substantial stimulus, close to a direct working set
//         (e.g. biceps during rows; data shows ~50% activation relative to curls)
//   0.4 — meaningful secondary stimulus
//         (e.g. triceps during bench; significant but partial)
//   0.25 — moderate secondary stimulus
//         (e.g. glutes during squats; real but not the limiting factor)
//   0.2  — minor stimulus worth tracking at high volumes
//   0.1  — minimal, only relevant for MEV-level muscles
//
// Only the receiving muscle's group is listed (e.g. front delt contribution
// from chest pressing is recorded as Shoulders, not Front Delt).
export const SLOT_OVERLAP: Record<string, Partial<Record<MuscleGroup, number>>> = {
  // ── Push ──────────────────────────────────────────────────────────────────
  'chest-horizontal-press': { Shoulders: 0.4, Triceps: 0.4 },
  'chest-incline-press':    { Shoulders: 0.5, Triceps: 0.4 },
  'chest-fly':              { Shoulders: 0.15 },
  'shoulders-press':        { Chest: 0.25, Triceps: 0.5 },
  'shoulders-lateral':      {},
  'shoulders-rear-delt':    { Back: 0.2 },

  // ── Pull ──────────────────────────────────────────────────────────────────
  'back-vertical-pull':     { Biceps: 0.5 },
  'back-horizontal-pull':   { Biceps: 0.5, Traps: 0.25 },
  'back-isolation':         { Biceps: 0.25 },
  'biceps-curl':            {},
  'biceps-isolation':       {},
  'traps-shrug':            { Back: 0.1 },
  'forearms-curl':          {},

  // ── Lower ─────────────────────────────────────────────────────────────────
  'quads-squat':            { Glutes: 0.4, Hamstrings: 0.25 },
  'quads-unilateral':       { Glutes: 0.5, Hamstrings: 0.2 },
  'quads-isolation':        {},
  'hamstrings-hinge':       { Glutes: 0.5, Back: 0.2 },
  'hamstrings-curl':        {},
  'glutes-thrust':          { Hamstrings: 0.3 },
  'glutes-isolation':       {},
  'calves-gastroc':         {},
  'calves-soleus':          {},
  'abs-weighted':           {},
  'abs-stabilization':      {},
};
