import type { MuscleGroup, SessionType, WeeklyVolumeTarget } from '../types/program';

export const SESSION_MUSCLES: Record<SessionType, MuscleGroup[]> = {
  FullBody:            ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes'],
  Upper:               ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
  Lower:               ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'],
  Push:                ['Chest', 'Shoulders', 'Triceps'],
  Pull:                ['Back', 'Biceps', 'Traps'],
  Legs:                ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  LowerQuadFocus:      ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'],
  LowerPosteriorChain: ['Hamstrings', 'Glutes', 'Quads', 'Calves', 'Abs'],
  LowerGluteQuad:      ['Glutes', 'Quads', 'Hamstrings', 'Calves', 'Abs'],
};

// Preferred session types per muscle, ordered from most to least ideal.
// Determines which sessions receive direct work when downsampling.
// e.g. Triceps prefers Push over Upper — on Push they are a primary mover,
// on Upper they are a tertiary assistor. Training them on Push maximises
// quality and allows Upper to be a pure compound-pair session.
// Preferred session types per muscle, ordered most → least ideal.
// Specialized lower types are listed before generic Lower/Legs so that each
// muscle gravitates toward its designated "home" session when multiple lower
// day types are present (e.g., Quads prefers LowerQuadFocus over LowerGluteQuad).
const SESSION_PREFERENCE: Record<MuscleGroup, SessionType[]> = {
  Chest:      ['Push', 'FullBody', 'Upper'],
  Shoulders:  ['Push', 'FullBody', 'Upper'],
  Triceps:    ['Push', 'FullBody', 'Upper'],
  Back:       ['Pull', 'FullBody', 'Upper'],
  Biceps:     ['Pull', 'FullBody', 'Upper'],
  Traps:      ['Pull', 'FullBody', 'Upper'],
  Forearms:   ['Pull', 'FullBody', 'Upper'],
  // Quads: quad-focused sessions first, posterior chain last (squat is secondary there)
  // Hamstrings: posterior chain primary, then quad-focus (RDL after squats is standard)
  // Glutes: glute sessions first, then quad-focus (hip thrust pairs with squats well)
  // This ensures all three muscles spread across all three lower day types when freq≥2,
  // rather than clustering Hamstrings + Glutes on just two of the three days.
  Quads:      ['LowerQuadFocus', 'LowerGluteQuad', 'Lower', 'Legs', 'LowerPosteriorChain', 'FullBody'],
  Hamstrings: ['LowerPosteriorChain', 'LowerQuadFocus', 'LowerGluteQuad', 'Legs', 'Lower', 'FullBody'],
  Glutes:     ['LowerGluteQuad', 'LowerQuadFocus', 'LowerPosteriorChain', 'Legs', 'Lower', 'FullBody'],
  // Calves prefer LQF then LGQ: spreads them Mon + Fri so each lower day pairing has calf work
  // Abs prefer LQF then LPC: spreads them Mon + Wed, complementing Calves on the other two days
  Calves:     ['LowerQuadFocus', 'LowerGluteQuad', 'Lower', 'Legs', 'LowerPosteriorChain', 'FullBody'],
  Abs:        ['LowerQuadFocus', 'LowerPosteriorChain', 'Lower', 'Legs', 'LowerGluteQuad', 'FullBody'],
};

function sessionTypesForMuscle(muscle: MuscleGroup): SessionType[] {
  return (Object.entries(SESSION_MUSCLES) as [SessionType, MuscleGroup[]][])
    .filter(([, muscles]) => muscles.includes(muscle))
    .map(([type]) => type);
}

// Rank an index by how preferred its session type is for this muscle.
// Lower score = more preferred = picked first.
function preferenceRank(sessionType: SessionType, muscle: MuscleGroup): number {
  const prefs = SESSION_PREFERENCE[muscle] ?? [];
  const idx = prefs.indexOf(sessionType);
  return idx === -1 ? prefs.length : idx; // unranked types come last
}

// Returns the day indices (within weekSessions) on which this muscle should
// receive direct work, up to its sessionFrequency.
//
// When downsampling (more eligible sessions than frequency allows), sessions
// are ranked by SESSION_PREFERENCE so that e.g. Triceps always goes to Push
// before Upper. This keeps "primary" sessions focused and Upper/Lower sessions
// from becoming cluttered with tertiary accessory work.
export function assignMuscleSessions(
  weekSessions: SessionType[],
  target: WeeklyVolumeTarget,
): number[] {
  const eligibleTypes = sessionTypesForMuscle(target.muscle);
  const matchingIndices = weekSessions
    .map((type, idx) => (eligibleTypes.includes(type) ? idx : -1))
    .filter((idx): idx is number => idx !== -1);

  if (matchingIndices.length === 0) return [];
  if (matchingIndices.length <= target.sessionFrequency) return matchingIndices;

  // Sort by preference rank, then by position in the week (stable order)
  const sorted = [...matchingIndices].sort((a, b) => {
    const rankA = preferenceRank(weekSessions[a], target.muscle);
    const rankB = preferenceRank(weekSessions[b], target.muscle);
    return rankA !== rankB ? rankA - rankB : a - b;
  });

  return sorted.slice(0, target.sessionFrequency);
}
