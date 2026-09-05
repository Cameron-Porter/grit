import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('exact native app port contracts', () => {
  it('loads Inter for interface copy and Sora for headings', () => {
    const layout = read('app/layout.tsx');
    const fonts = read('app/fonts.ts');
    const css = read('app/globals.css');
    expect(fonts).toContain("Inter({");
    expect(fonts).toContain("Sora({");
    expect(layout).toContain('inter.variable');
    expect(layout).toContain('sora.variable');
    expect(css).toContain('font-family:var(--font-inter)');
    expect(css).toContain('font-family:var(--font-sora)');
  });

  /**
   * body's overflow-x:hidden makes it a scroll container (html's overflow has
   * already propagated to the viewport), and it exactly fits its own content.
   * overscroll-behavior-y:none on body therefore blocks body->viewport scroll
   * chaining and freezes wheel/touch scrolling app-wide. It belongs on html
   * alone, where it propagates to the viewport and suppresses rubber-banding.
   * tests/e2e/public-pwa.spec.ts asserts the resulting behaviour in a browser;
   * this guards the declaration itself in the default unit run.
   */
  it('scopes overscroll suppression to html so body never blocks scroll chaining', () => {
    const css = read('app/globals.css');
    expect(css).toContain('html{overscroll-behavior-y:none}');

    const selectorsSuppressingOverscroll = css
      .split('}')
      .filter((rule) => rule.includes('overscroll-behavior-y:none'))
      .map((rule) => rule.slice(0, rule.indexOf('{')).split(',').map((part) => part.trim()));
    expect(selectorsSuppressingOverscroll.length).toBeGreaterThan(0);
    for (const selectors of selectorsSuppressingOverscroll) expect(selectors).not.toContain('body');
  });

  it('uses the shared jade and gold brand palette without RP/red polish tokens', () => {
    const css = read('app/globals.css');
    // Intentional brand update: these values now match the my-website palette.
    expect(css).toContain('--primary:#2fbf8f');
    expect(css).toContain('--highlight:#e8b84b');
    expect(css).toContain('--bg:#0b0d10');
    expect(css).toContain('--primary:#0e7a54');
    expect(css).toContain('--highlight:#93690f');
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
    expect(profile).toContain('auto_match_weight');
    expect(profile).toContain('autoMatchWeight');
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
    // z-index bumped from 80 to 150 so the sheet backdrop renders above .app-nav
    // (z-index:100) instead of being covered by it - see native-workout-screen fix.
    expect(css).toContain('position:fixed!important;z-index:150');
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
