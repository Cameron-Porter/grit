import { expect, test } from '@playwright/test';

const pageRoutes = ['/', '/login', '/privacy', '/terms', '/support'] as const;
const assetRoutes = ['/manifest.webmanifest', '/offline.html'] as const;
const themes = ['light', 'dark'] as const;
const viewports = [
  { name: '320 mobile', width: 320, height: 720, isMobile: true },
  { name: '375 mobile', width: 375, height: 812, isMobile: true },
  { name: '768 tablet', width: 768, height: 1024, isMobile: false },
  { name: 'desktop', width: 1280, height: 900, isMobile: false },
] as const;

test.describe('public PWA acceptance', () => {
  for (const theme of themes) {
    for (const viewport of viewports) {
      test.describe(`${theme} ${viewport.name}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile });

        test.beforeEach(async ({ page }) => {
          await page.addInitScript((themeValue) => {
            window.localStorage.setItem('grit-theme', themeValue);
          }, theme);
        });

        for (const route of pageRoutes) {
          test(`${route} renders without overflow`, async ({ page }) => {
            const response = await page.goto(route, { waitUntil: 'networkidle' });
            expect(response?.status()).toBe(200);
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
            await expect(page.locator('main')).toHaveCount(1);

            const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
            expect(hasHorizontalOverflow).toBe(false);
          });
        }
      });
    }
  }

  for (const route of assetRoutes) {
    test(`${route} responds`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
    });
  }
});
