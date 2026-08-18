import type { NextConfig } from 'next';
import path from 'node:path';

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
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.openai.com https://generativelanguage.googleapis.com; frame-src https://checkout.stripe.com https://billing.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] }];
  },
};

export default nextConfig;
