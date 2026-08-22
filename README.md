# G.R.I.T.

**Guided Results & Intelligent Training**

G.R.I.T. is a Next.js PWA for lifters who want structured, progressive training without unnecessary complexity. It combines evidence-informed hypertrophy principles with a deterministic rules engine, mobile-first workout logging, program generation, and long-term progress tracking in an installable web app.

---

## Current Direction

The product is **PWA-only**. The Next.js app under `web/` is the production client; root-level commands route to that PWA. Expo/React Native app entrypoints, native build configuration, and native runtime dependencies have been removed. Shared training logic remains in `src/` for the PWA to import and test.

Stripe/billing work is intentionally not part of this cleanup pass.

---

## What's Built

### Workout Logging

- Launch the active program day or start a blank Quick Workout
- Log sets with weight, reps, and reported RIR
- Prompt for RIR after completed sets with plain-language effort descriptions
- Add, remove, or replace exercises in-session with conservative reset behavior
- Local draft recovery plus queued finish retry when the network drops
- Per-exercise notes and per-muscle feedback capture

### Program Management

- Program list/detail pages with active-program selection
- Manual program creation with editable week-one templates
- Same-muscle exercise replacement to preserve weekly volume intent
- AI-assisted program builder and review flow behind the existing Pro entitlement guard

### Rules-Based Training Engine

The PWA reuses the deterministic TypeScript rules engine in `src/`:

| Module | Responsibility |
|---|---|
| `splitDeriver` | Selects a training split from frequency and priorities |
| `volumeBudget` | Calculates weekly set targets by focus and priority |
| `assignment` | Distributes muscles across sessions |
| `slotBuilder` | Builds exercise slots with sets/reps/RIR prescriptions |
| `sessionTrimmer` | Enforces session set and exercise caps |
| `progressionEngine` | Calculates week-over-week targets, RIR tapering, deloads, and bodyweight progression |
| `validation` | Audits generated programs before save |

Every training parameter in the rules engine must remain doctrine-tagged and covered by behavior tests.

### PWA Features

- Next.js 16 app router with React 19
- Installable manifest with standalone display, icons, shortcuts, scope, and app identity
- Service worker for static asset caching and offline fallback shell
- Mobile-first responsive workout UI
- Light/dark theme support before first paint
- Legal/support routes: `/privacy`, `/terms`, `/support`
- Supabase Auth/Postgres/RLS backend
- Sentry web instrumentation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web app | Next.js 16 PWA, React 19, TypeScript |
| Backend | Supabase PostgreSQL/Auth/RLS |
| Tests | Vitest for PWA and shared rules-engine coverage |
| Monitoring | Sentry for Next.js |
| Billing | Stripe code exists but is not part of the current PWA-only cleanup pass |

---

## Local Development

Install root and web dependencies, then run the PWA:

```bash
npm install
npm --prefix web install
npm run dev
```

Open `http://localhost:3000`.

## Verification

Root commands are PWA-first:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Rules-engine regression tests remain available while the shared engine lives in `src/`:

```bash
npm run test:rules
```

---

## Design Principles

- **Mobile-first web UX.** The PWA must preserve the fast workout loop that made the native app useful.
- **Evidence-informed, not magic.** Rules are deterministic, auditable, doctrine-tagged, and test-backed.
- **User control.** Recommendations are suggestions users can understand and override.
- **One live exercise catalog.** Supabase remains the source of truth for exercise rows and equipment.

---

## License

Private repository. All rights reserved.
