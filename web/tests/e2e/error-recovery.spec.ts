import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Use the actual boundary markup and app CSS without a production auth session
// or an intentional server crash. No live workout data is read or changed.
for (const boundary of ['app/error.tsx', 'app/(app)/error.tsx']) {
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 390, 1280]) {
      test(`${boundary}: readable recovery controls at ${width}px in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        const source = readFileSync(path.resolve(boundary), 'utf8');
        const markup = source.slice(source.indexOf('return <main') + 7, source.indexOf('</main>') + 7)
          .replaceAll('className=', 'class=')
          .replace('onClick={() => reset()}', '');
        await page.setContent(`<html data-theme="${theme}"><body>${markup}</body></html>`);
        await page.addStyleTag({ content: readFileSync(path.resolve('app/globals.css'), 'utf8').replace(/^@import[^;]+;/gm, '') });
        const actions = page.locator('.error-actions');
        const retry = actions.getByRole('button', { name: 'Try again' });
        const home = actions.getByRole('link');
        const layout = await actions.evaluate(el => {
          const box = el.getBoundingClientRect();
          const children = Array.from(el.children).map(child => {
            const rect = child.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(child);
            const text = range.getBoundingClientRect();
            return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, height: rect.height,
              textFits: text.left >= rect.left && text.right <= rect.right && text.top >= rect.top && text.bottom <= rect.bottom };
          });
          return { display: getComputedStyle(el).display, fontSize: getComputedStyle(el).fontSize,
            width: box.width, children, viewport: innerWidth };
        });
        expect(layout.display).toBe('flex');
        expect(parseFloat(layout.fontSize)).toBeLessThan(24);
        for (const child of layout.children) {
          expect(child.height).toBeGreaterThanOrEqual(44);
          expect(child.x).toBeGreaterThanOrEqual(0);
          expect(child.right).toBeLessThanOrEqual(layout.viewport);
          expect(child.textFits).toBe(true);
        }
        const [a, b] = layout.children;
        expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true);
        await page.keyboard.press('Tab');
        await expect(retry).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(home).toBeFocused();
        await expect(home).toHaveAttribute('href', '/workout');
        await page.screenshot({ path: test.info().outputPath('error-recovery.png') });
      });
    }
  }
}
