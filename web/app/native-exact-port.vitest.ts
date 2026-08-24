import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('exact native app port contracts', () => {
  it('keeps the native teal Cool Slate palette and does not ship RP/red polish tokens', () => {
    const css = read('app/globals.css');
    expect(css).toContain('--primary:#78d58b');
    expect(css).toContain('--highlight:#a5e5b2');
    expect(css).toContain('--bg:#101216');
    expect(css).not.toContain('--rp-action');
    expect(css).not.toContain('#e73d3b');
  });

  it('defines web equivalents for native GradientBackground, grouped settings, row menus, and iOS controls', () => {
    const css = read('app/globals.css');
    for (const contract of ['native-gradient-background', 'native-screen-scroll', 'native-settings-group', 'native-settings-row', 'native-inline-menu', 'native-switch']) {
      expect(css).toContain(contract);
    }
  });

  it('ports profile to the native More/Profile grouped section pattern while retaining AI key settings', () => {
    const profile = read('app/(app)/profile/page.tsx');
    expect(profile).toContain('native-profile-page native-gradient-background');
    expect(profile).toContain('native-profile-hero');
    expect(profile).toContain('native-settings-group');
    expect(profile).toContain('<AiKeySettings/>');
  });

  it('ports workout surfaces to native workout card and sticky finish patterns', () => {
    const logger = read('components/workout-logger.tsx');
    expect(logger).toContain('native-workout-screen');
    expect(logger).toContain('native-workout-card');
    expect(logger).toContain('native-set-row');
    expect(logger).toContain('native-finish-bar');
  });

  it('keeps secondary/deep-link pages on the same native shell and list-card pattern', () => {
    for (const file of [
      'app/(app)/exercises/[id]/page.tsx',
      'app/(app)/programs/[id]/page.tsx',
      'app/(app)/programs/templates/page.tsx',
      'app/(app)/programs/templates/[id]/page.tsx',
    ]) {
      const source = read(file);
      expect(source).toContain('native-gradient-background');
      expect(source).toMatch(/native-(page-header|list-card|section|settings-group)/);
    }
  });
});
