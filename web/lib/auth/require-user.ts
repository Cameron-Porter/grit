import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;
export type SessionUser = { id: string; email: string | null };

/**
 * auth.getUser() asks the Supabase Auth server whether the token is still good
 * on every request - measured at ~45ms of pure network per render, paid before
 * a single data query starts. getClaims() verifies the same JWT locally against
 * the project's cached JWKS: ~1ms, no network.
 *
 * This is the read path only, and it does not weaken authorization: RLS still
 * scopes every query server-side, so a claim cannot reach data its user does not
 * own. The trade is that a session revoked mid-token stays usable until the
 * access token expires. The routes where that matters - account deletion,
 * billing, and workout writes - call supabase.auth.getUser() themselves and keep
 * the strict server check.
 *
 * cache() dedupes it within a request too, since the (app) layout and the page
 * it renders both call requireUser(). It is per-request: nothing is retained
 * across requests or shared between users.
 */
const getSessionUser = cache(async (): Promise<{ supabase: ServerClient; user: SessionUser | null }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const id = typeof claims?.sub === 'string' ? claims.sub : null;
  if (error || !id || !claims) return { supabase, user: null };
  return { supabase, user: { id, email: typeof claims.email === 'string' ? claims.email : null } };
});

export async function requireUser() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  return { supabase, user };
}
