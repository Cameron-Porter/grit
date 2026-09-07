'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Moves the launch route on to the workout screen once the static shell has
 * painted. `replace` rather than `push` so the shell never becomes a back-button
 * destination the user can land on again.
 */
export function EnterApp() {
  const router = useRouter();
  useEffect(() => { router.replace('/workout'); }, [router]);
  return null;
}
