import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appNavLinks, isActiveAppNavLink } from './app-nav';

describe('app navigation state', () => {
  /**
   * The Progress tab pointed at /history, so /progress - Personal Records - had
   * no link anywhere in the app and could only be reached by typing the URL.
   */
  it('routes the Progress tab to personal records, not to workout history', () => {
    expect(appNavLinks.find((link) => link.label === 'Progress')?.href).toBe('/progress');
  });

  it('keeps the Progress tab current on workout history, which lives under it', () => {
    expect(isActiveAppNavLink('/history', '/progress')).toBe(true);
    expect(isActiveAppNavLink('/history/abc', '/progress')).toBe(true);
    // ...without leaking onto unrelated tabs.
    expect(isActiveAppNavLink('/history', '/programs')).toBe(false);
    expect(isActiveAppNavLink('/history', '/workout')).toBe(false);
  });

  it('labels every tab visibly, not only for screen readers', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/app-nav.tsx'), 'utf8');
    expect(source).toContain('app-nav-label');
    expect(source).not.toContain('className="sr-only">{label}');
  });

  it('marks a route and its nested pages active without matching siblings', () => {
    expect(isActiveAppNavLink('/programs', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/programs/abc', '/programs')).toBe(true);
    expect(isActiveAppNavLink('/progress', '/programs')).toBe(false);
    expect(isActiveAppNavLink('/workouts', '/workout')).toBe(false);
  });

  it('matches the native four-tab primary navigation', () => {
    expect(appNavLinks.map(({ label, href }) => [label, href])).toEqual([
      ['Workout', '/workout'],
      ['Programs', '/programs'],
      ['Progress', '/progress'],
      ['Profile', '/profile'],
    ]);
  });

  it('provides an icon name for every native tab', () => {
    expect(appNavLinks).toHaveLength(4);
    expect(appNavLinks.every((link) => link.icon.length > 0)).toBe(true);
  });

  it('uses a dumbbell icon for workout, the primary tab', () => {
    expect(appNavLinks[0]).toMatchObject({ label: 'Workout', href: '/workout', icon: 'dumbbell' });
  });
});
