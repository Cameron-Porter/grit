// ─── HV-045: Per-set rep targets ───────────────────────────────────────────
//
// The engine prescribes one rep target for a whole exercise, and the logger
// shows the same range on every set row. Progress within a session is
// therefore invisible: after 11, 12, 12 against a 12 ceiling the lifter is
// told "aim for 12" — a number two of the three sets already hit — with no
// indication that the first set is the one to push.
//
// RP instead raises reps a set at a time, which is what produces the
// 135x12, 135x12, 135x13 pattern: total reps creep up by one per session
// rather than every set jumping together. This distributes the next session's
// single extra rep the same way.
//
// Rule: add the rep to the set with the fewest reps, breaking a tie in favour
// of the LAST such set. Uneven sets therefore converge upward first (11,12,12
// -> 12,12,12), and once level the trailing set leads (12,12,12 -> 12,12,13),
// which is exactly the observed RP shape. When every set is already at the
// ceiling nothing is added — that is the double-progression trigger to raise
// load instead, and it stays owned by progressionEngine.
//
// Source: RP's own progression guidance treats volume as the primary driver
// and load as a slow, occasional change (rpstrength.com, "Progressing for
// Hypertrophy"); a per-session single-rep increment is the smallest unit of
// that volume progression.

/**
 * Rep target for each set of the next session.
 *
 * @param lastSetReps reps completed on each set of the most recent session, in
 *   set order. Sets beyond its length have no history and start at `bandMin`.
 * @param setCount    how many sets are prescribed for the next session.
 * @param ceiling     the rep ceiling in force (the engine's effective repsMax).
 * @param bandMin     rep floor, used for sets with no history.
 */
export function perSetRepTargets(
  lastSetReps: readonly number[],
  setCount: number,
  ceiling: number,
  bandMin: number,
): number[] {
  if (setCount <= 0) return [];
  const targets = Array.from({ length: setCount }, (_, index) => {
    const last = lastSetReps[index];
    if (last === undefined || !Number.isFinite(last) || last <= 0) return Math.min(bandMin, ceiling);
    return Math.min(last, ceiling);
  });

  // Every set already at the ceiling: the load moves instead of the reps.
  if (targets.every((reps) => reps >= ceiling)) return targets;

  let lowest = 0;
  for (let index = 1; index < targets.length; index++) {
    // `<=` so a tie resolves to the last matching set.
    if (targets[index] <= targets[lowest]) lowest = index;
  }
  targets[lowest] = Math.min(targets[lowest] + 1, ceiling);
  return targets;
}

/** True when every set has reached the ceiling — the cue to add load, not reps. */
export function everySetAtCeiling(lastSetReps: readonly number[], setCount: number, ceiling: number): boolean {
  if (setCount <= 0 || lastSetReps.length < setCount) return false;
  return lastSetReps.slice(0, setCount).every((reps) => reps >= ceiling);
}
