import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
const login = readFileSync(resolve(process.cwd(), 'app/login/page.tsx'), 'utf8');

describe('RP Hypertrophy inspired Apple-level polish', () => {
  it('uses the RP reference charcoal and red palette as named premium tokens', () => {
    expect(css).toContain('--rp-bg:#131416');
    expect(css).toContain('--rp-panel:#252627');
    expect(css).toContain('--rp-action:#e73d3b');
  });

  it('defines Apple-quality elevation, typography, and glass surfaces for every app page', () => {
    for (const token of ['--apple-shadow-lg', '--apple-hairline', 'rp-polish-shell', 'rp-glass-panel', 'rp-primary-action']) {
      expect(css).toContain(token);
    }
  });

  it('puts the login screen on the polished RP/Apple presentation shell', () => {
    expect(login).toContain('rp-polish-shell');
    expect(login).toContain('rp-glass-panel');
    expect(login).toContain('rp-primary-action');
  });
});
