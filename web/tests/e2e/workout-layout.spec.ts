import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Exercise actual page/header markup with app styles without requiring live user data.
const read = (file: string) => readFileSync(path.resolve(__dirname, '../../', file), 'utf8');
const source = read('app/workout/page.tsx');
const css = read('app/workout-controls.css') + read('app/globals.css').replace(/^@import[^;]+;/gm, '');
const empty = source.match(/<main[^>]+><section[^>]+><h1>No active program[\s\S]*?<\/main>/)![0];
const header = read('components/workout-logger.tsx').match(/<header className="page-header workout-heading[\s\S]*?<\/header>/)![0]
  .replace(/\{workoutHeadingCopy\(workout\)\.eyebrow &&[\s\S]*?<\/div>\}/, '')
  .replace('{workoutHeadingCopy(workout).title}', 'Pull')
  .replace('{workoutHeadingCopy(workout).subtitle}', 'Current program')
  .replace('{completed}/{total}', '0/12')
  .replace('{workout.dayId && ', '').replace('</a>}', '</a>');

for (const theme of ['light', 'dark']) {
  for (const width of [320, 390, 768, 1024, 1280]) {
    for (const view of ['empty', 'quick', 'program']) {
      test(`${view} centered and contained: ${theme}, ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        const markup = view === 'empty' ? empty : `<main class="app-shell page-frame workout-page"><div class="native-workout-screen">${view === 'program' ? header : '<header><h1>Quick Workout</h1></header><section class="surface empty-state"><h2>No exercises scheduled</h2><p>Add an exercise to get started.</p></section>'}</div></main>`;
        await page.setContent(`<html data-theme="${theme}"><body>${markup.replaceAll('className=', 'class=')}</body></html>`);
        await page.addStyleTag({ content: css });
        const child = page.locator('main > :first-child');
        const frame = await page.locator('main').boundingBox();
        expect(await page.locator('main').evaluate(el => getComputedStyle(el).paddingTop)).toBe('28px');
        const content = await child.boundingBox();
        expect(Math.abs(content!.x + content!.width / 2 - (frame!.x + frame!.width / 2))).toBeLessThan(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const action = page.getByRole('link').first();
        if (view !== 'quick') {
          await page.keyboard.press('Tab');
          await expect(action).toBeFocused();
          expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          expect(await action.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none');
        }
        if (view === 'program') {
          await expect(action).toHaveAttribute('href', '/workout?quick=blank');
          expect(await action.evaluate(el => getComputedStyle(el).borderRadius)).toBe('999px');
        }
      });
    }
  }
}

// Most app pages put .content inside the frame; workout and root errors put
// the padding-bearing class on the frame itself. Both need one top inset.
for (const theme of ['light', 'dark']) {
  for (const width of [390, 768, 1024, 1280]) {
    test(`shared page top spacing: ${theme}, ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const classes of ['content native-page', 'content native-profile-page']) {
        for (const nested of [true, false]) {
          const content = `<main class="${classes}${nested ? '' : ' page-frame'}"><header class="native-page-header"><h1>Page title</h1></header></main>`;
          await page.setContent(`<html data-theme="${theme}"><body>${nested ? `<div class="page-frame">${content}</div>` : content}</body></html>`);
          await page.addStyleTag({ content: css });
          expect((await page.locator('header').boundingBox())!.y).toBe(28);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
      }
    });
  }
}
