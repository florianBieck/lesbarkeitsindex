import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test against a deployed site, prod by default (`test:smoke`). It lives apart from
 * `playwright.config.ts` and its `e2e/` folder, so `test:e2e` never reaches prod.
 *
 * The login comes from `.env.smoke.local` next to this file (gitignored):
 *   SMOKE_EMAIL=…
 *   SMOKE_PASSWORD=…
 *   SMOKE_BASE_URL=…   (optional, defaults to prod)
 */
const ENV_FILE = new URL('.env.smoke.local', import.meta.url);
if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

const PROD_URL = 'https://lix.florianbieck.com';

export default defineConfig({
  testDir: './smoke',
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 120_000,
  // No HTML report and no trace: both would keep every step of the signed-in run on disk.
  reporter: 'list',
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? PROD_URL,
    // A rejected login leaves the page on /login: fail in seconds, not at the test timeout.
    navigationTimeout: 20_000,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
