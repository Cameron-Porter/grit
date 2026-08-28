import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workoutPageSource = readFileSync(resolve(process.cwd(), 'app/workout/page.tsx'), 'utf8');

describe('blank Quick Workout launch', () => {
  it('reads searchParams so it can recognize ?quick=blank', () => {
    expect(workoutPageSource).toContain('searchParams:Promise<Record<string,string|string[]|undefined>>');
    expect(workoutPageSource).toContain('await searchParams');
  });

  it('recognizes the quick=blank query param', () => {
    expect(workoutPageSource).toMatch(/quick\s*===\s*['"]blank['"]/);
  });

  it('offers a /workout?quick=blank CTA when there is no active program and when the program is complete', () => {
    const matches = workoutPageSource.match(/\/workout\?quick=blank/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('labels the CTA as starting a blank Quick Workout', () => {
    expect(workoutPageSource).toContain('Start blank Quick Workout');
  });
});

describe('exercise history spans all programs', () => {
  it('fetches past workouts without scoping to the active program\'s program_day_id', () => {
    // Regression: history previously only looked at workouts whose program_day_id
    // belonged to the currently active program, so switching programs (e.g. Fall
    // Fitness after Mid Summer) hid all prior sessions of a shared exercise even
    // though workout_sets.exercise_name matched.
    const workoutsQueryMatch = workoutPageSource.match(/supabase\.from\('workouts'\)\.select\([^;]*?\.limit\(40\)/);
    expect(workoutsQueryMatch).not.toBeNull();
    expect(workoutsQueryMatch![0]).not.toContain("program_day_id");
    expect(workoutsQueryMatch![0]).toContain("eq('user_id',user.id)");
  });

  it('shows only the last 3 completed sessions per exercise', () => {
    expect(workoutPageSource).toContain('slice(0,3)');
  });
});
