import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Root-.env laden, falls vorhanden (im Docker-Build fehlt sie — dort kommt
// DATABASE_URL aus der Umgebung; process.loadEnvFile wirft bei fehlender Datei).
const envFile = resolve(__dirname, '..', '..', '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
