import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vite-plus/test';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
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

/** Better-Auth's sign-out clears three cookies in one response. */
const SIGN_OUT_COOKIES = [
  'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
  'better-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
  'better-auth.dont_remember=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
];

/**
 * Stands in for Better-Auth: sign-out answers like the real one, every other
 * path echoes the URL it receives, so a spec can check the base path.
 */
async function fakeAuthHandler(request: Request): Promise<Response> {
  if (new URL(request.url).pathname === '/api/auth/sign-out') {
    const headers = new Headers();
    for (const cookie of SIGN_OUT_COOKIES) {
      headers.append('set-cookie', cookie);
    }
    return Response.json({ success: true }, { headers });
  }
  return Response.json({ url: request.url });
}

describe('API prefix /api/ (ADR 0004)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  const authHandler = vi.fn(fakeAuthHandler);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
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
  });

  async function get(path: string, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${baseUrl}${path}`, { headers });
  }

  async function statusOf(path: string): Promise<number> {
    const res = await get(path);
    await res.body?.cancel();
    return res.status;
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
    const res = await get('/api/auth/get-session');
    expect(res.status).toBe(200);
    const { url } = (await res.json()) as { url: string };
    expect(new URL(url).pathname).toBe('/api/auth/get-session');
    expect(await statusOf('/auth/get-session')).toBe(404);
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

  test('CORS lets the dev frontend send credentials', async () => {
    const res = await get('/api/config', { origin: 'http://localhost:3001' });
    await res.body?.cancel();
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3001');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  test('responses do not name the server framework', async () => {
    const res = await get('/api/health');
    await res.body?.cancel();
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});
