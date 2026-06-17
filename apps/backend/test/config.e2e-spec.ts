import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppConfigController } from '../src/config/config.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthGuard } from '../src/auth/auth.guard.js';
import { Prisma } from '../src/generated/prisma/client.js';

/**
 * NestJS-Integrationstest für den Config-Endpunkt (Issue #29, AC3).
 *
 * Prüft den API-Vertrag der Admin-Konfiguration (α + 4 WK-Gewichte):
 * gültige Werte werden gespeichert, Summe ≠ 100 % wird abgelehnt,
 * α außerhalb des Wertebereichs wird abgelehnt.
 */

const SEED_CONFIG = {
  id: 'config-seed',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  alpha: new Prisma.Decimal(0.3),
  weightComplexSyllables: new Prisma.Decimal(50),
  weightMultiMemberedGraphemes: new Prisma.Decimal(25),
  weightRareGraphemes: new Prisma.Decimal(12.5),
  weightConsonantClusters: new Prisma.Decimal(12.5),
};

function buildMocks() {
  const configFindFirst = vi.fn(async () => SEED_CONFIG);
  const configCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...SEED_CONFIG,
    ...data,
    id: 'config-new',
  }));
  return {
    configCreate,
    prisma: {
      config: { findFirst: configFindFirst, create: configCreate },
    },
  };
}

describe('POST /config — Zod-Validierung Admin-Konfiguration (Issue #29, AC3)', () => {
  let app: NestFastifyApplication;
  let mocks: ReturnType<typeof buildMocks>;

  beforeAll(async () => {
    mocks = buildMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AppConfigController],
      providers: [{ provide: PrismaService, useValue: mocks.prisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function post(payload: unknown): Promise<{ status: number; body: any }> {
    const res = await app.inject({
      method: 'POST',
      url: '/config',
      headers: { 'content-type': 'application/json' },
      payload: payload as object,
    });
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
  }

  const VALID = {
    alpha: 0.3,
    weightComplexSyllables: 50,
    weightMultiMemberedGraphemes: 25,
    weightRareGraphemes: 12.5,
    weightConsonantClusters: 12.5,
  };

  test('gültige Eingaben (Summe = 100, α im Bereich) → 200 und Persistierung', async () => {
    mocks.configCreate.mockClear();
    const { status, body } = await post(VALID);
    expect(status).toBe(200);
    expect(mocks.configCreate).toHaveBeenCalledTimes(1);
    expect(body.id).toBe('config-new');
  });

  test('Summe der vier WK-Gewichte < 100 → 422 mit Fehlerobjekt, nichts persistiert', async () => {
    mocks.configCreate.mockClear();
    const { status, body } = await post({
      ...VALID,
      weightConsonantClusters: 0, // 50+25+12.5+0 = 87.5
    });
    expect(status).toBe(422);
    expect(body).toHaveProperty('error');
    expect(mocks.configCreate).not.toHaveBeenCalled();
  });

  test('Summe der vier WK-Gewichte > 100 → 422 mit Fehlerobjekt, nichts persistiert', async () => {
    mocks.configCreate.mockClear();
    const { status, body } = await post({
      ...VALID,
      weightComplexSyllables: 100, // 100+25+12.5+12.5 = 150
    });
    expect(status).toBe(422);
    expect(body).toHaveProperty('error');
    expect(mocks.configCreate).not.toHaveBeenCalled();
  });

  test('Summe = 100 mit Gleitkomma-Toleranz (z.B. 50.0001+24.9999+12.5+12.5) → 200', async () => {
    mocks.configCreate.mockClear();
    const { status } = await post({
      ...VALID,
      weightComplexSyllables: 50.0001,
      weightMultiMemberedGraphemes: 24.9999,
    });
    expect(status).toBe(200);
    expect(mocks.configCreate).toHaveBeenCalledTimes(1);
  });

  test('α außerhalb des Wertebereichs (α < 0) → 422', async () => {
    mocks.configCreate.mockClear();
    const { status } = await post({ ...VALID, alpha: -0.1 });
    expect(status).toBe(422);
    expect(mocks.configCreate).not.toHaveBeenCalled();
  });

  test('α außerhalb des Wertebereichs (α zu groß) → 422', async () => {
    mocks.configCreate.mockClear();
    const { status } = await post({ ...VALID, alpha: 9999 });
    expect(status).toBe(422);
    expect(mocks.configCreate).not.toHaveBeenCalled();
  });

  test('negatives Gewicht → 422', async () => {
    mocks.configCreate.mockClear();
    const { status } = await post({
      ...VALID,
      weightConsonantClusters: -1,
      weightRareGraphemes: 13.5, // dieser Hack ergäbe ohne neg-Check Summe 100
    });
    expect(status).toBe(422);
    expect(mocks.configCreate).not.toHaveBeenCalled();
  });

  test('fehlendes Pflichtfeld (alpha) → 422', async () => {
    mocks.configCreate.mockClear();
    const { weightComplexSyllables, weightMultiMemberedGraphemes, weightRareGraphemes, weightConsonantClusters } = VALID;
    const { status } = await post({
      weightComplexSyllables,
      weightMultiMemberedGraphemes,
      weightRareGraphemes,
      weightConsonantClusters,
    });
    expect(status).toBe(422);
    expect(mocks.configCreate).not.toHaveBeenCalled();
  });
});
