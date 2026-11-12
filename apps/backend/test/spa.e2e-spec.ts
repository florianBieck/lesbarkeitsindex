import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from '../src/configure-app.js';
import { HealthController } from '../src/health.controller.js';
import {
  createSpaFixture,
  spaTestingModule,
  FIXTURE_ASSET_BODY,
  FIXTURE_ASSET_PATH,
  FIXTURE_INDEX_HTML,
  type SpaFixture,
} from './spa-fixture.js';

/**
 * The backend serves the built SPA (ADR 0007): hashed assets are cached for good,
 * every other GET path gets its file or `index.html` and revalidates, and `/api/*`
 * stays the API's.
 */

const IMMUTABLE = 'public, max-age=31536000, immutable';

describe('SPA serving (ADR 0007)', () => {
  let fixture: SpaFixture;
  let app: NestExpressApplication;
  let baseUrl: string;

  beforeAll(async () => {
    fixture = await createSpaFixture();
    const moduleRef = await spaTestingModule(fixture.root, {
      controllers: [HealthController],
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

  function request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function expectIndex(path: string): Promise<Response> {
    const res = await request(path);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/html/);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('etag')).toBeTruthy();
    expect(await res.text()).toBe(FIXTURE_INDEX_HTML);
    return res;
  }

  async function expectJson404(path: string, init?: RequestInit): Promise<void> {
    const res = await request(path, init);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await res.json()).toMatchObject({ statusCode: 404 });
  }

  test('/ gets index.html, revalidated', async () => {
    await expectIndex('/');
  });

  test('deep links get index.html, so a reload shows the page', async () => {
    await expectIndex('/results');
    await expectIndex('/admin?tab=1');
    await expectIndex('/gibtsnicht/tiefer');
  });

  test('a deep link answers If-None-Match with 304', async () => {
    const first = await expectIndex('/results');
    const res = await request('/results', {
      // What a browser sends when it revalidates. Without an explicit Cache-Control,
      // fetch adds `no-cache` to a conditional request, and `send` never answers that with 304.
      headers: { 'if-none-match': first.headers.get('etag') ?? '', 'cache-control': 'max-age=0' },
    });
    await res.body?.cancel();
    expect(res.status).toBe(304);
  });

  test('HEAD on a deep link answers like GET, without a body', async () => {
    const res = await request('/results', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(await res.text()).toBe('');
  });

  test('a hashed asset is cached for a year and never revalidated', async () => {
    const res = await request(FIXTURE_ASSET_PATH);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(IMMUTABLE);
    expect(await res.text()).toBe(FIXTURE_ASSET_BODY);
  });

  test('a missing asset gets a JSON 404, not index.html under the asset cache header', async () => {
    await expectJson404('/assets/index-ALT.js');
  });

  test('other files in dist/ are served as they are, revalidated', async () => {
    const res = await request('/favicon.ico');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    await res.body?.cancel();
  });

  test('/api/* stays the API: routes answer, unknown paths get a JSON 404', async () => {
    const health = await request('/api/health');
    expect(health.status).toBe(200);
    await health.body?.cancel();

    await expectJson404('/api/nope');
    await expectJson404('/api/nope/tiefer?x=1');
    await expectJson404('/api');
    await expectJson404('/api/');
  });

  test('a POST to an app path is not answered with index.html', async () => {
    await expectJson404('/results', { method: 'POST' });
  });
});
