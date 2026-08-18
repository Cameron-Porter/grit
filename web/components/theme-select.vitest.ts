import { describe, expect, it } from 'vitest';
import { storedDarkMode } from './theme-select';

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
