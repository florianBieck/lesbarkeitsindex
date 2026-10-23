import { defineConfig } from 'vite-plus';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30_000,
  },
  // NestJS-Dependency-Injection braucht emittierte Decorator-Metadaten, die der
  // Standard-esbuild-Transform nicht erzeugt — daher SWC für die Integrationstests.
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
