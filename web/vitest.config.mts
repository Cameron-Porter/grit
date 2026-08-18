import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@grit': path.resolve(import.meta.dirname, '..', 'src'), '@': path.resolve(import.meta.dirname) } },
  test: { include: ['**/*.vitest.ts'] },
});
