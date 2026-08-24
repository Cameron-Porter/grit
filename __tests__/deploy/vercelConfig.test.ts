import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const webRoot = path.join(repoRoot, 'web');

const vercelConfig = JSON.parse(fs.readFileSync(path.join(webRoot, 'vercel.json'), 'utf-8'));
const webPackageJson = JSON.parse(fs.readFileSync(path.join(webRoot, 'package.json'), 'utf-8'));

describe('Vercel deploy config', () => {
  // Regression coverage for Vercel failing before the build with
  // "No Next.js version detected" / "next: command not found". The Vercel
  // project Root Directory must be `web`, where the real Next package and
  // lockfile live, rather than the dependency-less repository root.
  it('keeps the checked-in Vercel config scoped to the web app root', () => {
    expect(fs.existsSync(path.join(repoRoot, 'vercel.json'))).toBe(false);
    expect(fs.existsSync(path.join(webRoot, 'package-lock.json'))).toBe(true);
    expect(webPackageJson.dependencies).toHaveProperty('next');
  });

  it('uses the web app install command so next is installed before build', () => {
    expect(vercelConfig.installCommand).toBe('npm ci');
  });

  it('declares the Next.js framework so Vercel packages .next output correctly', () => {
    expect(vercelConfig.framework).toBe('nextjs');
  });

  it('points outputDirectory at the web-root .next build output', () => {
    expect(vercelConfig.outputDirectory).toBe('.next');
  });

  it('runs the web package build script directly from the Vercel root directory', () => {
    expect(vercelConfig.buildCommand).toBe('npm run build');
    expect(webPackageJson.scripts.build).toBe('next build');
  });
});
