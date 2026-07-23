// Epley formula — industry standard for estimated 1RM.
// Bodyweight exercises log the user's bodyweight as `weight`, not an external
// load, so an Epley 1RM off that number is meaningless — always 0 for those.
export function estimateOneRepMax(weight: number, reps: number, equipment?: string): number {
  if (equipment === 'Bodyweight') return 0;
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}
