// THROWAWAY visual check for PR 3 (Tailwind 4), adapted from the #56 prototype.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  workers: 1,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.SHOOT_BASE_URL ?? 'http://localhost:3002',
  },
});
