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
    const css = read('app/globals.css') + read('app/rest-timer.css') + read('app/workout-controls.css');
    expect(logger).toContain('native-workout-screen');
    expect(logger).toContain('native-workout-card');
    expect(logger).toContain('native-muscle-stripe');
    expect(logger).toContain('native-set-row');
    expect(logger).toContain('native-finish-bar');
    expect(logger).toContain('native-bottom-sheet');
    expect(logger).toContain('native-set-menu-cell');
    expect(logger).toContain('WEIGHT');
    expect(logger).toContain('RIR');
    expect(logger).toContain('LOG');
    expect(logger).not.toContain('rir-target');
    expect(css).toContain('native-rest-progress');
    expect(css).toContain('sheet-action-row');
    expect(css).toContain('grid-template-columns:44px minmax(72px,1fr) minmax(72px,1fr) 54px 64px');
  });

  it('opens workout exercise and set menus as dimmed bottom modal sheets', () => {
    const logger = read('components/workout-logger.tsx');
    const css = read('app/globals.css');
    expect(logger).toContain('native-modal-menu');
    expect(logger).toContain('View history');
    expect(logger).toContain('native-exercise-history');
    expect(logger).toContain('Skip set');
    expect(logger).toContain('closeWorkoutMenus');
    expect(css).toContain('.native-modal-menu[open]::before');
    expect(css).toContain('position:fixed!important;z-index:80');
    expect(css).toContain('backdrop-filter:blur(8px)');
    expect(css).toContain('border-radius:26px 26px 0 0');
  });

  it('keeps secondary/deep-link pages on the same native shell and list-card pattern', () => {
    for (const file of [
      'app/(app)/exercises/[id]/page.tsx',
      'app/(app)/history/[id]/page.tsx',
      'app/(app)/programs/[id]/page.tsx',
      'app/(app)/programs/templates/page.tsx',
      'app/(app)/programs/templates/[id]/page.tsx',
    ]) {
      const source = read(file);
      expect(source).toContain('native-gradient-background');
      expect(source).toMatch(/native-(page-header|list-card|section|settings-group)/);
    }
  });

  it('uses native empty-state shells for app loading and error states', () => {
    expect(read('app/(app)/loading.tsx')).toContain('native-empty-state');
    expect(read('app/(app)/loading.tsx')).toContain('native-gradient-background');
    expect(read('app/(app)/error.tsx')).toContain('native-empty-state');
    expect(read('app/(app)/error.tsx')).toContain('native-gradient-background');
  });

  it('keeps AI program flows and workout empty states on the native shell', () => {
    for (const file of ['components/ai-program-builder.tsx', 'components/ai-program-review.tsx']) {
      const source = read(file);
      expect(source).toContain('native-gradient-background');
      expect(source).toMatch(/native-(page-header|settings-group|section|list-card|empty-state)/);
    }
    const workoutPage = read('app/workout/page.tsx');
    expect(workoutPage).toContain('native-gradient-background');
    expect(workoutPage).toContain('native-empty-state');
  });
});
