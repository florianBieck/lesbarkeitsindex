import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.nuxt/**', '**/.output/**'],
  },
  lint: {
    ignorePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/generated/**',
      '**/.nuxt/**',
      '**/.output/**',
    ],
  },
  fmt: {
    singleQuote: true,
  },
});
