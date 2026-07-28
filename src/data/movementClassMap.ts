// ─── Movement class map (NOT a doctrine tag — no research citation needed) ────
//
// Buckets the `exercises.movement_category` values actually present in
// Supabase (see supabase/migrations/20260609000001_add_exercise_taxonomy.sql
// and 20260707000003_set_exercise_movement_categories.sql — grep those files
// before adding a new category here) into a coarse compound/isolation split.
//
// This is a mechanical classification (multi-joint vs. single-joint movement),
// not a training-science claim, so it's intentionally not numbered HV/ST/PB/
// RC/VA per AGENTS.md's Tag system — that system requires a named source
// (research/program/coach) for training *decisions*; this is just a UX lookup
// table used by src/rules/exerciseSelector.ts to bias Primary/Secondary Quick
// Workout slots toward compounds and Accessory slots toward isolation work.
// Anything not listed here (including null/undefined) classifies as 'unknown'
// and is simply not filtered on — see exerciseSelector.ts's fallback behavior.

export type MovementClass = 'compound' | 'isolation' | 'unknown';

const COMPOUND_CATEGORIES = new Set([
  'Horizontal Press',
  'Incline Press',
  'Vertical Press',
  'Horizontal Pull',
  'Vertical Pull',
  'Quad Dominant',
  'Hip Hinge',
  'Glute Dominant',
]);

const ISOLATION_CATEGORIES = new Set([
  'Lateral Raise',
  'Rear Delt',
  'Elbow Flexion',
  'Elbow Extension',
  'Calf Raise',
  'Core',
  'Knee Flexion',
  'Trap/Shrug',
  'Scapular Elevation',
  'Wrist Flexion',
  'Wrist/Grip',
]);

export function classifyMovement(movementCategory: string | null | undefined): MovementClass {
  if (!movementCategory) return 'unknown';
  if (COMPOUND_CATEGORIES.has(movementCategory)) return 'compound';
  if (ISOLATION_CATEGORIES.has(movementCategory)) return 'isolation';
  return 'unknown';
}
