import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');
const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  main?: string;
  scripts?: Record<string, string>;
};
const webPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('PWA-only root project commands', () => {
  it('routes default root commands to the Next PWA rather than Expo native tooling', () => {
    expect(rootPackage.main).toBeUndefined();
    expect(rootPackage.scripts?.start).toBe('npm --prefix web run dev --');
    expect(rootPackage.scripts?.build).toBe('npm --prefix web run build');
    expect(rootPackage.scripts?.test).toBe('npm --prefix web test');
    expect(rootPackage.scripts?.typecheck).toBe('npm --prefix web run typecheck');
    expect(rootPackage.scripts?.lint).toBe('npm --prefix web run lint');
    expect(rootPackage.scripts).not.toHaveProperty('android');
    expect(rootPackage.scripts).not.toHaveProperty('ios');
  });

  it('uses a checked-in ESLint configuration for the PWA lint gate', () => {
    expect(webPackage.scripts?.lint).toBe('eslint . --max-warnings=0');
    expect(existsSync(resolve(process.cwd(), 'eslint.config.mjs'))).toBe(true);
    expect(webPackage.devDependencies).toHaveProperty('eslint');
    expect(webPackage.devDependencies).toHaveProperty('typescript-eslint');
  });
});
