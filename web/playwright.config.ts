import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3010);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

// The CI workflow already runs `npm run build` as its own gated step, so it sets
// PLAYWRIGHT_SKIP_BUILD=1 to avoid building the app twice. A local run without that
// flag has no guarantee a fresh production build exists, so it builds first.
const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === '1';
const envPrefix = `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy APP_URL=${baseURL}`;
const startCommand = `${envPrefix} npm run start -- -H 127.0.0.1 -p ${port}`;
const webServerCommand = skipBuild ? startCommand : `${envPrefix} npm run build && ${startCommand}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: skipBuild ? 120_000 : 300_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
