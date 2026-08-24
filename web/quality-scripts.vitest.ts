import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');
const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const webPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
describe('web quality scripts', () => {
  it('exposes an explicit unit test script separate from the rules-engine gate', () => {
    expect(webPackage.scripts?.['test:unit']).toBe('vitest run');
    expect(webPackage.scripts?.['test:rules']).toBe('vitest run --config vitest.rules.config.mts');
  });

  it('exposes a moderate-severity audit script', () => {
    expect(webPackage.scripts?.audit).toBe('npm audit --audit-level=moderate');
  });

  it('exposes a single quality script that chains lint, typecheck, unit, rules, and build', () => {
    expect(webPackage.scripts?.quality).toBe(
      'npm run lint && npm run typecheck && npm run test:unit && npm run test:rules && npm run build',
    );
  });
});

describe('root quality script wrappers', () => {
  it('delegates the new quality scripts to the web app', () => {
    expect(rootPackage.scripts?.['test:unit']).toBe('npm --prefix web run test:unit');
    expect(rootPackage.scripts?.audit).toBe('npm --prefix web run audit');
    expect(rootPackage.scripts?.quality).toBe('npm --prefix web run quality');
  });
});
