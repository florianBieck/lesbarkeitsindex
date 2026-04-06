import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lesbarkeitsindex API')
    .setDescription('German text readability analysis API')
    .setVersion('2.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

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
        parameterCountWords: 0,
        parameterCountPhrases: 0,
        parameterCountMultipleWords: 0,
        parameterCountWordsWithComplexSyllables: 0,
        parameterCountWordsWithConsonantClusters: 0,
        parameterCountWordsWithMultiMemberedGraphemes: 0,
        parameterCountWordsWithRareGraphemes: 0,
        parameterAverageWordLength: 0,
        parameterAveragePhraseLength: 0,
        parameterAverageSyllablesPerWord: 0,
        parameterAverageSyllablesPerPhrase: 0,
        parameterProportionOfLongWords: 0,
        parameterLix: 0.6,
        parameterProportionOfWordsWithComplexSyllables: 0.2,
        parameterProportionOfWordsWithConsonantClusters: 0.05,
        parameterProportionOfWordsWithMultiMemberedGraphemes: 0.1,
        parameterProportionOfWordsWithRareGraphemes: 0.05,
      },
    });
  }
}

bootstrap();
