import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:3020';
const outDir = path.resolve(process.cwd(), 'test-results/refactoring-ui-route-audit');
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const basePatterns = new Map([
  ['/', '/'], ['/login', '/login'], ['/privacy', '/privacy'], ['/support', '/support'], ['/terms', '/terms'],
  ['/workout', '/workout'], ['/exercises', '/exercises'], ['/history', '/history'], ['/profile', '/profile'], ['/programs', '/programs'],
  ['/programs/create', '/programs/create'], ['/programs/templates', '/programs/templates'], ['/programs/ai', '/programs/ai'], ['/programs/ai/review', '/programs/ai/review'], ['/progress', '/progress'],
]);
const patternOf = (href) => {
  const clean = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
  // Exact static routes win before dynamic matching so /programs/create and
  // /programs/ai are not misclassified as /programs/[id].
  if (basePatterns.has(clean)) return clean;
  if (/^\/exercises\/[^/]+$/.test(clean)) return '/exercises/[id]';
  if (/^\/history\/[^/]+$/.test(clean)) return '/history/[id]';
  if (/^\/programs\/templates\/[^/]+$/.test(clean)) return '/programs/templates/[id]';
  if (/^\/programs\/[^/]+\/day\/[^/]+$/.test(clean)) return '/programs/[id]/day/[dayId]';
  if (/^\/programs\/[^/]+$/.test(clean)) return '/programs/[id]';
  return null;
};
const seedRoutes = ['/dev-login', '/workout','/programs','/programs/templates','/exercises','/history','/progress','/profile','/programs/create','/programs/ai','/programs/ai/review'];
const viewports = [
  { name: 'mobile', width: 390, height: 844, isMobile: true },
  { name: 'desktop', width: 1280, height: 900, isMobile: false },
];

const browser = await chromium.launch();
const routeByPattern = new Map(basePatterns);
const crawlLog = [];
{
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  for (const route of seedRoutes) {
    let status = null, finalURL = null, error = null;
    try {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      status = response?.status() ?? null;
      finalURL = page.url().replace(baseURL, '') || '/';
      const hrefs = await page.locator('a[href^="/"]').evaluateAll(els => els.map(a => a.getAttribute('href')).filter(Boolean)).catch(() => []);
      for (const href of hrefs) {
        if (href.startsWith('/api') || href.startsWith('/dev-login') || href.includes('logout')) continue;
        const pat = patternOf(href);
        if (pat && !routeByPattern.has(pat)) routeByPattern.set(pat, href.split('#')[0]);
      }
    } catch (e) { error = e.message; }
    crawlLog.push({ route, status, finalURL, error, discovered: Object.fromEntries(routeByPattern) });
  }
  // A second crawl through discovered detail pages exposes nested day routes.
  for (const route of [...routeByPattern.values()]) {
    if (!/^\/programs\/[^/]+$/.test(route) && !/^\/programs\/templates\/[^/]+$/.test(route)) continue;
    let status = null, finalURL = null, error = null;
    try {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      status = response?.status() ?? null;
      finalURL = page.url().replace(baseURL, '') || '/';
      const hrefs = await page.locator('a[href^="/"]').evaluateAll(els => els.map(a => a.getAttribute('href')).filter(Boolean)).catch(() => []);
      for (const href of hrefs) {
        if (href.startsWith('/api') || href.startsWith('/dev-login') || href.includes('logout')) continue;
        const pat = patternOf(href);
        if (pat && !routeByPattern.has(pat)) routeByPattern.set(pat, href.split('#')[0]);
      }
    } catch (e) { error = e.message; }
    crawlLog.push({ route, status, finalURL, error, discovered: Object.fromEntries(routeByPattern) });
  }
  await context.close();
}
const routeEntries = [...routeByPattern.entries()].sort(([a],[b]) => a.localeCompare(b));
const results = [];
for (const viewport of viewports) {
  const context = await browser.newContext({ baseURL, viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile });
  const page = await context.newPage();
  await page.addInitScript(() => window.localStorage.setItem('grit-theme', 'dark'));
  await page.goto('/dev-login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  for (const [pattern, route] of routeEntries) {
    const consoleMessages = [];
    page.removeAllListeners('console');
    page.on('console', msg => { if (['error','warning'].includes(msg.type())) consoleMessages.push(msg.text()); });
    let response = null, navError = null;
    try {
      response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    } catch (error) { navError = error.message; }
    await page.waitForTimeout(250).catch(() => {});
    const safeName = `${viewport.name}-${pattern === '/' ? 'home' : pattern.replace(/^\//,'').replaceAll('/','__').replaceAll('[','').replaceAll(']','')}`.replace(/[^a-zA-Z0-9._-]/g,'_');
    const screenshot = path.join(outDir, `${safeName}.png`);
    const fullScreenshot = path.join(outDir, `${safeName}-full.png`);
    try { await page.screenshot({ path: screenshot, fullPage: false }); } catch {}
    try { await page.screenshot({ path: fullScreenshot, fullPage: true }); } catch {}
    const metrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const h1 = document.querySelector('h1');
      const allControls = [...document.querySelectorAll('button,a.button,a[role="button"],.button,.primary,.quiet,.native-pill-action,.native-icon-action')];
      return {
        title: document.title,
        h1: h1?.textContent?.trim() ?? null,
        mainCount: document.querySelectorAll('main').length,
        textStart: document.body.innerText.slice(0,500),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
        overflowX: document.documentElement.scrollWidth > innerWidth + 1,
        controlsUnder44: allControls.map(el => { const r = el.getBoundingClientRect(); return { text:(el.textContent||'').trim().slice(0,50), w:r.width, h:r.height }; }).filter(x => x.w > 0 && x.h > 0 && (x.w < 44 || x.h < 44)),
        surfaceCount: document.querySelectorAll('.surface,.native-list-card,.native-row,.native-pro-card,.program-card,.exercise-card,.auth-card,.legal-card').length,
      };
    }).catch(error => ({ evalError: error.message }));
    results.push({ pattern, route, viewport: viewport.name, status: response?.status() ?? null, finalURL: page.url().replace(baseURL, '') || '/', navError, screenshot, fullScreenshot, consoleMessages, metrics });
  }
  await context.close();
}
await browser.close();
const report = { baseURL, generatedAt: new Date().toISOString(), crawlLog, routeEntries: Object.fromEntries(routeEntries), results };
await fs.writeFile(path.join(outDir, 'audit-results.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outDir, patterns: routeEntries.length, screenshots: results.length, routeEntries: Object.fromEntries(routeEntries) }, null, 2));
