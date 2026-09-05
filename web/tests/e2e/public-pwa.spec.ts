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

  /**
   * Regression guard for the app-wide scroll freeze: html's overflow-x:hidden
   * propagates to the viewport, which leaves body's own overflow-x:hidden in
   * force and makes body a scroll container that exactly fits its content.
   * Adding overscroll-behavior-y:none to body then blocks body->viewport scroll
   * chaining, so wheel and touch scroll nothing at all while window.scrollTo()
   * still works. Assert real input scrolling, not just that the page is tall.
   */
  test('wheel input scrolls the document on a page taller than the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Public routes are short by design; give the document real overflow to scroll.
    await page.evaluate(() => {
      const filler = document.createElement('div');
      filler.style.height = '3000px';
      document.body.appendChild(filler);
    });
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1)).toBe(true);

    // Real wheel input, not window.scrollTo - the programmatic API kept working
    // throughout the bug because it addresses the viewport without chaining.
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // The suppression itself must survive: html keeps it, body must never have it.
    const overscroll = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).overscrollBehaviorY,
      body: getComputedStyle(document.body).overscrollBehaviorY,
    }));
    expect(overscroll.html).toBe('none');
    expect(overscroll.body).not.toBe('none');
  });

  test('login screen switches into selectable signup mode', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login', { waitUntil: 'networkidle' });

    await expect(page.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/login?mode=signup');
    await page.getByRole('link', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/\/login\?mode=signup$/);
    await expect(page.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });
});
