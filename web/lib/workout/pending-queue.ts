type PendingWorkoutStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'removeItem'>;
type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export const pendingWorkoutQueuePrefix = (userId: string) => `grit-web-workout-queue:${userId}:`;
const draftKeyForQueueKey = (queueKey: string) => queueKey.replace('grit-web-workout-queue:', 'grit-web-workout:');

export async function reconcilePendingWorkouts({ userId, storage, fetcher }: { userId: string; storage: PendingWorkoutStorage; fetcher: Fetcher }) {
  const prefix = pendingWorkoutQueuePrefix(userId);
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key?.startsWith(prefix)));
  let synced = 0, failed = 0;
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    let payload: unknown;
    try { payload = JSON.parse(raw); }
    catch { failed++; continue; }
    try {
      const response = await fetcher('/api/workouts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) { failed++; continue; }
      storage.removeItem(key);
      storage.removeItem(draftKeyForQueueKey(key));
      synced++;
    } catch { failed++; }
  }
  return { synced, failed };
}
