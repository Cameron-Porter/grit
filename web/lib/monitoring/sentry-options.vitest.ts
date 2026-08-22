import { describe, expect, it } from 'vitest';
import { sentryOptions } from './sentry-options';

describe('sentryOptions', () => {
  it('keeps Sentry disabled when no DSN is configured', () => {
    expect(sentryOptions({})).toMatchObject({ enabled: false, dsn: undefined });
  });

  it('uses conservative production sampling when DSN is configured', () => {
    expect(sentryOptions({ NEXT_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/1', NODE_ENV: 'production' })).toMatchObject({
      dsn: 'https://example@sentry.io/1',
      enabled: true,
      environment: 'production',
      tracesSampleRate: 0.05,
    });
  });

  it('allows explicit trace sample overrides for temporary diagnostics', () => {
    expect(sentryOptions({ NEXT_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/1', SENTRY_TRACES_SAMPLE_RATE: '0.2' }).tracesSampleRate).toBe(0.2);
    expect(sentryOptions({ NEXT_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/1', SENTRY_TRACES_SAMPLE_RATE: 'invalid' }).tracesSampleRate).toBe(0.05);
  });
});
