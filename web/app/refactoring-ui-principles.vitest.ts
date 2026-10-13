import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = () => readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

describe('Refactoring UI design-system contracts', () => {
  it('documents the constrained spacing, type, and elevation scales used for new UI decisions', () => {
    const source = css();
    for (const token of [
      '--ru-space-1:4px',
      '--ru-space-2:8px',
      '--ru-space-3:12px',
      '--ru-space-4:16px',
      '--ru-space-5:24px',
      '--ru-space-6:32px',
      '--ru-space-7:48px',
      '--ru-space-8:64px',
      '--ru-space-9:96px',
      '--ru-text-xs:12px',
      '--ru-text-sm:14px',
      '--ru-text-base:16px',
      '--ru-text-lg:18px',
      '--ru-text-xl:20px',
      '--ru-text-2xl:24px',
      '--ru-text-3xl:30px',
      '--ru-text-4xl:36px',
      '--ru-shadow-1:0 1px 3px hsla(0,0%,0%,.2)',
      '--ru-shadow-5:0 15px 35px hsla(0,0%,0%,.2)',
    ]) {
      expect(source).toContain(token);
    }
  });

  it('keeps theme palette roles in HSL instead of opaque hex swatches', () => {
    const source = css();
    for (const role of ['bg', 'surface', 'surface2', 'surface3', 'text', 'muted', 'primary', 'highlight', 'success', 'warning', 'error']) {
      expect(source).toMatch(new RegExp(`--${role}:hsl\\(`));
    }
    expect(source).not.toMatch(/--(?:bg|surface|surface2|surface3|text|muted|primary|highlight|success|warning|error):#[0-9a-f]{3,6}/i);
  });

  it('preserves hierarchy by role: one primary action color, neutral secondary actions, and toned destructive actions', () => {
    const source = css();
    expect(source).toContain('--on-accent');
    expect(source).toContain(':is(button.secondary,a.secondary,.button-link.secondary){border-color:var(--border)!important;color:var(--text)!important;background:var(--surface2)!important}');
    expect(source).toContain('.danger{color:var(--error)}');
    expect(source).toContain('.native-profile-page>.danger-zone .danger{border:1px solid hsl(4, 76%, 40%)!important;background:hsl(4, 76%, 40%)!important;color:hsl(0, 0%, 100%)!important}');
  });

  it('does not generate palette shades with runtime lighten/darken helpers or em-based font sizing', () => {
    const source = css();
    expect(source).not.toMatch(/\b(?:lighten|darken)\(/);
    expect(source).not.toMatch(/font-size:\s*[^;}]*\bem\b/);
  });
});
