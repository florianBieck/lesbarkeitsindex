import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
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
