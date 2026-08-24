# Deploy, Rollback, Backup, and Webhook Replay

Operational runbook for the GRIT PWA (`web/`) and its Supabase backend. The
production web app deploys through Vercel with the project Root Directory set
to `web`, where the actual Next.js app and dependency lockfile live.

No production secrets are recorded here or anywhere in the repository. Real
values live only in the hosting provider's environment configuration and in
`web/.env.local` (git-ignored). `web/.env.example` documents which keys are
required — see [`web/README.md`](../web/README.md#required-production-environment)
for the full list.

## Before any deploy

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:rules
```

All five must pass locally before a deploy goes out. The GitHub quality
workflow also runs these gates for `main` changes.

## Deploy

1. Confirm the target environment has every key from
   [`web/.env.example`](../web/.env.example) set, with real values supplied
   by the hosting provider's secret store — never by editing `.env.example`
   or committing a filled-in `.env` file.
2. Apply pending Supabase migrations **before** deploying app code that
   depends on them. Per this repo's Supabase rules (`CLAUDE.md`), agents only
   generate migration files under `supabase/migrations/`; a human runs:

   ```bash
   supabase db push
   ```

   against the target project. Never run this from an agent session.
3. Build and deploy the `web/` Next.js app through Vercel's git-triggered
   flow. The Vercel project settings and checked-in `web/vercel.json` must
   stay aligned with the nested PWA:

   - Root Directory: `web` — Vercel must detect `web/package.json`, where
     `next` is declared.
   - `installCommand: npm ci` installs dependencies from `web/package-lock.json`.
   - `buildCommand: npm run build` runs the `web/package.json` build script.
   - `outputDirectory: .next` points Vercel at the generated Next.js build
     output relative to `web`.

   Do not leave the project Root Directory at the repository root. The root
   package has no Next.js dependency, so Vercel cannot detect the framework
   there and preview builds fail before `next build` runs.
4. Verify the deploy:

   ```bash
   curl -sI https://<deployed-origin>/           # 200
   curl -sI https://<deployed-origin>/manifest.webmanifest
   curl -sI https://<deployed-origin>/offline.html
   ```

   Then manually confirm: sign-in works, a workout can be logged and saved,
   and (if billing is enabled in that environment) a Stripe test-mode
   checkout completes and updates entitlement.
5. Confirm `APP_URL` matches the deployed origin exactly — it drives the
   Google OAuth callback (`web/lib/env/app-url.ts`). A mismatch here is the
   known cause of the OAuth failure logged on the kanban ("Google OAuth
   sign-in fails on the deployed/production PWA"). Stripe checkout and portal
   return URLs still use the active request origin until billing canonical-origin
   work resumes.

## Rollback

**Application code** — rollback is redeploying the last known-good build:

- If the host builds from git, redeploy the previous commit/tag (`git
  revert` or redeploy a pinned prior deployment/build artifact — most hosts
  keep prior builds available for instant rollback; use that instead of a
  fresh rebuild when speed matters).
- Do not `git push --force` or rewrite history to "undo" a bad deploy — roll
  forward with a revert commit, or use the host's rollback-to-previous-build
  feature.

**Database migrations** — Supabase/Postgres migrations in this repo are
forward-only; there is no `supabase db push --down`. To roll back a bad
migration:

1. Write a new migration under `supabase/migrations/` that reverses the
   change (drop the column/policy/function that was added, or re-add what
   was dropped).
2. Never hand-edit or delete an already-applied migration file — the
   migration history table on the live project has already recorded it.
3. If the migration corrupted or lost data, restore from backup (below)
   into a scratch project first, extract the needed rows, and write a
   corrective migration/data fix rather than restoring the whole production
   database over live traffic unless data loss is severe enough to justify
   the downtime.

## Backup

Supabase-hosted projects take automatic daily backups (retention depends on
plan tier) — check the project's Database → Backups page for what's
currently available before assuming a manual dump is the only copy.

For a manual point-in-time dump (schema + data), run against a **read
replica or off-peak window**, using credentials from the hosting provider's
secret store, never hardcoded:

```bash
# Schema only — safe to keep in version control review, contains no data
supabase db dump --db-url "$SUPABASE_DB_URL" -f backup_schema.sql --schema public

# Full data dump — treat as sensitive, do not commit, store encrypted
supabase db dump --db-url "$SUPABASE_DB_URL" -f backup_data.sql --data-only
```

Take a manual dump immediately before:

- Any migration that drops or alters a column with existing data.
- Any bulk backfill or data-fix script.
- Any account-deletion or entitlement-migration change.

Store dumps in the hosting/secrets provider's encrypted storage, not in this
repository, not in chat, not in an issue tracker attachment.

## Webhook replay (Stripe)

The billing webhook handler (`web/app/api/billing/webhook/route.ts`) is
idempotent and order-safe by design — `shouldApplyStripeSubscriptionEvent`
(`web/lib/billing/webhook-ordering.ts`) compares the incoming event's
`created` timestamp and `id` against `stripe_subscription_event_created` /
`stripe_subscription_event_id` already stored on the profile (added in
migration `20260818124000_harden_stripe_webhook_ordering.sql`), and ignores
anything not strictly newer. That means **replaying an old or duplicate
event is always safe** — it will be accepted and no-op, never regress
billing state to a stale value.

To replay a missed or failed event:

- **Stripe Dashboard:** Developers → Webhooks → select the endpoint → find
  the event → "Resend". Requires dashboard access to the relevant Stripe
  account; not something to script from here.
- **Stripe CLI**, for local/staging verification:

  ```bash
  stripe events resend evt_xxx
  # or replay a whole class of events against a local/staging listener:
  stripe listen --forward-to localhost:3000/api/billing/webhook
  stripe trigger customer.subscription.updated
  ```

After a replay, confirm `user_profiles.stripe_subscription_status` and
`stripe_subscription_event_id` updated as expected — do not assume success
from a 200 response alone, since the handler returns `{ received: true,
ignored: true }` (also a 200) when it correctly no-ops an out-of-order or
duplicate event.

## Secret handling

- `STRIPE_WEBHOOK_SECRET`, `STRIPE_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
  are server-only. Never prefix them `NEXT_PUBLIC_`, never log them, never
  paste them into a commit, PR description, issue, or chat message.
- If a secret is ever exposed (committed, logged, pasted into a shared
  channel), rotate it immediately in the provider's dashboard (Stripe API
  keys, Supabase service-role key, Sentry auth token) — treat rotation as
  mandatory, not optional cleanup.
- Prefer a least-privilege Stripe **restricted key** (`rk_`) over the
  unrestricted secret key, scoped to only the resources the webhook/billing
  code touches.
- This document intentionally contains no real project URLs, keys, or
  project refs. Fill in placeholders like `<deployed-origin>` from the
  target environment's own configuration, never from a value copied out of
  a chat, ticket, or this file.
