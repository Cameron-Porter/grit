# GRIT PWA

The production web client is a Next.js TypeScript PWA backed by the same Supabase project and training rules as the native app.

## Local development

From the repository root:

```bash
npm install
npm --prefix web install
npm run pwa:dev
```

Open `http://localhost:3000`. During local development, the PWA can reuse the root Expo Supabase variables. You can instead create `web/.env.local` from `web/.env.example`.

## Required production environment

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
SUPABASE_SERVICE_ROLE_KEY=
```

Use a least-privilege Stripe restricted key where supported. The Supabase service-role key is server-only and is used by the verified Stripe webhook; never expose it with a `NEXT_PUBLIC_` prefix.

## Database

Apply the repository migrations before deploying the web client. The PWA depends on the Stripe profile columns, `reported_rir`, and the atomic `save_web_workout` RPC. User-data queries remain RLS/auth scoped.

## Stripe

Create a recurring Price and set its ID as `STRIPE_PRO_PRICE_ID`. Register the production webhook endpoint:

```text
https://YOUR_DOMAIN/api/billing/webhook
```

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the signing secret to `STRIPE_WEBHOOK_SECRET`. Checkout and the Billing Portal are created server-side; subscription state is changed only by signed webhook events.

## Release checks

```bash
npm run pwa:typecheck
npm run pwa:test
npm run pwa:build
npm test -- --no-coverage
```

PWA installation and service workers require HTTPS outside localhost. The service worker caches only versioned same-origin static assets and never caches authenticated pages, Supabase traffic, auth callbacks, or API responses.
