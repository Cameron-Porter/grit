import { describe, expect, it } from 'vitest';
import { appNavLinks, isActiveAppNavLink } from './app-nav';

describe('app navigation state', () => {
  it('marks a route and its nested pages active without matching siblings', () => {
    expect(isActiveAppNavLink('/programs', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/programs/abc', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/progress', '/programs')).toBe(false);
    expect(isActiveAppNavLink('/workouts', '/workout')).toBe(false);
  });

  it('includes the exercise catalog as a first-class PWA route', () => {
    expect(appNavLinks).toContainEqual(['Exercises', '/exercises']);
  });
});
