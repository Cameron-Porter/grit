import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('authenticated landing route contract', () => {
  it('routes the root app entry straight into the active workout', () => {
    expect(read('app/page.tsx')).toContain("redirect('/workout')");
  });

  it('sends the PWA start_url and error-boundary fallback to the active workout too', () => {
    expect(read('app/manifest.ts')).toContain("start_url: '/workout'");
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
