import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { AuthService } from './auth/auth.service.js';
import { APIError } from 'better-auth';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3000, '0.0.0.0');

  await seedData(app);

  logger.log('Application running at http://localhost:3000');
}

async function seedData(app: NestFastifyApplication) {
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);

  const seedUsers = [
    {
      name: 'Florian Bieck',
      email: 'info@florianbieck.com',
      password: '#Test1234',
      role: 'admin' as const,
    },
    {
      name: 'Beate Lessmann',
      email: 'info@beate-lessmann.de',
      password: '#Test1234',
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
