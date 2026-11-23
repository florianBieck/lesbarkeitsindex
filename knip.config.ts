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
  },
} satisfies KnipConfig;
