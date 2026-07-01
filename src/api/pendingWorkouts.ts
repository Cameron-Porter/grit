import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { computeAndSaveProgressionTargets } from './progression';
import { markDayComplete, skipProgramDay } from './programs';
import { supabase } from './supabase';
import { useProfileStore } from '../store/useProfileStore';

const QUEUE_KEY = 'grit-pending-workouts';

export interface PendingWorkoutPayload {
  workoutId: string;
  userId: string;
  name: string;
  programName: string | null;
  programDayId: string | null;
  completedAt: string;
  enqueuedAt: string;
  exercises: Array<{
    name: string;
    muscleGroup: string | null;
    musclePriority: string | null;
    equipment: string | null;
    note: string | null;
    sets: Array<{
      reps: number;
      weight: number;
      rir: number | null;
      completed: boolean;
    }>;
  }>;
  feedback: Array<{
    muscleGroup: string;
    jointPain: string | null;
    pump: string | null;
    volume: string | null;
    soreness: string | null;
  }>;
}

async function loadQueue(): Promise<PendingWorkoutPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingWorkoutPayload[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingWorkoutPayload[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueWorkout(payload: PendingWorkoutPayload): Promise<void> {
  const queue = await loadQueue();
  queue.push(payload);
  await saveQueue(queue);
}

export async function getPendingCount(): Promise<number> {
  return (await loadQueue()).length;
}

/**
 * Attempts to flush all queued workouts to Supabase.
 * Stops at the first network error so we don't waste battery retrying.
 * Returns the number successfully synced.
 */
export async function drainPendingWorkouts(): Promise<number> {
  const queue = await loadQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const failed: PendingWorkoutPayload[] = [];

  for (const payload of queue) {
    try {
      const { error: workoutError } = await supabase.from('workouts').insert({
        id: payload.workoutId,
        user_id: payload.userId,
        name: payload.name,
        program_name: payload.programName,
        program_day_id: payload.programDayId,
        completed_at: payload.completedAt,
      });

      if (workoutError) {
        if (isNetworkError(workoutError)) {
          failed.push(payload);
          // Still offline — no point trying the rest
          const remaining = queue.slice(queue.indexOf(payload) + 1);
          failed.push(...remaining);
          break;
        }
        // Permanent data error (e.g. duplicate key from a partial previous sync) —
        // log it but don't block the queue.
        Sentry.captureException(new Error(workoutError.message), {
          tags: { context: 'drainPendingWorkouts' },
          extra: { workoutId: payload.workoutId, code: workoutError.code },
        });
        continue;
      }

      const completedSets = payload.exercises.flatMap((ex) =>
        ex.sets
          .filter((s) => s.completed)
          .map((s, idx) => ({
            workout_id: payload.workoutId,
            exercise_name: ex.name,
            muscle_group: ex.muscleGroup,
            muscle_priority: ex.musclePriority,
            equipment: ex.equipment,
            note: ex.note,
            set_index: idx,
            reps: s.reps,
            weight: s.weight,
            completed: true,
            rir: s.rir,
          })),
      );

      if (completedSets.length > 0) {
        const { error: setsError } = await supabase.from('workout_sets').insert(completedSets);
        if (setsError && isNetworkError(setsError)) {
          // Workout row is already in DB — partial write. Log and move on;
          // don't re-queue because the workout row would conflict on next attempt.
          Sentry.captureException(new Error('Partial offline sync: sets failed after workout inserted'), {
            tags: { context: 'drainPendingWorkouts' },
            extra: { workoutId: payload.workoutId },
          });
          synced++;
          continue;
        }
      }

      if (payload.feedback.length > 0) {
        const rows = payload.feedback.map((f) => ({
          workout_id: payload.workoutId,
          muscle_group: f.muscleGroup,
          joint_pain: f.jointPain,
          pump: f.pump,
          volume: f.volume,
          soreness: f.soreness,
        }));
        await supabase.from('workout_feedback').insert(rows).then(null, () => {});
      }

      if (payload.programDayId) {
        if (completedSets.length > 0) {
          await markDayComplete(payload.programDayId).catch(() => {});
          const { experienceLevel } = useProfileStore.getState();
          computeAndSaveProgressionTargets(payload.programDayId, experienceLevel).catch((e) => {
            Sentry.captureException(e, { tags: { context: 'progressionEngine' } });
          });
        } else {
          await skipProgramDay(payload.programDayId).catch(() => {});
        }
      }

      synced++;
    } catch (e) {
      if (isNetworkError(e)) {
        failed.push(payload);
        const remaining = queue.slice(queue.indexOf(payload) + 1);
        failed.push(...remaining);
        break;
      }
      Sentry.captureException(e, { tags: { context: 'drainPendingWorkouts' } });
    }
  }

  await saveQueue(failed);
  return synced;
}

// PostgreSQL error codes are always 5 characters (e.g. '23505', '42501').
// Network errors from fetch produce no PG code; we require at least one
// known network error string to avoid misclassifying real data errors.
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const msg = ((error as { message?: string }).message ?? String(error)).toLowerCase();
  const code = (error as { code?: string }).code ?? '';

  // If there's a valid PostgreSQL error code it's a server/data error, not network.
  if (code && /^\d{5}[A-Z0-9]?$/.test(code)) return false;

  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('timeout') ||
    msg.includes('could not connect') ||
    msg.includes('no internet')
  );
}
