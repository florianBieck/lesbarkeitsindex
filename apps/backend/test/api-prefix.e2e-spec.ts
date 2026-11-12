import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from '../src/configure-app.js';
import { HealthController } from '../src/health.controller.js';
import { AppConfigController } from '../src/config/config.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
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

const SEED_CONFIG = {
  id: 'config-seed',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  alpha: 0.3,
  weightComplexSyllables: 50,
  weightMultiMemberedGraphemes: 25,
  weightRareGraphemes: 12.5,
  weightConsonantClusters: 12.5,
};

/** Better-Auth's sign-out clears three cookies in one response. */
const SIGN_OUT_COOKIES = [
  'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
  'better-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
  'better-auth.dont_remember=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
];

/** Better-Auth's answer to a sign-in with a wrong password. */
const SIGN_IN_REJECTED = {
  status: 401,
  body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
};

/**
 * Stands in for Better-Auth: sign-out and a failed sign-in answer like the real
 * one, every other path echoes the URL it receives, so a spec can check the base path.
 */
async function fakeAuthHandler(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/auth/sign-out') {
    const headers = new Headers(
      SIGN_OUT_COOKIES.map((cookie): [string, string] => ['set-cookie', cookie]),
    );
    return Response.json({ success: true }, { headers });
  }
  if (pathname === '/api/auth/sign-in/email') {
    return Response.json(SIGN_IN_REJECTED.body, { status: SIGN_IN_REJECTED.status });
  }
  return Response.json({ url: request.url });
}

describe('API prefix /api/ (ADR 0004)', () => {
  let fixture: SpaFixture;
  let app: NestExpressApplication;
  let baseUrl: string;
  const authHandler = vi.fn(fakeAuthHandler);

  beforeAll(async () => {
    fixture = await createSpaFixture();
    const moduleRef = await spaTestingModule(fixture.root, {
      controllers: [HealthController, AppConfigController, AuthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { config: { findFirst: vi.fn(async () => SEED_CONFIG) } },
        },
        { provide: AuthService, useValue: { auth: { handler: authHandler } } },
      ],
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

  test('Better-Auth answers at /api/auth/* and receives the full URL', async () => {
    const res = await get('/api/auth/get-session');
    expect(res.status).toBe(200);
    const { url } = (await res.json()) as { url: string };
    expect(new URL(url).pathname).toBe('/api/auth/get-session');
    expect(await isSpa('/auth/get-session')).toBe(true);
  });

  test('sign-out passes every Set-Cookie, the status and the body through', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-out`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'abmelden' }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual(SIGN_OUT_COOKIES);
    expect(await res.json()).toEqual({ success: true });

    const received = authHandler.mock.lastCall?.[0];
    expect(received?.method).toBe('POST');
    expect(await received?.json()).toEqual({ reason: 'abmelden' });
  });

  test("a rejected sign-in passes Better-Auth's status and body through", async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'lehrkraft@example.org', password: 'falsch' }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(SIGN_IN_REJECTED.body);
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
