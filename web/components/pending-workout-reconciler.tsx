'use client';

import { useEffect } from 'react';
import { reconcilePendingWorkouts } from '@/lib/workout/pending-queue';

export function PendingWorkoutReconciler({ userId }: { userId: string }) {
  useEffect(() => {
    let cancelled = false;
    const reconcile = async () => {
      if (cancelled || !navigator.onLine) return;
      await reconcilePendingWorkouts({ userId, storage: window.localStorage, fetcher: fetch });
    };
    void reconcile();
    window.addEventListener('online', reconcile);
    return () => {
      cancelled = true;
      window.removeEventListener('online', reconcile);
    };
  }, [userId]);
  return null;
}
