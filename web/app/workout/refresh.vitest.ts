import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Workout from './page';

const state = vi.hoisted(() => ({ completed: false, belowFloor: false }));
vi.mock('@/lib/auth/require-user', () => ({ requireUser: async () => ({ user: { id: 'user' }, supabase: {
  from(table: string) {
    let selection = '';
    const query = {
      select(value: string) { selection = value; return query; },
      eq() { return query; }, is() { return query; }, order() { return query; },
      limit() { return query; }, in() { return query; }, gt() { return query; },
      maybeSingle() { return query; },
      then(resolve: (value: unknown) => unknown) {
        let data: unknown;
        if (table === 'programs') data = { id: 'program', name: 'Training', muscle_priorities: {}, total_weeks: 4, focus: 'hypertrophy' };
        else if (table === 'user_profiles') data = { body_weight: 180, experience_level: 'intermediate' };
        else if (table === 'program_days') data = selection.includes('programs!inner')
          ? { id: 'next-day', program_id: 'program', week_number: 1, day_number: 2, label: 'Next', completed: state.completed, skipped: false, programs: [{ id: 'program', name: 'Training', muscle_priorities: {}, total_weeks: 4, focus: 'hypertrophy', user_id: 'user', deleted_at: null }] }
          : selection.includes('programs(total_weeks)')
          ? [{ id: 'finished-day', week_number: 4, programs: [{ total_weeks: 4 }] }]
          : [{ id: 'finished-day', week_number: 1, day_number: 1, label: 'Finished', completed: true, skipped: false }, { id: 'next-day', week_number: 1, day_number: 2, label: 'Next', completed: false, skipped: false }];
        else if (table === 'program_exercises') data = [{ exercise_name: state.belowFloor ? 'Overhead Tricep Extension (Dumbbell)' : 'Row', muscle_group: 'Back', equipment: 'Cable', target_sets: 3, target_reps_min: 8, target_reps_max: 12, target_weight: 100, rir: 2, role: 'Primary' }];
        else if (table === 'program_day_targets') data = state.belowFloor ? [{ exercise_name: 'Overhead Tricep Extension (Dumbbell)', target_sets: 3, target_reps_min: 8, target_reps_max: 6, target_weight: 20, rir: 2 }] : [];
        else if (table === 'workouts') data = [{ id: 'saved-workout', completed_at: '2026-09-25T12:00:00Z', program_day_id: 'finished-day' }];
        // Session edits do not erase the template or previous progression targets.
        else if (table === 'workout_sets') data = state.belowFloor
          ? ['Push-Up', 'Tricep Dips'].map(exercise_name => ({ workout_id: 'saved-workout', exercise_name, weight: 0, reps: 10, reported_rir: 2 }))
          : [{ workout_id: 'saved-workout', exercise_name: 'Row', weight: 100, reps: 10, reported_rir: 2 }];
        else if (table === 'workout_feedback') data = [];
        else if (table === 'exercises') data = [{ name: 'Row', muscle_group: 'Back' }];
        else throw new Error(`Unexpected table ${table}`);
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return query;
  },
} }) }));
beforeEach(() => { vi.stubGlobal('React', React); state.completed = false; state.belowFloor = false; });
describe('workout refresh after an edited session is saved', () => {
  it('loads a retained program exercise after the last session only logged push-ups and dips', async () => {
    state.belowFloor = true;
    const page = await Workout({ searchParams: Promise.resolve({}) });
    const logger = page.props.children[0].props.children;
    expect(logger.props.workout.exercises[0]).toMatchObject({ name: 'Overhead Tricep Extension (Dumbbell)', repsMin: 6, repsMax: 6, weight: 20 });
    expect(Object.keys(logger.props.historyByExercise)).toEqual(['Push-Up', 'Tricep Dips']);
  });
  it('redirects a completed explicit day to its saved day detail after refresh', async () => {
    state.completed = true;
    await expect(Workout({ searchParams: Promise.resolve({ day: 'next-day' }) })).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/programs/program/day/next-day;307;',
    });
  });
  it('preserves deload history while rendering the next workout', async () => {
    const page = await Workout({ searchParams: Promise.resolve({}) });
    const logger = page.props.children[0].props.children;
    expect(logger.props.workout.dayId).toBe('next-day');
    expect(logger.props.historyByExercise.Row[0]).toMatchObject({
      isDeloadSession: true,
      sets: [{ weight: 100, reps: 10, rir: 2 }],
    });
  });
});
