import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { PrismaService } from './prisma/prisma.service.js';
import { AuthService } from './auth/auth.service.js';
import { readSeedAdminPassword } from './seed-admin-password.js';
import { APIError } from 'better-auth';

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
  // Vor dem Start lesen: fehlt das Passwort in Produktion, lauscht die App gar nicht erst.
  const seedAdminPassword = readSeedAdminPassword(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  configureApp(app);

  await app.listen(3000, '0.0.0.0');

  await seedData(app, seedAdminPassword);

  logger.log('Application running at http://localhost:3000');
}

async function seedData(app: NestFastifyApplication, adminPassword: string) {
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);

  const seedUsers = [
    {
      name: 'Florian Bieck',
      email: 'info@florianbieck.com',
      password: adminPassword,
      role: 'admin' as const,
    },
    {
      name: 'Beate Lessmann',
      email: 'info@beate-lessmann.de',
      password: adminPassword,
      role: 'admin' as const,
    },
  ];

  for (const user of seedUsers) {
    try {
      await authService.auth.api.createUser({ body: user });
    } catch (error) {
      if (error instanceof APIError) {
        logger.verbose('Seed user already exists, skipping');
      }
    }
  }

  const existingConfig = await prisma.config.findFirst();
  if (!existingConfig) {
    await prisma.config.create({
      data: {
        alpha: 0.3,
        weightComplexSyllables: 50,
        weightMultiMemberedGraphemes: 25,
        weightRareGraphemes: 12.5,
        weightConsonantClusters: 12.5,
      },
    });
  }
}

bootstrap();
