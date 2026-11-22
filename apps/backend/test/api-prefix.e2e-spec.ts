import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from '../src/configure-app.js';
import { HealthController } from '../src/health.controller.js';
import { AppConfigController } from '../src/config/config.controller.js';
import { DefaultConfigService } from '../src/config/default-config.service.js';
import {
  createSpaFixture,
  FIXTURE_INDEX_HTML,
  spaTestingModule,
  type SpaFixture,
} from './spa-fixture.js';

/**
 * Routing boundary (ADR 0004): every backend route lives under `/api/`; the
 * frontend owns every other path.
 */

describe('API prefix /api/ (ADR 0004)', () => {
  let fixture: SpaFixture;
  let app: NestExpressApplication;
  let baseUrl: string;

  beforeAll(async () => {
    fixture = await createSpaFixture();
    const moduleRef = await spaTestingModule(fixture.root, {
      controllers: [HealthController, AppConfigController],
      providers: [DefaultConfigService],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
    await fixture.remove();
  });

  async function get(path: string, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${baseUrl}${path}`, { headers });
  }

  async function statusOf(path: string): Promise<number> {
    const res = await get(path);
    await res.body?.cancel();
    return res.status;
  }

  /** The SPA's index.html, which the backend serves for every path it doesn't own. */
  async function isSpa(path: string): Promise<boolean> {
    const res = await get(path);
    return res.status === 200 && (await res.text()) === FIXTURE_INDEX_HTML;
  }

  test('app routes answer under /api/, not at the root', async () => {
    expect(await statusOf('/api/config')).toBe(200);
    expect(await isSpa('/config')).toBe(true);
  });

  test('the health check answers at /api/health and leaves / to the frontend', async () => {
    expect(await statusOf('/api/health')).toBe(200);
    expect(await isSpa('/')).toBe(true);
  });

  test('the app has no accounts: /api/auth/* answers 404, not the SPA (ADR 0008)', async () => {
    for (const path of ['/api/auth/get-session', '/api/auth/sign-in/email', '/api/auth/sign-out']) {
      for (const method of ['GET', 'POST']) {
        const res = await fetch(`${baseUrl}${path}`, { method });
        expect(res.status, `${method} ${path}`).toBe(404);
        expect(await res.json()).toMatchObject({ statusCode: 404 });
      }
    }
  });

  test('the default configuration is read-only: POST /api/config answers 404', async () => {
    const res = await fetch(`${baseUrl}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        alpha: 0.3,
        weightComplexSyllables: 50,
        weightMultiMemberedGraphemes: 25,
        weightRareGraphemes: 12.5,
        weightConsonantClusters: 12.5,
      }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ statusCode: 404 });
  });

  test('the API sends no CORS headers: the browser only ever calls its own origin', async () => {
    const res = await get('/api/config', { origin: 'http://localhost:3001' });
    await res.body?.cancel();
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
  });

  test('responses do not name the server framework', async () => {
    const res = await get('/api/health');
    await res.body?.cancel();
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});
