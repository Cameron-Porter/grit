# PWA Browser Acceptance Matrix

This records the local runtime browser sweep for the public GRIT PWA surfaces. The authenticated workout/program/profile flows still require a seeded authenticated account or staging credentials and are tracked separately in Obsidian.

## 2026-08-21 local public-page sweep

- Server: production build served by `next start` at `http://127.0.0.1:3000` with non-secret dummy Supabase public env values.
- Browser: Playwright Chromium headless, installed under the user Playwright cache for this verification run.
- Checked-in automation: `npm run pwa:e2e` / `npm --prefix web run test:e2e` runs `web/tests/e2e/public-pwa.spec.ts` with `web/playwright.config.ts`.
- Themes: light and dark via `localStorage.grit-theme`.
- Viewports: 320×720, 375×812, 768×1024, 1280×900.
- Routes checked: `/`, `/login`, `/privacy`, `/terms`, `/support`; `/manifest.webmanifest` and `/offline.html` returned HTTP 200 but are excluded from app-theme/main-landmark assertions because the manifest is JSON and the offline fallback is a static shell asset.
- Result: 40 page/theme/viewport combinations checked; 0 failures for HTTP status, horizontal overflow, theme restoration, or missing `<main>`.

## Current limitations

- This is not a substitute for the full authenticated workout-loop acceptance pass. The core `/workout`, `/programs`, `/progress`, `/profile`, and exercise-management flows need a real authenticated staging session and representative data.
- Browser-use Chrome was unavailable in the Hermes browser harness (`chrome-not-running`), so this sweep used Playwright Chromium instead.
- Lighthouse/axe are not installed in the project. Adding them should happen with the CI quality-gate work so the dependency and browser install are intentional rather than an ad hoc local-only change.

## Re-run recipe

```bash
npm run build
npm run pwa:e2e
```

The Playwright config starts `next start` on a non-default local port with non-secret dummy Supabase public env values unless `PLAYWRIGHT_BASE_URL` is supplied.
