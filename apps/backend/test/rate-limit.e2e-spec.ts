import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { RSidecarService } from '../src/r-sidecar/r-sidecar.service.js';

/**
 * `POST /api/calculate` is rate-limited per visitor IP (Issue #97, ADR 0008): the
 * endpoint is public and every call runs the R sidecar. The whole `AppModule` runs
 * here, with only the R sidecar replaced, so the spec also shows which routes the
 * limit leaves alone.
 */

const ANALYSIS = {
  sentences: ['Der Hund läuft.'],
  words: ['Der', 'Hund', 'läuft'],
  syllablesPerWord: [1, 1, 1],
  posTags: ['ART', 'NN', 'VVFIN'],
};

/** The limit the issue asks for: 60 requests per minute per IP. */
const LIMIT = 60;

/** Visitor addresses as the edge reports them (TEST-NET-3, RFC 5737). */
const VISITOR = '203.0.113.7';
const OTHER_VISITOR = '203.0.113.8';

describe('Rate limit on POST /api/calculate (Issue #97)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;

  // A fresh app per test: the counters live in the app's memory.
  beforeEach(async () => {
    vi.stubEnv('CONFIG_FILE', '');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RSidecarService)
      .useValue({ analyzeText: async () => ANALYSIS })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  /** One analysis, as the edge proxy forwards it for the visitor at `forwardedFor`. */
  function calculate(forwardedFor: string): Promise<Response> {
    return fetch(`${baseUrl}/api/calculate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor },
      body: JSON.stringify({ text: 'Der Hund läuft.' }),
    });
  }

  async function statusesOf(count: number, request: () => Promise<Response>): Promise<number[]> {
    const statuses: number[] = [];
    for (let i = 0; i < count; i++) {
      const res = await request();
      await res.arrayBuffer();
      statuses.push(res.status);
    }
    return statuses;
  }

  async function exhaustLimit(forwardedFor: string): Promise<void> {
    const statuses = await statusesOf(LIMIT, () => calculate(forwardedFor));
    expect(statuses.every((status) => status === 200)).toBe(true);
  }

  test('the 61st request in a minute gets 429 and says when to retry', async () => {
    await exhaustLimit(VISITOR);

    const res = await calculate(VISITOR);

    expect(res.status).toBe(429);
    // The wait the answer names pins the window: about a minute, minus the test's own run time.
    const retryAfterSeconds = Number(res.headers.get('retry-after'));
    expect(retryAfterSeconds).toBeGreaterThan(50);
    expect(retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  test('the limit counts per visitor IP, not the proxy: another visitor still gets through', async () => {
    await exhaustLimit(VISITOR);

    const res = await calculate(OTHER_VISITOR);

    expect(res.status).toBe(200);
  });

  test('a forwarded address the visitor made up does not buy a fresh limit', async () => {
    await exhaustLimit(VISITOR);

    // The edge appends the address it saw; what the visitor sent stands before it.
    const res = await calculate(`198.51.100.1, ${VISITOR}`);

    expect(res.status).toBe(429);
  });

  test('other routes are unaffected, also for a visitor over the limit', async () => {
    await exhaustLimit(VISITOR);
    expect((await calculate(VISITOR)).status).toBe(429);

    const get = (path: string) => () =>
      fetch(`${baseUrl}${path}`, { headers: { 'x-forwarded-for': VISITOR } });

    const health = await statusesOf(LIMIT + 1, get('/api/health'));
    const config = await statusesOf(LIMIT + 1, get('/api/config'));

    expect(new Set(health)).toEqual(new Set([200]));
    expect(new Set(config)).toEqual(new Set([200]));
  });
});
