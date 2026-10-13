import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Read local CSS imports in cascade order so contracts survive file organization. */
export function readStylesheet(file: string): string {
  const absolute = resolve(process.cwd(), file);
  return readFileSync(absolute, 'utf8').replace(/@import\s+['"]([^'"]+)['"];?/g,
    (_, relative: string) => readStylesheet(resolve(dirname(absolute), relative)));
}
