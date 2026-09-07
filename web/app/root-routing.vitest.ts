import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('authenticated landing route contract', () => {
  /**
   * Landing on the active workout is unchanged. What changed is the first frame:
   * the entry route was a server redirect to a force-dynamic page, so a cold
   * launch had no HTML to paint until a server function booted - seconds of the
   * PWA's black background colour. The entry is now the static route, which the
   * CDN and the service worker precache can serve instantly.
   */
  it('routes the root app entry into the active workout from a statically painted shell', () => {
    const page = read('app/page.tsx');
    expect(page).toContain('LoadingScreen');
    expect(page).not.toContain("redirect('/workout')");
    expect(read('app/enter-app.tsx')).toContain("router.replace('/workout')");
  });

  it('launches the PWA at the static entry route and precaches it', () => {
    expect(read('app/manifest.ts')).toContain("start_url: '/'");
    // Precaching the shell is what makes that first paint instant offline/cold.
    expect(read('public/sw.js')).toContain("const SHELL='/'");
    expect(read('public/sw.js')).toContain('navigationPreload');
    expect(read('app/(app)/error.tsx')).toContain('href="/workout"');
  });

  it('has scrapped the dashboard and today pages entirely', () => {
    expect(existsSync(resolve(process.cwd(), 'app/(app)/dashboard/page.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'app/(app)/today/page.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'lib/today/cache.ts'))).toBe(false);
    const nav = read('components/app-nav.tsx');
    expect(nav).not.toContain('/dashboard');
    expect(nav).not.toContain('/today');
  });

  it('makes Workout the primary native tab with no separate home tab', () => {
    const nav = read('components/app-nav.tsx');
    expect(nav).toContain("{ label: 'Workout', href: '/workout', icon: 'dumbbell' }");
    expect(nav).not.toContain("label: 'Home'");
  });

  it('delays offline workout reconciliation until the browser is idle', () => {
    const reconciler = read('components/pending-workout-reconciler.tsx');
    expect(reconciler).toContain('requestIdleCallback');
    expect(reconciler).toContain('setTimeout');
    expect(reconciler).not.toContain('void reconcile();');
  });
});
