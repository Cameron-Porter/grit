import type { SessionTemplate, SessionType } from '../types/program';

// Canonical (muscle, role) ordering per session type.
//
// Each entry is a POSSIBLE slot — the slot builder selects from this list based
// on active muscles and the 5-slot session cap (see slotBuilder.ts).
//
// Ordering principles (in priority):
//   1. Fatigue management — heavy compounds before lighter work;
//      prime movers before assistors.
//   2. Session anchor gets Primary + Secondary before other muscles get Primary.
//      e.g. in Push, Chest (anchor) lists P then S before Shoulders-P.
//   3. Supporting muscles Primary before anchor Accessory — they need at least
//      one quality working set before isolation/detail work.
//
// Role semantics:
//   Primary   — main compound for this muscle in this session
//   Secondary — volume variation compound (same muscle, different angle/variation)
//   Accessory — isolation / detail / small-muscle work

export const SESSION_TEMPLATES: Record<SessionType, SessionTemplate> = {

  // ── Push ──────────────────────────────────────────────────────────────────
  // Chest is the session anchor. Chest Primary + Secondary before Shoulders so
  // that horizontal pressing (longest ROM, highest pec activation) happens first
  // while the pecs and anterior deltoids are fully fresh. OHP goes third —
  // anterior delt pre-activation from chest work is a benefit, not a problem,
  // at moderate loads. Triceps last: they assist every push movement.
  Push: {
    sessionType: 'Push',
    slots: [
      { muscle: 'Chest',     role: 'Primary',    sortOrder: 0 },
      { muscle: 'Chest',     role: 'Secondary',  sortOrder: 1 },
      { muscle: 'Shoulders', role: 'Primary',    sortOrder: 2 },
      { muscle: 'Shoulders', role: 'Secondary',  sortOrder: 3 },
      { muscle: 'Triceps',   role: 'Primary',    sortOrder: 4 },
      { muscle: 'Triceps',   role: 'Secondary',  sortOrder: 5 },
      { muscle: 'Shoulders', role: 'Accessory',  sortOrder: 6 },
      { muscle: 'Triceps',   role: 'Accessory',  sortOrder: 7 },
      { muscle: 'Abs',       role: 'Accessory',  sortOrder: 8 },
    ],
  },

  // ── Pull ──────────────────────────────────────────────────────────────────
  // Back (vertical pull anchor) → Back Secondary → Biceps → Traps accessory.
  // Lat-dominant vertical pull first (heaviest back movement). Row second —
  // horizontal pulls are shorter ROM and less fatiguing. Biceps after all back
  // work so they aren't pre-fatigued going into the two heaviest pull movements.
  Pull: {
    sessionType: 'Pull',
    slots: [
      { muscle: 'Back',      role: 'Primary',    sortOrder: 0 },
      { muscle: 'Back',      role: 'Secondary',  sortOrder: 1 },
      { muscle: 'Biceps',    role: 'Primary',    sortOrder: 2 },
      { muscle: 'Biceps',    role: 'Secondary',  sortOrder: 3 },
      { muscle: 'Back',      role: 'Accessory',  sortOrder: 4 },
      { muscle: 'Traps',     role: 'Primary',    sortOrder: 5 },
      { muscle: 'Forearms',  role: 'Accessory',  sortOrder: 6 },
    ],
  },

  // ── Legs ──────────────────────────────────────────────────────────────────
  // Squat (CNS-heavy, full lower-body) → RDL (spine-loading while fresh) →
  // Hip thrust (glute isolation, no spinal compression) → leg curl →
  // Calves and Abs last (low-fatigue accessories).
  Legs: {
    sessionType: 'Legs',
    slots: [
      { muscle: 'Quads',      role: 'Primary',   sortOrder: 0 },
      { muscle: 'Hamstrings', role: 'Primary',   sortOrder: 1 },
      { muscle: 'Glutes',     role: 'Primary',   sortOrder: 2 },
      { muscle: 'Quads',      role: 'Secondary', sortOrder: 3 },
      { muscle: 'Hamstrings', role: 'Secondary', sortOrder: 4 },
      { muscle: 'Glutes',     role: 'Secondary', sortOrder: 5 },
      { muscle: 'Calves',     role: 'Primary',   sortOrder: 6 },
      { muscle: 'Abs',        role: 'Primary',   sortOrder: 7 },
      { muscle: 'Calves',     role: 'Accessory', sortOrder: 8 },
      { muscle: 'Abs',        role: 'Accessory', sortOrder: 9 },
    ],
  },

  // ── Upper ─────────────────────────────────────────────────────────────────
  // Antagonist pairing: Chest Primary ↔ Back Primary alternating, then arms.
  // Pairing chest/back compounds allows one muscle to recover while the other
  // works, reducing cardiovascular fatigue and allowing heavier loading.
  Upper: {
    sessionType: 'Upper',
    slots: [
      { muscle: 'Chest',     role: 'Primary',   sortOrder: 0 },
      { muscle: 'Back',      role: 'Primary',   sortOrder: 1 },
      { muscle: 'Chest',     role: 'Secondary', sortOrder: 2 },
      { muscle: 'Back',      role: 'Secondary', sortOrder: 3 },
      { muscle: 'Shoulders', role: 'Primary',   sortOrder: 4 },
      { muscle: 'Back',      role: 'Accessory', sortOrder: 5 },
      { muscle: 'Chest',     role: 'Accessory', sortOrder: 6 },
      { muscle: 'Biceps',    role: 'Primary',   sortOrder: 7 },
      { muscle: 'Triceps',   role: 'Primary',   sortOrder: 8 },
      { muscle: 'Shoulders', role: 'Secondary', sortOrder: 9 },
      { muscle: 'Biceps',    role: 'Secondary', sortOrder: 10 },
      { muscle: 'Triceps',   role: 'Secondary', sortOrder: 11 },
      { muscle: 'Shoulders', role: 'Accessory', sortOrder: 12 },
    ],
  },

  // ── Lower ─────────────────────────────────────────────────────────────────
  // Identical ordering to Legs (separate type for Upper-Lower splits).
  Lower: {
    sessionType: 'Lower',
    slots: [
      { muscle: 'Quads',      role: 'Primary',   sortOrder: 0 },
      { muscle: 'Hamstrings', role: 'Primary',   sortOrder: 1 },
      { muscle: 'Glutes',     role: 'Primary',   sortOrder: 2 },
      { muscle: 'Quads',      role: 'Secondary', sortOrder: 3 },
      { muscle: 'Hamstrings', role: 'Secondary', sortOrder: 4 },
      { muscle: 'Glutes',     role: 'Secondary', sortOrder: 5 },
      { muscle: 'Calves',     role: 'Primary',   sortOrder: 6 },
      { muscle: 'Abs',        role: 'Primary',   sortOrder: 7 },
      { muscle: 'Calves',     role: 'Accessory', sortOrder: 8 },
      { muscle: 'Abs',        role: 'Accessory', sortOrder: 9 },
    ],
  },

  // ── Full Body ─────────────────────────────────────────────────────────────
  // Squat first (maximum CNS demand), then interleave upper compounds, then
  // accessories. Lower-body heavy work must happen before upper fatigue impairs
  // balance and spinal stability.
  FullBody: {
    sessionType: 'FullBody',
    slots: [
      { muscle: 'Quads',      role: 'Primary',   sortOrder: 0 },
      { muscle: 'Chest',      role: 'Primary',   sortOrder: 1 },
      { muscle: 'Hamstrings', role: 'Primary',   sortOrder: 2 },
      { muscle: 'Back',       role: 'Primary',   sortOrder: 3 },
      { muscle: 'Shoulders',  role: 'Primary',   sortOrder: 4 },
      { muscle: 'Glutes',     role: 'Primary',   sortOrder: 5 },
      { muscle: 'Chest',      role: 'Secondary', sortOrder: 6 },
      { muscle: 'Back',       role: 'Secondary', sortOrder: 7 },
      { muscle: 'Biceps',     role: 'Primary',   sortOrder: 8 },
      { muscle: 'Triceps',    role: 'Primary',   sortOrder: 9 },
      { muscle: 'Calves',     role: 'Primary',   sortOrder: 10 },
      { muscle: 'Abs',        role: 'Primary',   sortOrder: 11 },
      { muscle: 'Shoulders',  role: 'Accessory', sortOrder: 12 },
    ],
  },

  // ── LowerQuadFocus ─────────────────────────────────────────────────────────
  // Squat anchor (Quads primary). RDL second while posterior chain is fresh.
  // Hip thrust third. Accessories after all primaries.
  LowerQuadFocus: {
    sessionType: 'LowerQuadFocus',
    slots: [
      { muscle: 'Quads',      role: 'Primary',   sortOrder: 0 },
      { muscle: 'Quads',      role: 'Secondary', sortOrder: 1 },
      { muscle: 'Hamstrings', role: 'Primary',   sortOrder: 2 },
      { muscle: 'Hamstrings', role: 'Secondary', sortOrder: 3 },
      { muscle: 'Glutes',     role: 'Primary',   sortOrder: 4 },
      { muscle: 'Glutes',     role: 'Secondary', sortOrder: 5 },
      { muscle: 'Calves',     role: 'Primary',   sortOrder: 6 },
      { muscle: 'Abs',        role: 'Primary',   sortOrder: 7 },
      { muscle: 'Quads',      role: 'Accessory', sortOrder: 8 },
      { muscle: 'Calves',     role: 'Accessory', sortOrder: 9 },
      { muscle: 'Abs',        role: 'Accessory', sortOrder: 10 },
    ],
  },

  // ── LowerPosteriorChain ────────────────────────────────────────────────────
  // Hinge anchor (Hamstrings primary, maximally fresh for RDL). Hip thrust
  // second. Squat demoted to third — it's a support movement here.
  LowerPosteriorChain: {
    sessionType: 'LowerPosteriorChain',
    slots: [
      { muscle: 'Hamstrings', role: 'Primary',   sortOrder: 0 },
      { muscle: 'Hamstrings', role: 'Secondary', sortOrder: 1 },
      { muscle: 'Glutes',     role: 'Primary',   sortOrder: 2 },
      { muscle: 'Glutes',     role: 'Secondary', sortOrder: 3 },
      { muscle: 'Quads',      role: 'Primary',   sortOrder: 4 },
      { muscle: 'Quads',      role: 'Secondary', sortOrder: 5 },
      { muscle: 'Calves',     role: 'Primary',   sortOrder: 6 },
      { muscle: 'Abs',        role: 'Primary',   sortOrder: 7 },
      { muscle: 'Hamstrings', role: 'Accessory', sortOrder: 8 },
      { muscle: 'Calves',     role: 'Accessory', sortOrder: 9 },
      { muscle: 'Abs',        role: 'Accessory', sortOrder: 10 },
    ],
  },

  // ── LowerGluteQuad ─────────────────────────────────────────────────────────
  // Hip thrust anchor (Glutes primary, maximum glute activation when fresh).
  // Squat second (quads benefit from glute pre-activation). Hamstrings support.
  LowerGluteQuad: {
    sessionType: 'LowerGluteQuad',
    slots: [
      { muscle: 'Glutes',     role: 'Primary',   sortOrder: 0 },
      { muscle: 'Glutes',     role: 'Secondary', sortOrder: 1 },
      { muscle: 'Quads',      role: 'Primary',   sortOrder: 2 },
      { muscle: 'Quads',      role: 'Secondary', sortOrder: 3 },
      { muscle: 'Hamstrings', role: 'Primary',   sortOrder: 4 },
      { muscle: 'Hamstrings', role: 'Secondary', sortOrder: 5 },
      { muscle: 'Calves',     role: 'Primary',   sortOrder: 6 },
      { muscle: 'Abs',        role: 'Primary',   sortOrder: 7 },
      { muscle: 'Glutes',     role: 'Accessory', sortOrder: 8 },
      { muscle: 'Calves',     role: 'Accessory', sortOrder: 9 },
      { muscle: 'Abs',        role: 'Accessory', sortOrder: 10 },
    ],
  },
};
