import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('authenticated dashboard contract', () => {
  it('routes the root app entry to the native dashboard instead of login-first flow', () => {
    expect(read('app/page.tsx')).toContain("redirect('/dashboard')");
  });

  it('adds dashboard as the primary native home tab while keeping workout as a quick action', () => {
    const nav = read('components/app-nav.tsx');
    expect(nav).toContain("{ label: 'Home', href: '/dashboard', icon: 'home' }");
    expect(nav).toContain("{ label: 'Workout', href: '/workout', icon: 'dumbbell' }");
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
