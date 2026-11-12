import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

/** Fixed, so Better-Auth's `trustedOrigins` (`http://localhost:3001`) always matches. */
const PORT = 3001;

/**
 * Same-origin in every environment (ADR 0007): like the `Caddyfile` in prod, the dev
 * and preview servers hand `/api/*` to the backend on :3000.
 */
const API_PROXY = { '/api': 'http://localhost:3000' };

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: PORT, strictPort: true, proxy: API_PROXY },
  preview: { port: PORT, strictPort: true, proxy: API_PROXY },
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/test-setup.ts'],
    // Keeps the Playwright specs (`e2e/`, `smoke/`, all `*.spec.ts`) out of the unit run.
    include: ['src/**/*.test.ts'],
  },
});
