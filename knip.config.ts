import type { KnipConfig } from 'knip';

export default {
  workspaces: {
    '.': {
      // Standalone script, run by hand against a live backend.
      entry: ['docs/calibration/*.mjs'],
    },
    'apps/backend': {
      // Referenced by nest-cli.json ("collection"), shipped with @nestjs/cli.
      // @prisma/client: the generated Prisma client imports it at runtime, but it is
      // gitignored, so knip never sees the import. Goes with the database (#96).
      ignoreDependencies: ['@nestjs/schematics', '@prisma/client'],
    },
  },
} satisfies KnipConfig;
