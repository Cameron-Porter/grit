import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './lib/monitoring/sentry-options';

Sentry.init({
  ...sentryOptions(process.env),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NEXT_PUBLIC_SENTRY_DSN ? 0.1 : 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
