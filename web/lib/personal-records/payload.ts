export type ManualPersonalRecordPayload = { exerciseName: string; weight: number; reps: number };

const stringIn = (value: unknown, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && value.length <= max;

export function validateManualPersonalRecordPayload(value: unknown): value is ManualPersonalRecordPayload {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<ManualPersonalRecordPayload>;
  if (!stringIn(input.exerciseName, 1, 160)) return false;
  if (typeof input.weight !== 'number' || !Number.isFinite(input.weight) || input.weight < 0 || input.weight > 100000) return false;
  if (typeof input.reps !== 'number' || !Number.isInteger(input.reps) || input.reps < 1 || input.reps > 1000) return false;
  return true;
}
