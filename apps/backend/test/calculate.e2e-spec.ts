import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { CalculateController } from '../src/calculate/calculate.controller.js';
import { CalculateService } from '../src/calculate/calculate.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RSidecarService } from '../src/r-sidecar/r-sidecar.service.js';
import { Prisma } from '../src/generated/prisma/client.js';

/**
 * NestJS-Integrationstest für den Analyse-Endpunkt (Issue #28, AC6).
 *
 * Prüft den API-Vertrag (Antwortfelder, Validierungsfehler) des Aufschlagsmodells
 * mit gemocktem R-Dienst und gemockter Persistenz — ohne laufenden Stack.
 */

const ANALYSIS = {
  sentences: ['Die Kinder schreiben spannende Geschichten.'],
  words: ['Die', 'Kinder', 'schreiben', 'spannende', 'Geschichten'],
  syllablesPerWord: [1, 2, 2, 3, 3],
  posTags: ['ART', 'NN', 'VVFIN', 'ADJA', 'NN'],
};

const SEED_CONFIG = {
  id: 'config-seed',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  alpha: new Prisma.Decimal(0.3),
  weightComplexSyllables: new Prisma.Decimal(50),
  weightMultiMemberedGraphemes: new Prisma.Decimal(25),
  weightRareGraphemes: new Prisma.Decimal(12.5),
  weightConsonantClusters: new Prisma.Decimal(12.5),
};

const TEXT = 'Die Kinder schreiben spannende Geschichten.';

function buildMocks() {
  const analyzeText = vi.fn(async () => ANALYSIS);
  const configFindFirst = vi.fn(async () => SEED_CONFIG);
  const configCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...SEED_CONFIG,
    ...data,
    id: 'config-new',
  }));
  const resultCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...data,
    id: 'result-new',
    config: SEED_CONFIG,
  }));
  return {
    analyzeText,
    resultCreate,
    configCreate,
    prisma: {
      config: { findFirst: configFindFirst, create: configCreate },
      result: { create: resultCreate },
    },
    rSidecar: { analyzeText },
  };
}

describe('POST /calculate — Integrationstest (R-Dienst & Persistenz gemockt, AC6)', () => {
  let app: NestFastifyApplication;
  let mocks: ReturnType<typeof buildMocks>;

  beforeAll(async () => {
    mocks = buildMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CalculateController],
      providers: [
        CalculateService,
        { provide: PrismaService, useValue: mocks.prisma },
        { provide: RSidecarService, useValue: mocks.rSidecar },
      ],
    }).compile();

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
      url: '/calculate',
      headers: { 'content-type': 'application/json' },
      payload: payload as object,
    });
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
  }

  test('Antwort enthält LIX, WK, LÜ-LIX, Niveaustufe und Umfang', async () => {
    const { status, body } = await post({ text: TEXT });
    expect(status).toBe(200);
    expect(typeof body.lix).toBe('number');
    expect(typeof body.wordComplexity).toBe('number');
    expect(typeof body.lueLix).toBe('number');
    expect(typeof body.level).toBe('number');
    expect(body.countWords).toBe(5); // Umfang = Wortzahl des Fließtexts
  });

  test('Aufschlagsmodell-Invarianten: LÜ-LIX ≥ LIX, WK in [0,100], Stufe 1..5', async () => {
    const { body } = await post({ text: TEXT });
    expect(body.lueLix).toBeGreaterThanOrEqual(body.lix);
    expect(body.wordComplexity).toBeGreaterThanOrEqual(0);
    expect(body.wordComplexity).toBeLessThanOrEqual(100);
    expect(body.level).toBeGreaterThanOrEqual(1);
    expect(body.level).toBeLessThanOrEqual(5);
  });

  test('keine veralteten Felder score/scoreLevel mehr im Vertrag (AC8)', async () => {
    const { body } = await post({ text: TEXT });
    expect(body).not.toHaveProperty('score');
    expect(body).not.toHaveProperty('scoreLevel');
  });

  test('ruft den (gemockten) R-Dienst genau einmal auf und persistiert ohne saveResult nicht', async () => {
    mocks.analyzeText.mockClear();
    mocks.resultCreate.mockClear();
    await post({ text: TEXT });
    expect(mocks.analyzeText).toHaveBeenCalledTimes(1);
    expect(mocks.resultCreate).not.toHaveBeenCalled();
  });

  test('saveResult=true persistiert über die gemockte Persistenz', async () => {
    mocks.resultCreate.mockClear();
    const { status } = await post({ text: TEXT, saveResult: true });
    expect(status).toBe(200);
    expect(mocks.resultCreate).toHaveBeenCalledTimes(1);
  });

  test('Validierungsfehler: leerer Text → 422 mit Fehlerobjekt', async () => {
    const { status, body } = await post({ text: '' });
    expect(status).toBe(422);
    expect(body).toHaveProperty('error');
  });

  test('Validierungsfehler: fehlender Text → 422', async () => {
    const { status } = await post({});
    expect(status).toBe(422);
  });

  test('Validierungsfehler: negatives Gewicht → 422', async () => {
    const { status } = await post({ text: TEXT, weightComplexSyllables: -1 });
    expect(status).toBe(422);
  });
});
