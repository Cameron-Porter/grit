import { updateSession } from '@/lib/supabase/proxy';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|plate-icon.png|sw.js).*)'],
};
