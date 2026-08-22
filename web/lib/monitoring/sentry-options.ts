type SentryEnvironment = Record<string, string | undefined>;

function sampleRate(value: string | undefined) {
  if (!value) return 0.05;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.05;
}

export function sentryOptions(env: SentryEnvironment) {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: env.SENTRY_ENVIRONMENT ?? env.VERCEL_ENV ?? env.NODE_ENV ?? 'development',
    release: env.SENTRY_RELEASE ?? env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: sampleRate(env.SENTRY_TRACES_SAMPLE_RATE),
  };
}
