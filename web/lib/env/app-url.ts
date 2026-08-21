type AppUrlEnv = { APP_URL?: string | undefined };

export function getCanonicalAppUrl(env: AppUrlEnv, requestOrigin?: string | null) {
  const candidate = env.APP_URL?.trim() || requestOrigin?.trim();
  if (!candidate) throw new Error('APP_URL is not configured and no request origin was available.');

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('APP_URL must be an absolute http(s) URL.');
  }

  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('APP_URL must use https outside localhost.');
  }

  return url.origin;
}

export function getOAuthCallbackUrl(env: AppUrlEnv, requestOrigin?: string | null) {
  return `${getCanonicalAppUrl(env, requestOrigin)}/auth/callback`;
}
