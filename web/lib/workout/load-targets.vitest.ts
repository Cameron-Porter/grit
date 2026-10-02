import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { loadWorkoutTargets } from './load-targets';

function database({ user = true, week = 2 }: { user?: boolean; week?: number | null } = {}) {
  const db = {
    auth: { getUser: vi.fn(async () => ({ data: { user: user ? { id: 'owner' } : null } })) },
    from: vi.fn((table: string) => {
      let selection = '';
      const query = {
        select(value: string) { selection = value; return query; },
        eq() { return query; }, is() { return query; }, order() { return query; }, limit() { return query; },
        maybeSingle() { return query; },
        then(resolve: (value: unknown) => unknown) {
          const data = table === 'program_days'
            ? selection.includes('!inner')
              ? { program_id: 'program', week_number: week, day_number: 1, programs: { total_weeks: 6, focus: 'hypertrophy', muscle_priorities: {} } }
              : { id: 'template' }
            : table === 'user_profiles' ? { body_weight: 180, experience_level: 'intermediate' } : [];
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return query;
    }),
  };
  return { db, client: db as unknown as SupabaseClient };
}

it('requires authentication before loading user data without trusted server inputs', async () => {
  const { db, client } = database({ user: false });
  await expect(loadWorkoutTargets(client, 'day')).rejects.toMatchObject({ status: 401 });
  expect(db.from).not.toHaveBeenCalled();
});

it('keeps the prefetched and standalone loader results identical', async () => {
  const standalone = database(), prefetched = database();
  const expected = await loadWorkoutTargets(standalone.client, 'day');
  const result = await loadWorkoutTargets(prefetched.client, 'day', {
    userId: 'owner', programId: 'program', weekNumber: 2, dayNumber: 1, totalWeeks: 6,
    focus: 'hypertrophy', musclePriorities: {}, profile: { body_weight: 180, experience_level: 'intermediate' },
  });
  expect(result).toEqual(expected);
  expect(prefetched.db.auth.getUser).not.toHaveBeenCalled();
  expect(prefetched.db.from).not.toHaveBeenCalledWith('user_profiles');
});

it('loads missing schedule context when only authenticated user inputs are supplied', async () => {
  const { client } = database();
  expect(await loadWorkoutTargets(client, 'day', { userId: 'owner' })).toMatchObject({ userId: 'owner', bodyWeight: 180, templateDayId: 'template' });
});

it('rejects an incomplete stored schedule instead of calculating with an undefined week', async () => {
  const { client } = database({ week: null });
  await expect(loadWorkoutTargets(client, 'day')).rejects.toMatchObject({ status: 503, message: expect.stringContaining('schedule is incomplete') });
});
