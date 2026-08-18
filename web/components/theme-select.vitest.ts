// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { storedDarkMode, themeBootstrapScript } from './theme-select';

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

describe('pre-paint theme bootstrap script', () => {
  const runScript = (saved: string | null, systemDark: boolean) => {
    const store = new Map<string, string>();
    if (saved !== null) store.set('grit-theme', saved);
    const sandbox = {
      localStorage: { getItem: (key: string) => store.get(key) ?? null },
      window: { matchMedia: () => ({ matches: systemDark }) },
      document: { documentElement: { dataset: {} as Record<string, string> } },
    };
    // eslint-disable-next-line no-new-func -- exercising the literal script injected into <head>, not a proxy for it.
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
