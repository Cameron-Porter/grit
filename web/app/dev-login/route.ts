import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Local-development convenience: signs in with credentials from .env.local so
 * localhost doesn't need a manual login on every fresh session.
 *
 * This deliberately does NOT bypass authentication — it performs a real
 * password sign-in and gets a real, RLS-scoped session, so the app behaves
 * exactly as it does in production and `requireUser()` is untouched. The route
 * is hard-gated three ways: it 404s unless NODE_ENV is development (which
 * `next build`/`next start` and any hosted deploy never are), and it refuses to
 * run unless both dev credentials are explicitly present in the environment.
 */
export const dynamic = 'force-dynamic';

const notFound = () => new NextResponse('Not found', { status: 404 });

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return notFound();

  const email = process.env.DEV_LOGIN_EMAIL;
  const password = process.env.DEV_LOGIN_PASSWORD;
  if (!email || !password) {
    return new NextResponse(
      'Dev login is not configured. Add DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD to .env.local (see .env.example), then restart the dev server.',
      { status: 500, headers: { 'content-type': 'text/plain' } },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return new NextResponse(`Dev login failed: ${error.message}`, { status: 401, headers: { 'content-type': 'text/plain' } });
  }

  return NextResponse.redirect(new URL('/workout', new URL(request.url).origin));
}
