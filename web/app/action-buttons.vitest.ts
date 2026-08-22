import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
const workoutPage = readFileSync(resolve(process.cwd(), 'app/workout/page.tsx'), 'utf8');
const programsPage = readFileSync(resolve(process.cwd(), 'app/(app)/programs/page.tsx'), 'utf8');

describe('standardized action button/link contract', () => {
  it('gives every action class (primary/secondary/quiet/danger/button-link) the shared geometry contract', () => {
    expect(globalsCss).toMatch(
      /\.primary,\.secondary,\.quiet,\.danger,\.button-link,button\{display:inline-flex;min-height:48px;align-items:center;justify-content:center;border:0;border-radius:14px;padding:0 22px;font-weight:750;cursor:pointer;text-decoration:none;margin:0\}/,
    );
  });

  it('never reintroduces a bare .button-link rule carrying its own default top margin', () => {
    expect(globalsCss).not.toMatch(/\.button-link\{[^}]*margin-top/);
  });

  it('stacks empty-state actions in a centered column instead of leaving them to inline flow', () => {
    expect(globalsCss).toMatch(/\.empty-state\{text-align:center;padding:32px;display:grid;justify-items:center;gap:10px\}/);
  });

  it('keeps the workout empty-state "View programs" link on the standardized secondary action contract', () => {
    expect(workoutPage).toMatch(/<a className="secondary button-link" href="\/programs">View programs<\/a>/);
  });

  it('keeps the Programs page "Templates" header action on the standardized pill header-action contract used by its peers', () => {
    expect(programsPage).toMatch(
      /<Link className="secondary button-link compact header-action" href="\/programs\/templates">Templates<\/Link>/,
    );
  });
});
