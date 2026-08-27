// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initialDarkFromDataset, storedDarkMode, themeBootstrapScript } from './theme-select';

describe('dark mode toggle', () => {
  it('uses an explicit saved preference', () => {
    expect(storedDarkMode('dark', false)).toBe(true);
    expect(storedDarkMode('light', true)).toBe(false);
  });
  it('uses the system preference when no explicit choice exists', () => {
    expect(storedDarkMode(null, true)).toBe(true);
    expect(storedDarkMode('system', false)).toBe(false);
  });
});

describe('initial switch position', () => {
  it('reads the theme already applied to the DOM instead of always starting false', () => {
    // Regression guard: the switch previously always mounted unchecked, then flipped via
    // an effect after mount, animating a visible slide-to-enabled whenever dark mode was
    // already active. It must now derive its initial value from the attribute the
    // pre-paint bootstrap script already set, matching on the very first render.
    expect(initialDarkFromDataset('dark')).toBe(true);
    expect(initialDarkFromDataset('light')).toBe(false);
    expect(initialDarkFromDataset(undefined)).toBe(false);
  });
});

describe('pre-paint theme bootstrap script', () => {
  const runScript = (saved: string | null, systemDark: boolean) => {
    const store = new Map<string, string>();
    if (saved !== null) store.set('grit-theme', saved);
    const sandbox = {
      localStorage: { getItem: (key: string) => store.get(key) ?? null },
      window: { matchMedia: () => ({ matches: systemDark }) },
      document: { documentElement: { dataset: {} as Record<string, string> } },
    };
    new Function('localStorage', 'window', 'document', themeBootstrapScript)(sandbox.localStorage, sandbox.window, sandbox.document);
    return sandbox.document.documentElement.dataset.theme;
  };

  it('matches storedDarkMode for every saved/system combination', () => {
    for (const saved of ['dark', 'light', null, 'system']) {
      for (const systemDark of [true, false]) {
        const expected = storedDarkMode(saved, systemDark) ? 'dark' : 'light';
        expect(runScript(saved, systemDark)).toBe(expected);
      }
    }
  });
});
