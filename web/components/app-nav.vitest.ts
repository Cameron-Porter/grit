import { describe, expect, it } from 'vitest';
import { appNavLinks, isActiveAppNavLink } from './app-nav';

describe('app navigation state', () => {
  it('marks a route and its nested pages active without matching siblings', () => {
    expect(isActiveAppNavLink('/programs', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/programs/abc', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/progress', '/programs')).toBe(false);
    expect(isActiveAppNavLink('/workouts', '/workout')).toBe(false);
  });

  it('matches the native four-tab primary navigation', () => {
    expect(appNavLinks.map(({ label, href }) => [label, href])).toEqual([
      ['Today', '/workout'],
      ['Programs', '/programs'],
      ['Progress', '/history'],
      ['Profile', '/profile'],
    ]);
  });

  it('provides an icon name for every native tab', () => {
    expect(appNavLinks).toHaveLength(4);
    expect(appNavLinks.every((link) => link.icon.length > 0)).toBe(true);
  });

  it('uses a dumbbell icon for the workout tab', () => {
    expect(appNavLinks[0]).toMatchObject({ label: 'Today', href: '/workout', icon: 'dumbbell' });
  });
});
