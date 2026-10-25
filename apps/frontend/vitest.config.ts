import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    // PROTOTYPE (wayfinder #55): the ported spec runs on vite-plus/test instead.
    exclude: ['e2e/**', 'node_modules/**', 'app/components/__tests__/config-weights-form.test.ts'],
  },
});
