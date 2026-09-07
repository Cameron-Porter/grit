import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appNavLinks, isActiveAppNavLink } from './app-nav';

describe('app navigation state', () => {
  /**
   * Personal records has no tab of its own, so it has to be linked from
   * somewhere: previously nothing in the app pointed at /progress and it could
   * only be reached by typing the URL. The tab bar stays icon-only by design.
   */
  it('links personal records from the pages that lead to it', () => {
    const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
    expect(read('app/(app)/history/page.tsx')).toContain('href="/progress"');
    expect(read('app/(app)/profile/page.tsx')).toContain('href="/progress"');
    // ...and personal records links back to workout history, so the pair is closed.
    expect(read('app/(app)/progress/page.tsx')).toContain('href="/history"');
  });

  it('keeps the Progress tab current while on personal records, which lives under it', () => {
    expect(isActiveAppNavLink('/progress', '/history')).toBe(true);
    expect(isActiveAppNavLink('/progress', '/programs')).toBe(false);
    expect(isActiveAppNavLink('/progress', '/workout')).toBe(false);
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
      ['Progress', '/history'],
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
