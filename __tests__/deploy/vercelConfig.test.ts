import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

const vercelConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf-8'));
const rootPackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));

describe('vercel.json deploy config', () => {
  // Regression test for the "sh: line 1: next: command not found" Vercel
  // build failure: the Next.js app lives in web/, but the repo's Vercel
  // Root Directory is "/". Without an explicit installCommand, Vercel's
  // default `npm install` only installs the (dependency-less) root
  // package.json and never populates web/node_modules, so `next` is never
  // on PATH when the root "build" script delegates into web/.
  it('installs web/ dependencies before building, mirroring CI', () => {
    expect(vercelConfig.installCommand).toBe('npm ci --prefix web');
  });

  it('declares the Next.js framework so Vercel packages web/.next output correctly', () => {
    expect(vercelConfig.framework).toBe('nextjs');
  });

  it('points outputDirectory at web/.next, since builds run with cwd=web', () => {
    expect(vercelConfig.outputDirectory).toBe('web/.next');
  });

  it('buildCommand runs the root "build" script, which delegates into web/', () => {
    expect(vercelConfig.buildCommand).toBe('npm run build');
    expect(rootPackageJson.scripts.build).toBe('npm --prefix web run build');
  });
});
