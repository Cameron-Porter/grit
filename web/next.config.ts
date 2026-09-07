import type { NextConfig } from 'next';
import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs';

// Local migration convenience: reuse the existing Expo Supabase credentials.
// Production still requires the explicit NEXT_PUBLIC_* variables from web/.env.example.
if (process.env.NODE_ENV !== 'production') {
  for (const file of ['.env.local', '.env']) {
    try { process.loadEnvFile(path.resolve(process.cwd(), '..', file)); } catch { /* Optional local file. */ }
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.EXPO_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

const nextConfig: NextConfig = {
  // Next's generated agent files would conflict with the repository-level guidance.
  agentRules: false,
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(process.cwd(), '..') },
  experimental: {
    // Next 15+ defaults this to 0s, so every navigation to a dynamic (app) route
    // always re-fetches and shows loading.tsx, even seconds after the last visit.
    // 30s lets a revisit within that window reuse the client router cache instead.
    // Every mutation that should invalidate a still-open tab already calls
    // router.refresh() (workout-logger.tsx) or revalidatePath (programs/actions.ts),
    // which bypasses this regardless of staleness.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googleusercontent.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; frame-src https://checkout.stripe.com https://billing.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
