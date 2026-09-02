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

  it('has scrapped the dashboard page entirely', () => {
    expect(existsSync(resolve(process.cwd(), 'app/(app)/dashboard/page.tsx'))).toBe(false);
    expect(read('app/(app)/today/page.tsx')).not.toContain('/dashboard');
    expect(read('components/app-nav.tsx')).not.toContain('/dashboard');
  });

  it('adds Today as the primary native home tab while keeping workout as a deeper action', () => {
    const nav = read('components/app-nav.tsx');
    expect(nav).toContain("{ label: 'Home', href: '/today', icon: 'home' }");
    expect(nav).toContain("{ label: 'Workout', href: '/workout', icon: 'dumbbell' }");
  });

  it('keeps the Today launch route focused on critical workout-start data only', () => {
    const today = read('app/(app)/today/page.tsx');
    expect(today).toContain('requireUser()');
    expect(today).toContain("supabase.from('programs')");
    expect(today).toContain("supabase.from('program_days')");
    expect(today).toContain('Start Workout');
    expect(today).toContain('/workout?quick=blank');
    expect(today).not.toContain("supabase.from('workouts')");
    expect(today).not.toContain("supabase.from('workout_sets')");
    expect(today).not.toContain('buildProgressMetrics');
  });

  it('delays offline workout reconciliation until the browser is idle', () => {
    const reconciler = read('components/pending-workout-reconciler.tsx');
    expect(reconciler).toContain('requestIdleCallback');
    expect(reconciler).toContain('setTimeout');
    expect(reconciler).not.toContain('void reconcile();');
  });
});
