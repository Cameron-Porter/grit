import { describe, expect, it } from 'vitest';
import { appNavLinks, isActiveAppNavLink } from './app-nav';

describe('app navigation state', () => {
  it('marks a route and its nested pages active without matching siblings', () => {
    expect(isActiveAppNavLink('/programs', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/programs/abc', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/progress', '/programs')).toBe(false);
    expect(isActiveAppNavLink('/workouts', '/workout')).toBe(false);
  });

  it('matches the native five-tab primary navigation', () => {
    expect(appNavLinks.map(({ label, href }) => [label, href])).toEqual([
      ['Home', '/today'],
      ['Workout', '/workout'],
      ['Programs', '/programs'],
      ['Progress', '/history'],
      ['Profile', '/profile'],
    ]);
  });

  it('provides an icon name for every native tab', () => {
    expect(appNavLinks).toHaveLength(5);
    expect(appNavLinks.every((link) => link.icon.length > 0)).toBe(true);
  });

  it('uses a home icon for the dashboard tab and a dumbbell icon for workout', () => {
    expect(appNavLinks[0]).toMatchObject({ label: 'Home', href: '/today', icon: 'home' });
    expect(appNavLinks[1]).toMatchObject({ label: 'Workout', href: '/workout', icon: 'dumbbell' });
  });
});
