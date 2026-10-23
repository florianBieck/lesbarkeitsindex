import type { KnipConfig } from 'knip';

export default {
  workspaces: {
    '.': {
      // Standalone script, run by hand against a live backend.
      entry: ['docs/calibration/*.mjs'],
    },
    'apps/backend': {
      // Referenced by nest-cli.json ("collection"), shipped with @nestjs/cli.
      ignoreDependencies: ['@nestjs/schematics'],
    },
    'apps/frontend': {
      // defineVitestConfig() boots Nuxt to resolve its config, which fails when
      // knip runs from the repo root. Parse the file statically instead; the
      // default test-file entries still apply.
      vitest: { config: [] },
      entry: ['vitest.config.ts'],
      // Imported by the generated .nuxt/*.d.ts, which knip does not scan; pnpm's
      // strict layout needs it listed for those types to resolve.
      ignoreDependencies: ['vue-router'],
    },
  },
} satisfies KnipConfig;
