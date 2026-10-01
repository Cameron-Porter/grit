import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { computeProgression } from './compute';

function queryResult(data: unknown) {
  const result = { data, error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gt', 'in', 'is', 'order', 'lte']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  Object.defineProperty(chain, 'then', {
    get: () => (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  });
  return chain;
}

describe('web progression persistence', () => {
  it.each(['Push-Up', 'Sit-Up'])('preserves demonstrated bodyweight reps in same-week %s targets', async (exerciseName) => {
    const exercise = { exercise_name: exerciseName, muscle_group: null, equipment: 'Bodyweight', target_sets: 3, target_reps_min: 8, target_reps_max: 12, target_weight: 206, rir: 4, role: 'Primary' };
    const responses: Record<string, unknown[]> = {
      program_days: [
        { program_id: 'p', week_number: 1, day_number: 1 }, { id: 'template' },
        [{ id: 'later', day_number: 2 }], { id: 'later-template' }, [{ id: 'day-1' }],
      ],
      programs: [{ user_id: 'u', total_weeks: 1, focus: 'general' }],
      program_exercises: [[exercise], [exercise]],
      workouts: [{ id: 'w', program_day_id: 'day-1', completed_at: '2026-09-28', progression_completed_at: null }, [{ id: 'w', completed_at: '2026-09-28', program_day_id: 'day-1' }]],
      workout_sets: [Array.from({ length: 4 }, (_, set_index) => ({ workout_id: 'w', weight: 206, reps: 20, set_index, reported_rir: 4 }))],
    };
    const rpc = vi.fn(async () => ({ error: null }));
    const db = { rpc, from: (table: string) => queryResult(responses[table].shift()) } as unknown as SupabaseClient;
    await computeProgression(db, 'u', 'day-1', 'intermediate', 'w');
    expect(rpc).toHaveBeenCalledWith('save_progression_targets', { p_workout_id: 'w', p_targets: [expect.objectContaining({ exercise_name: exerciseName, target_sets: 3, target_reps_min: 20, target_reps_max: 20, target_weight: 206 })] });
  });
  it('upserts a zero-weight bodyweight recommendation with its rep progression intact', async () => {
    const rpc = vi.fn(async (_name: string, _args: unknown) => ({ error: null }));
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
        exercise_name: 'Pull-Up (Normal Grip)', muscle_group: 'Back', equipment: 'Bodyweight', target_sets: 3,
        target_reps_min: 8, target_reps_max: 12, target_weight: 0, rir: 2, role: 'Primary',
      }])],
      workout_feedback: [queryResult([])],
      workouts: [
        queryResult({id:'w1',program_day_id:'day-1',completed_at:'2026-01-01T00:00:00Z',progression_completed_at:null}),
        queryResult([]),
        queryResult([{ id: 'w1', completed_at: '2026-01-01T00:00:00Z', program_day_id: 'history-day-1' }]),
      ],
      workout_sets: [queryResult(Array.from({ length: 3 }, (_, set_index) => ({
        workout_id: 'w1', weight: 0, reps: 12, set_index, reported_rir: 2,
      })))],

    };
    const callCounts: Record<string, number> = {};
    const db = { rpc, from: vi.fn((table: string) => {
      const index = callCounts[table] ?? 0;
      callCounts[table] = index + 1;
      return responsesByTable[table][index];
    }) } as unknown as SupabaseClient;

    await computeProgression(db, 'user-1', 'day-1', 'intermediate', 'w1');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({p_workout_id:'w1',p_targets:[
      expect.objectContaining({ exercise_name: 'Pull-Up (Normal Grip)', target_weight: 0, target_reps_max: 13, decision_evidence: expect.objectContaining({version:1,sourceWorkoutId:'w1',recommendation:expect.objectContaining({decisionCode:'bodyweight_rep_progression'}),finalTarget:expect.objectContaining({weightLbs:0,repsMax:13})}) }),
    ]});
  });
});
