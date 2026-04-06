import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
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
