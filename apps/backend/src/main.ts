import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

// Root-.env laden (lokale Entwicklung). Im Docker-Runtime-Image existiert keine
// .env-Datei — dort kommen die Variablen aus der Container-Umgebung. Der Guard
// ist nötig, weil process.loadEnvFile bei fehlender Datei wirft. __dirname liegt
// sowohl als src/ (Dev/Vitest) als auch als dist/ (Build) drei Ebenen unter der
// Repo-Wurzel.
const envFile = resolve(__dirname, '..', '..', '..', '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  await app.listen(3000, '0.0.0.0');

  logger.log('Application running at http://localhost:3000');
}

bootstrap();
