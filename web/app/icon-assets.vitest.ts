import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import sharp from 'sharp';

describe('transparent public icons', () => {
  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['plate-icon.png', 512]] as const) {
    it(`${name} preserves its size and has a transparent exterior`, async () => {
      const { data, info } = await sharp(resolve(process.cwd(), 'public', name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(size);
      expect(info.height).toBe(size);
      const alpha = (x: number, y: number) => data[(y * size + x) * 4 + 3];
      for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1], [Math.floor(size / 2), 0]]) {
        expect(alpha(x, y)).toBe(0);
      }
      // Preserve the dark interior: the generated cutout has near-opaque alpha
      // (253), so allow minor alpha variation instead of requiring exactly 255.
      expect(alpha(Math.floor(size / 2), Math.floor(size / 2))).toBeGreaterThanOrEqual(250);
    });
  }
});
