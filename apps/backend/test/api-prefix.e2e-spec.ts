import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vite-plus/test';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { configureApp } from '../src/configure-app.js';
import { HealthController } from '../src/health.controller.js';
import { AppConfigController } from '../src/config/config.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';

/**
 * Routing boundary (ADR 0004): every backend route lives under `/api/`; the
 * frontend owns every other path.
 */

const SEED_CONFIG = {
  id: 'config-seed',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  alpha: 0.3,
  weightComplexSyllables: 50,
  weightMultiMemberedGraphemes: 25,
  weightRareGraphemes: 12.5,
  weightConsonantClusters: 12.5,
};

describe('API prefix /api/ (ADR 0004)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, AppConfigController, AuthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { config: { findFirst: vi.fn(async () => SEED_CONFIG) } },
        },
        // Echoes the URL Better-Auth receives, so a spec can check its base path.
        {
          provide: AuthService,
          useValue: {
            auth: {
              handler: vi.fn(async (request: Request) => Response.json({ url: request.url })),
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function statusOf(url: string): Promise<number> {
    const res = await app.inject({ method: 'GET', url });
    return res.statusCode;
  }

  test('app routes answer under /api/, not at the root', async () => {
    expect(await statusOf('/api/config')).toBe(200);
    expect(await statusOf('/config')).toBe(404);
  });

  test('the health check answers at /api/health and leaves / to the frontend', async () => {
    expect(await statusOf('/api/health')).toBe(200);
    expect(await statusOf('/')).toBe(404);
  });

  test('Better-Auth answers at /api/auth/* and receives the full URL', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/get-session' });
    expect(res.statusCode).toBe(200);
    expect(new URL(res.json<{ url: string }>().url).pathname).toBe('/api/auth/get-session');
    expect(await statusOf('/auth/get-session')).toBe(404);
  });

  test('CORS lets the dev frontend send credentials', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/config',
      headers: { origin: 'http://localhost:3001' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
