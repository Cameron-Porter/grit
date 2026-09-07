import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('./enter-app', () => ({ EnterApp: () => null }));

const { default: Home } = await import('./page');

describe('root route', () => {
  /**
   * This used to assert a server redirect to /workout. A redirect returns a 307
   * with no body, and /workout is force-dynamic, so a cold launch waited on a
   * server function before the browser had anything to paint - seconds of the
   * PWA's black background colour. The route is now static and paints a loading
   * screen immediately, then routes on to /workout from the client. Landing on
   * the active workout is unchanged; only what happens first is.
   */
  it('paints a loading screen immediately instead of a bodiless redirect', () => {
    const html = renderToStaticMarkup(Home() as React.ReactElement);
    expect(html).toContain('loading-screen');
    expect(html).toContain('aria-busy');
  });

  it('still lands on the active workout, now from the client', () => {
    expect(String(EnterAppSource)).toContain("router.replace('/workout')");
  });
});

const EnterAppSource = (await import('node:fs')).readFileSync(
  (await import('node:path')).resolve(process.cwd(), 'app/enter-app.tsx'), 'utf8',
);
