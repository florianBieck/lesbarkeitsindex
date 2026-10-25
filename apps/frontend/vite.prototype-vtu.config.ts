// PROTOTYPE (wayfinder #55), never merged: the SPA's test setup without
// @nuxt/test-utils. In PR 2 this becomes the `test` block of vite.config.ts,
// and `@` points at `src/` instead of `app/`.
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./app', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    include: ['app/components/__tests__/config-weights-form.test.ts'],
    setupFiles: ['./app/test-setup.prototype-vtu.ts'],
  },
});
