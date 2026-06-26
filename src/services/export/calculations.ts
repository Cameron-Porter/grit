// Epley formula — industry standard for estimated 1RM
export function estimatedOneRepMax(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function setVolume(weight: number | null, reps: number | null): number | null {
  if (weight == null || reps == null || weight <= 0 || reps <= 0) return null;
  return weight * reps;
}

export function durationMinutes(createdAt: string, completedAt: string | null): number | null {
  if (!completedAt) return null;
  const diff = new Date(completedAt).getTime() - new Date(createdAt).getTime();
  return diff > 0 ? Math.round(diff / 60000) : null;
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case 'emphasize': return 'High Priority';
    case 'grow':      return 'Medium Priority';
    case 'maintain':  return 'Low Priority';
    default:          return priority;
  }
}

export function priorityLevel(priority: string): number {
  switch (priority) {
    case 'emphasize': return 3;
    case 'grow':      return 2;
    case 'maintain':  return 1;
    default:          return 0;
  }
}
