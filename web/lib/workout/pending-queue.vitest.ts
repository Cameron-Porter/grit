import { describe, expect, it, vi } from 'vitest';
import { pendingWorkoutQueuePrefix, reconcilePendingWorkouts } from './pending-queue';

function storage(entries: Record<string, string>) {
  const store = new Map(Object.entries(entries));
  return {
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    has: (key: string) => store.has(key),
  };
}

describe('pending workout queue reconciliation', () => {
  it('finds only the signed-in user queued workout keys', () => {
    expect(pendingWorkoutQueuePrefix('user-1')).toBe('grit-web-workout-queue:user-1:');
  });

  it('posts queued workouts and clears their queued and draft copies after a successful retry', async () => {
    const queuedKey = 'grit-web-workout-queue:user-1:day-1';
    const draftKey = 'grit-web-workout:user-1:day-1';
    const local = storage({ [queuedKey]: JSON.stringify({ workoutId: 'w1' }), [draftKey]: 'draft', 'grit-web-workout-queue:user-2:day-1': '{}' });
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ saved: true }), { status: 200 }));

    await expect(reconcilePendingWorkouts({ userId: 'user-1', storage: local, fetcher })).resolves.toEqual({ synced: 1, failed: 0 });

    expect(fetcher).toHaveBeenCalledWith('/api/workouts', expect.objectContaining({ method: 'POST', body: JSON.stringify({ workoutId: 'w1' }) }));
    expect(local.has(queuedKey)).toBe(false);
    expect(local.has(draftKey)).toBe(false);
    expect(local.has('grit-web-workout-queue:user-2:day-1')).toBe(true);
  });

  it('keeps queued work when the retry fails or the payload is unreadable', async () => {
    const queuedKey = 'grit-web-workout-queue:user-1:day-1';
    const local = storage({ [queuedKey]: '{not-json' });
    const fetcher = vi.fn();

    await expect(reconcilePendingWorkouts({ userId: 'user-1', storage: local, fetcher })).resolves.toEqual({ synced: 0, failed: 1 });

    expect(fetcher).not.toHaveBeenCalled();
    expect(local.has(queuedKey)).toBe(true);
  });
});
