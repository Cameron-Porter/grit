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

  /**
   * Light mode used to set color:#fff on the bare `button` selector, which
   * outranked .quiet/.secondary/.feedback-option - those override the background
   * but not the colour, so they rendered white text on a white sheet and were
   * unreadable. Filled buttons take their contrast from --on-accent per theme,
   * so no rule may colour every button again.
   */
  it('never paints every button white, which made transparent buttons unreadable in light mode', () => {
    const css = read('app/globals.css');
    for (const rule of css.split('}')) {
      if (!/color:\s*#fff/i.test(rule)) continue;
      const selector = rule.slice(0, rule.indexOf('{'));
      const targetsEveryButton = selector.split(',').some((part) => /(^|\s)button$/.test(part.trim()));
      expect(targetsEveryButton).toBe(false);
    }
    // The per-theme token that filled buttons actually rely on must exist.
    expect(css).toContain('--on-accent:#fff');
    expect(css).toContain('--on-accent:#0e1114');
    expect(css).toContain('color:var(--on-accent');
  });

  it('centres button labels, including wrapped ones, while list-style rows stay leading', () => {
    const css = read('app/globals.css');
    expect(css).toContain('.native-pill-action,.native-icon-action{text-align:center}');
    expect(css).toContain('.native-pill-action{white-space:nowrap}');
    expect(css).toContain('.command-row,.sheet-action-row,.custom-select-trigger');
  });

  it('uses the shared Blaze & Alpine brand palette without RP/red or jade polish tokens', () => {
    const css = read('app/globals.css');
    // Intentional brand update: these values now match the my-website palette.
    expect(css).toContain('--primary:#ff7a2f'); // blaze, dark
    expect(css).toContain('--highlight:#38bdf8'); // alpine, dark
    expect(css).toContain('--bg:#0e1114');
    expect(css).toContain('--primary:#b03a0a'); // blaze, light
    expect(css).toContain('--highlight:#0369a1'); // alpine, light
    expect(css).not.toContain('--rp-action');
    expect(css).not.toContain('#e73d3b');
    expect(css).not.toContain('#2fbf8f'); // retired jade
    expect(css).not.toContain('#e8b84b'); // retired gold
  });

  it('ports the site signal motifs: blaze/alpine channels, ambient wash, edge bar, and hazard rule', () => {
    const css = read('app/globals.css');
    expect(css).toContain('--blaze-rgb:255 122 47');
    expect(css).toContain('--alpine-rgb:56 189 248');
    // The page background is deliberately flat: the ambient blaze/alpine wash was
    // dropped so the accents stay on actions rather than tinting every screen.
    expect(css).toContain('body,.native-gradient-background{background:var(--bg)}');
    expect(css).not.toContain('--wash-ridge');
    expect(css).toContain('--glow-blaze:');
    expect(css).toContain('.rule-speed{');
    expect(css).toContain('.edge::before{');
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
    expect(logger).toContain('native-command-menu');
    expect(logger).toContain('native-set-menu-cell');
    expect(logger).toContain('WEIGHT');
    expect(logger).toContain('RIR');
    expect(logger).toContain('LOG');
    expect(logger).not.toContain('rir-target');
    expect(css).toContain('native-rest-progress');
    expect(css).toContain('sheet-action-row');
    expect(css).toContain('grid-template-columns:44px minmax(72px,1fr) minmax(72px,1fr) 54px 64px');
  });

  /**
   * Intentional pattern change: the workout menus were full-width bottom sheets
   * carrying an inline note textarea and replace dropdown. They are now compact
   * command popovers anchored to their own vertical-dots trigger, and the two
   * heavy controls moved into their own follow-up sheets. program-card still uses
   * the bottom sheet, so the sheet CSS below must survive alongside the popover.
   */
  it('opens workout exercise and set menus as anchored command popovers', () => {
    const logger = read('components/workout-logger.tsx');
    const css = read('app/globals.css');
    expect(logger).toContain('native-modal-menu');
    expect(logger).toContain('native-command-menu');
    expect(logger).toContain('command-menu-panel');
    expect(logger).toContain('command-menu-title');
    expect(logger).toContain('View history');
    expect(logger).toContain('native-exercise-history');
    expect(logger).toContain('Skip set');
    expect(logger).toContain('Remove exercise');
    expect(logger).toContain('closeWorkoutMenus');
    // Command rows carry an icon plus a text label, and the destructive row is toned.
    expect(logger).toContain('<CommandRow icon="trash" tone="danger" label="Remove exercise"');
    expect(logger).toContain('MENU_ICON_PATHS');
    // The panel is fixed and JS-placed because .native-workout-card clips its children.
    expect(css).toContain('.native-modal-menu.native-command-menu[open] .command-menu-panel{position:fixed!important');
    expect(css).toContain('.command-row{');
    expect(css).toContain('.command-row:disabled{');
    expect(logger).toContain('menuPlacement');
    // menuPlacement() clamps against the panel width, so the two must stay in sync.
    expect(css).toContain('width:min(272px,calc(100vw - 16px))!important');
    expect(logger).toContain('export const MENU_WIDTH = 272;');
    // History sets render one row each rather than a single joined string.
    expect(logger).toContain('history-set-rows');
    expect(css).toContain('.history-set-rows>li{');
    expect(css).toContain('.native-modal-menu[open]::before');
    expect(css).toContain('position:fixed!important;z-index:150');
    // program-card's bottom sheet is untouched by the workout-menu change.
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

  /**
   * Loading states moved from an inline native-empty-state into a shared
   * full-viewport LoadingScreen. /workout is the landing route and sits outside
   * the (app) group, so it inherited no loading.tsx at all and showed nothing
   * for the whole server render - it needs its own.
   */
  it('uses a shared full-viewport loading screen, including on the /workout landing route', () => {
    const screen = read('app/loading-screen.tsx');
    expect(screen).toContain('loading-screen');
    expect(screen).toContain('native-gradient-background');
    expect(screen).toContain('aria-busy');
    for (const route of ['app/(app)/loading.tsx', 'app/workout/loading.tsx']) {
      expect(read(route)).toContain('LoadingScreen');
    }
    const css = read('app/globals.css');
    expect(css).toContain('.loading-screen{');
    expect(css).toContain('width:100vw');
    expect(css).toContain('min-height:100dvh');
  });

  it('uses native empty-state shells for app error states', () => {
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
