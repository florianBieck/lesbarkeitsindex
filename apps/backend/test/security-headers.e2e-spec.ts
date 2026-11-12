import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from '../src/configure-app.js';
import { HealthController } from '../src/health.controller.js';
import {
  createSpaFixture,
  FIXTURE_ASSET_PATH,
  spaTestingModule,
  type SpaFixture,
} from './spa-fixture.js';

/**
 * The backend sends the security headers on every response, the SPA's and the
 * API's (ADR 0007). HSTS is the edge's job (`Caddyfile`), so the backend never
 * sends it.
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join(';');

const EXPECTED_HEADERS = {
  'content-security-policy': CONTENT_SECURITY_POLICY,
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'origin-agent-cluster': '?1',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-dns-prefetch-control': 'off',
  'x-download-options': 'noopen',
  'x-frame-options': 'DENY',
  'x-permitted-cross-domain-policies': 'none',
  'x-xss-protection': '0',
};

describe('security headers (ADR 0007)', () => {
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

  test.each([
    ['the SPA at /', '/'],
    ['a deep link', '/results'],
    ['a hashed asset', FIXTURE_ASSET_PATH],
    ['the API', '/api/health'],
    ['an unknown API path', '/api/nope'],
  ])('%s gets the full set, without HSTS or X-Powered-By', async (_name, path) => {
    const res = await fetch(`${baseUrl}${path}`);
    await res.body?.cancel();

    const received = Object.fromEntries(
      Object.keys(EXPECTED_HEADERS).map((name) => [name, res.headers.get(name)]),
    );
    expect(received).toEqual(EXPECTED_HEADERS);
    expect(res.headers.get('strict-transport-security')).toBeNull();
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});
