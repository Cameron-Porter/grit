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
