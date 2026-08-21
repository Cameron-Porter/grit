# GRIT PWA

The production client is a Next.js TypeScript PWA backed by Supabase and the shared deterministic training rules in `src/`.

## Local development

From the repository root:

```bash
npm install
npm --prefix web install
npm run dev
```

Open `http://localhost:3000`. Prefer `web/.env.local` from `web/.env.example` for local setup.

## Required production environment

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
SUPABASE_SERVICE_ROLE_KEY=
```

Use a least-privilege Stripe restricted key where supported. The Supabase service-role key is server-only; never expose it with a `NEXT_PUBLIC_` prefix.

## Database

Apply the repository migrations before deploying the web client. The PWA depends on `reported_rir`, `program_day_targets`, and the atomic `save_web_workout` RPC. User-data queries remain RLS/auth scoped.

## PWA install behavior

- Manifest route: `/manifest.webmanifest`
- Start URL: `/workout`
- Scope: `/`
- Display: standalone
- Static offline fallback: `/offline.html`
- Service worker: caches same-origin static assets only; it does **not** cache authenticated pages, Supabase requests, auth callbacks, API responses, or billing routes.

PWA installation and service workers require HTTPS outside localhost.

## Release checks

Root commands are PWA-first:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Shared rules-engine regression tests are still available while the PWA imports the engine from `src/`:

```bash
npm run test:rules
```
