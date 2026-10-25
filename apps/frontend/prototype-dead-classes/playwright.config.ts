// PROTOTYPE (#56), throwaway.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  workers: 1,
  reporter: 'line',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' },
});
