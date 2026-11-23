import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from '../src/configure-app.js';
import { CalculateModule } from '../src/calculate/calculate.module.js';
import { RSidecarService } from '../src/r-sidecar/r-sidecar.service.js';

/**
 * NestJS-Integrationstest für den Analyse-Endpunkt (Issue #28, AC6).
 *
 * Prüft den API-Vertrag (Antwortfelder, Validierungsfehler) des Aufschlagsmodells
 * mit gemocktem R-Dienst und den eingebauten Standardwerten (keine config.json) —
 * ohne laufenden Stack.
 */

const ANALYSIS = {
  sentences: ['Die Kinder schreiben spannende Geschichten.'],
  words: ['Die', 'Kinder', 'schreiben', 'spannende', 'Geschichten'],
  syllablesPerWord: [1, 2, 2, 3, 3],
  posTags: ['ART', 'NN', 'VVFIN', 'ADJA', 'NN'],
};

const TEXT = 'Die Kinder schreiben spannende Geschichten.';

function buildMocks() {
  const analyzeText = vi.fn(async () => ANALYSIS);
  return {
    analyzeText,
    rSidecar: { analyzeText },
  };
}

describe('POST /api/calculate — Integrationstest (R-Dienst gemockt, AC6)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let mocks: ReturnType<typeof buildMocks>;

  beforeAll(async () => {
    // Eine CONFIG_FILE aus der Umgebung des Entwicklers darf die Erwartungen nicht verschieben.
    vi.stubEnv('CONFIG_FILE', '');
    mocks = buildMocks();
    const moduleRef = await Test.createTestingModule({ imports: [CalculateModule] })
      .overrideProvider(RSidecarService)
      .useValue(mocks.rSidecar)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await app.close();
  });

  async function post(payload: unknown): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}/api/calculate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
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

  test('ruft den (gemockten) R-Dienst genau einmal auf', async () => {
    mocks.analyzeText.mockClear();
    await post({ text: TEXT });
    expect(mocks.analyzeText).toHaveBeenCalledTimes(1);
  });

  test('Antwort trägt die genutzte Konfiguration als fünf Zahlen, ohne Datenbankfelder', async () => {
    const { body } = await post({ text: TEXT, alpha: 0.5 });
    expect(body.config).toEqual({
      alpha: 0.5,
      weightComplexSyllables: 50,
      weightMultiMemberedGraphemes: 25,
      weightRareGraphemes: 12.5,
      weightConsonantClusters: 12.5,
    });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('configId');
  });

  test('ein altes saveResult=true wird ignoriert: 200, nichts wird gespeichert', async () => {
    const { status, body } = await post({ text: TEXT, saveResult: true });
    expect(status).toBe(200);
    expect(body).not.toHaveProperty('id');
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

  test('Text über der Höchstlänge, als JSON über 100 KB groß → 422 vom Schema, nicht 413', async () => {
    // Umlaute belegen in UTF-8 zwei Bytes: 100.001 × „Ä" sind rund 200 KB.
    const { status, body } = await post({ text: 'Ä'.repeat(100_001) });
    expect(status).toBe(422);
    expect(Object.keys(body.error.fieldErrors)).toEqual(['text']);
  });

  test('Validierungsfehler: negatives Gewicht → 422', async () => {
    const { status, body } = await post({ text: TEXT, weightComplexSyllables: -1 });
    expect(status).toBe(422);
    expect(body.error.formErrors).toEqual([]);
    expect(Object.keys(body.error.fieldErrors)).toEqual(['weightComplexSyllables']);
  });
});
