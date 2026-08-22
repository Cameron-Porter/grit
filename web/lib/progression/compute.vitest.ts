import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { computeProgression } from './compute';

function queryResult(data: unknown) {
  const result = { data, error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gt', 'in', 'is', 'order']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  Object.defineProperty(chain, 'then', {
    get: () => (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  });
  return chain;
}

describe('web progression persistence', () => {
  it('upserts a zero-weight bodyweight recommendation with its rep progression intact', async () => {
    const upsert = vi.fn(async (_rows: unknown) => ({ error: null }));
    const responsesByTable: Record<string, unknown[]> = {
      program_days: [
        queryResult({ program_id: 'program-1', week_number: 1, day_number: 1 }),
        queryResult({ id: 'template-day-1' }),
        queryResult({ id: 'next-day-1' }),
        queryResult([{ id: 'history-day-1' }]),
        queryResult([{ id: 'history-day-1' }]),
        queryResult([]),
      ],
      programs: [queryResult({ user_id: 'user-1', total_weeks: 6, focus: 'general', muscle_priorities: { Back: 'grow' } })],
      program_exercises: [queryResult([{
        exercise_name: 'Pull-Up', muscle_group: 'Back', equipment: 'Bodyweight', target_sets: 3,
        target_reps_min: 8, target_reps_max: 12, target_weight: 0, rir: 2, role: 'Primary',
      }])],
      workout_feedback: [queryResult([])],
      workouts: [
        queryResult([]),
        queryResult([{ id: 'w1', completed_at: '2026-01-01T00:00:00Z', program_day_id: 'history-day-1' }]),
      ],
      workout_sets: [queryResult(Array.from({ length: 3 }, (_, set_index) => ({
        workout_id: 'w1', weight: 0, reps: 12, set_index, reported_rir: 2,
      })))],
      program_day_targets: [{ upsert }],
    };
    const callCounts: Record<string, number> = {};
    const db = { from: vi.fn((table: string) => {
      const index = callCounts[table] ?? 0;
      callCounts[table] = index + 1;
      return responsesByTable[table][index];
    }) } as unknown as SupabaseClient;

    await computeProgression(db, 'user-1', 'day-1', 'intermediate', 'w1');

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toEqual([
      expect.objectContaining({ exercise_name: 'Pull-Up', target_weight: 0, target_reps_max: 13 }),
    ]);
  });
});
