import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

/**
 * The app needs no database (ADR 0008): the whole `AppModule` starts without
 * `DATABASE_URL`; `R_SIDECAR_URL` is the only setting it requires.
 */
describe('AppModule without a database (ADR 0008)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', undefined);
    vi.stubEnv('CONFIG_FILE', undefined);
    vi.stubEnv('R_SIDECAR_URL', 'http://localhost:8787');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  test('starts without DATABASE_URL and answers the health check', async () => {
    const res = await fetch(`${baseUrl}/api/health`);

    expect(res.status).toBe(200);
  });

  test('serves the default configuration without a database', async () => {
    const res = await fetch(`${baseUrl}/api/config`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ alpha: 0.3, weightComplexSyllables: 50 });
  });
});
