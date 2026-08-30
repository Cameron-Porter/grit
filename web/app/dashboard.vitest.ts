import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('authenticated dashboard contract', () => {
  it('routes the root app entry to a lightweight Today page instead of the full dashboard', () => {
    expect(read('app/page.tsx')).toContain("redirect('/today')");
  });

  it('adds Today as the primary native home tab while keeping workout and dashboard as deeper actions', () => {
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

  it('builds the dashboard from real authenticated program, workout, and PR data', () => {
    const dashboard = read('app/(app)/dashboard/page.tsx');
    expect(dashboard).toContain('requireUser()');
    expect(dashboard).toContain("supabase.from('programs')");
    expect(dashboard).toContain("supabase.from('workouts')");
    expect(dashboard).toContain("supabase.from('workout_sets')");
    expect(dashboard).toContain('buildProgressMetrics');
  });

  it('exposes native dashboard sections and contextual actions without adding AI dependency', () => {
    const dashboard = read('app/(app)/dashboard/page.tsx');
    expect(dashboard).toContain('native-dashboard-page');
    expect(dashboard).toContain('Today\'s training');
    expect(dashboard).toContain('Active program');
    expect(dashboard).toContain('Recent progress');
    expect(dashboard).toContain('Start Workout');
    expect(dashboard).toContain('/workout?quick=blank');
    expect(dashboard).not.toContain('requestStructuredProgram');
    expect(dashboard).not.toContain('OPENAI');
    expect(dashboard).not.toContain('GEMINI');
  });
});
