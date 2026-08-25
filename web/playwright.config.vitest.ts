import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = ['PLAYWRIGHT_BASE_URL', 'PLAYWRIGHT_SKIP_BUILD', 'PLAYWRIGHT_PORT'] as const;
const previous: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    previous[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

async function loadConfig(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  Object.assign(process.env, overrides);
  vi.resetModules();
  const mod = await import('./playwright.config');
  return mod.default;
}

const port = 3010;
const baseURL = `http://127.0.0.1:${port}`;
const envPrefix = `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy APP_URL=${baseURL}`;
const startCommand = `${envPrefix} npm run start -- -H 127.0.0.1 -p ${port}`;

describe('local Playwright webServer', () => {
  it('builds a production bundle before starting it when nothing else is configured', async () => {
    const config = await loadConfig({});
    const webServer = config.webServer as { command: string };
    expect(webServer.command).toBe(`${envPrefix} npm run build && ${startCommand}`);
  });

  it('skips the build when PLAYWRIGHT_SKIP_BUILD=1, since the CI workflow already built', async () => {
    const config = await loadConfig({ PLAYWRIGHT_SKIP_BUILD: '1' });
    const webServer = config.webServer as { command: string };
    expect(webServer.command).toBe(startCommand);
  });

  it('omits the managed webServer entirely when PLAYWRIGHT_BASE_URL points at a running server', async () => {
    const config = await loadConfig({ PLAYWRIGHT_BASE_URL: 'http://example.test' });
    expect(config.webServer).toBeUndefined();
  });
});
