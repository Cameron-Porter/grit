'use client';

import { useEffect } from 'react';
import { reconcilePendingWorkouts } from '@/lib/workout/pending-queue';

export function PendingWorkoutReconciler({ userId }: { userId: string }) {
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof window.setTimeout> | undefined;
    let idleId: number | undefined;

    const reconcile = async () => {
      if (cancelled || !navigator.onLine) return;
      await reconcilePendingWorkouts({ userId, storage: window.localStorage, fetcher: fetch });
    };

    const scheduleReconcile = () => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => void reconcile(), { timeout: 3000 });
        return;
      }

      timeoutId = globalThis.setTimeout(() => void reconcile(), 1500);
    };

    scheduleReconcile();
    window.addEventListener('online', reconcile);
    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      window.removeEventListener('online', reconcile);
    };
  }, [userId]);
  return null;
}
