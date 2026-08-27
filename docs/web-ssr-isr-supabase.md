# GRIT web rendering, Supabase, and PWA architecture

This note documents the intended Next.js App Router architecture for the GRIT web PWA.

## Router model

The web app uses the Next.js App Router under `web/app`. There is no Pages Router implementation.

## Supabase clients

Supabase access is split by runtime:

- `web/lib/supabase/server.ts` creates the server Supabase client with `createServerClient` from `@supabase/ssr` and Next.js cookies.
- `web/lib/supabase/client.ts` creates the browser Supabase client with `createBrowserClient` from `@supabase/ssr`.
- `web/lib/supabase/proxy.ts` refreshes/forwards auth cookies for middleware-style request handling.
- `web/proxy.ts` applies that session refresh to non-static, non-image, non-favicon routes.

Do not use `@supabase/auth-helpers-nextjs`; it is intentionally not part of the app.

## Authentication and session flow

Authenticated pages should call `requireUser()` from `web/lib/auth/require-user.ts`. That helper creates the server Supabase client, calls `supabase.auth.getUser()`, and redirects unauthenticated users to `/login`.

The `(app)` route group is authenticated and declares:

```ts
export const dynamic = 'force-dynamic'
```

That keeps all user-specific app routes request-bound so Supabase receives the current session cookies and RLS continues to enforce per-user access.

## Dynamic SSR routes

These routes are authenticated/user-specific and must remain dynamic SSR, not ISR:

- `/dashboard`
- `/workout`
- `/programs`
- `/programs/create`
- `/programs/[id]`
- `/programs/[id]/day/[dayId]`
- `/programs/ai`
- `/programs/ai/review`
- `/exercises`
- `/exercises/[id]`
- `/history`
- `/history/[id]`
- `/progress`
- `/profile`

Some of these pages read shared catalog data such as exercises or templates, but they are still behind the authenticated app shell and often combine that data with profile, equipment preferences, workout history, subscription state, or mutation controls. Do not place authenticated output in shared ISR caches.

The dashboard uses a short per-user `unstable_cache` with user-specific tags (`dashboardCacheTag(user.id)`). That is not shared ISR; write paths that affect dashboard-visible data invalidate the same tag.

## ISR/public routes

Public routes outside `(app)` may use ISR when they contain no user/session-specific data:

- `/privacy` revalidates every 86400 seconds.
- `/terms` revalidates every 86400 seconds.
- `/support` revalidates every 3600 seconds.

`/login` stays dynamic enough for form-mode feedback and auth redirects. The generated PWA manifest is public app metadata.

## Client Components retained intentionally

Keep Client Components focused on browser interactivity and local state:

- `WorkoutLogger` handles active set entry, timers, local draft persistence, queued offline retry, browser fetch mutations, and `router.refresh()` after sync.
- `PendingWorkoutReconciler` uses browser storage/network state to recover queued workouts.
- `ServiceWorkerRegistration` uses `navigator.serviceWorker` and only runs in production browsers.
- Program builders (`GuidedProgramBuilder`, `AiProgramBuilder`, `AiProgramReview`) manage form state, staged exercises, browser-held AI provider keys, and session/local storage drafts.
- Profile controls such as theme, equipment preferences, AI key settings, and delete-account confirmation require localStorage, DOM, or interactive UI state.
- Dialogs, custom selects, and navigation controls remain client-side when they use browser events or interactive state.

Prefer the pattern:

```text
Server Component fetches initial Supabase data with the current session
  -> passes serializable initial data into a focused Client Component
  -> Client Component handles only live interaction/mutations/browser APIs
```

## Mutations

Use the simplest safe mutation path:

- Server Actions for authenticated form submissions that naturally redirect/revalidate.
- Route Handlers for API-style browser mutations such as workout sync and exercise ordering.
- Client-side browser state for active workout drafts, timers, offline queues, and optimistic interaction.

All authenticated mutations must use the current session and preserve Supabase RLS; avoid service-role clients except narrowly scoped server-only administrative flows.

## PWA/service-worker caching

The PWA manifest, icons, splash assets, service worker registration, and offline fallback remain part of the installable app behavior.

The service worker must not persistently cache authenticated HTML. Its intended behavior is:

- bypass `/api/` and `/auth/` requests;
- network-first navigations with the offline page only as a failure fallback;
- no CacheStorage writes for navigation responses;
- CacheStorage only for `/_next/static/` and explicit static assets.

Authenticated pages are dynamic and user-specific, so caching their HTML as shared ISR or service-worker static output is unsafe.
