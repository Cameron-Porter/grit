import { defineConfig } from 'vitest/config';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');

export default defineConfig({
  root: repoRoot,
  resolve: {
    alias: {
      '@grit': path.resolve(repoRoot, 'src'),
      '@': path.resolve(repoRoot, 'src'),
    },
  },
  test: {
    include: [
      '__tests__/rules/**/*.test.ts',
      '__tests__/deploy/**/*.test.ts',
      'src/data/__tests__/**/*.test.ts',
      'src/utils/__tests__/**/*.test.ts',
    ],
    globals: true,
  },
});
