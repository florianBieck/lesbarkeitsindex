import 'reflect-metadata';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from '../src/configure-app.js';
import { AppConfigModule } from '../src/config/config.module.js';
import { CalculateModule } from '../src/calculate/calculate.module.js';
import { RSidecarService } from '../src/r-sidecar/r-sidecar.service.js';

/**
 * Die Standardkonfiguration kommt aus der `config.json`, deren Pfad in
 * `CONFIG_FILE` steht (ADR 0008, Issue #94). Geprüft werden die drei Zustände
 * der Datei über `GET /api/config` und `POST /api/calculate`, mit echter Datei
 * und gemocktem R-Dienst.
 */

const ANALYSIS = {
  sentences: ['Die Kinder schreiben spannende Geschichten.'],
  words: ['Die', 'Kinder', 'schreiben', 'spannende', 'Geschichten'],
  syllablesPerWord: [1, 2, 2, 3, 3],
  posTags: ['ART', 'NN', 'VVFIN', 'ADJA', 'NN'],
};

const TEXT = 'Die Kinder schreiben spannende Geschichten.';

const BUILT_IN = {
  alpha: 0.3,
  weightComplexSyllables: 50,
  weightMultiMemberedGraphemes: 25,
  weightRareGraphemes: 12.5,
  weightConsonantClusters: 12.5,
};

const FILE_CONFIG = {
  alpha: 0.45,
  weightComplexSyllables: 40,
  weightMultiMemberedGraphemes: 30,
  weightRareGraphemes: 20,
  weightConsonantClusters: 10,
};

const CONFIG_INVALID_RESPONSE = {
  statusCode: 500,
  error: 'CONFIG_INVALID',
  message: 'Die Konfiguration ist fehlerhaft, bitte wenden Sie sich an die Betreuung',
};

describe('Standardkonfiguration aus der config.json (Issue #94)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let dir: string;
  let configFile: string;
  const analyzeText = vi.fn(async () => ANALYSIS);

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'config-e2e-'));
    configFile = join(dir, 'config.json');
    vi.stubEnv('CONFIG_FILE', configFile);

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, CalculateModule],
    })
      .overrideProvider(RSidecarService)
      .useValue({ analyzeText })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await rm(configFile, { force: true });
    analyzeText.mockClear();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  async function request(path: string, payload?: unknown): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: payload === undefined ? undefined : { 'content-type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  }

  const getConfig = () => request('/api/config');
  const calculate = (payload: Record<string, unknown> = {}) =>
    request('/api/calculate', { text: TEXT, ...payload });
  const writeConfig = (content: unknown) =>
    writeFile(configFile, typeof content === 'string' ? content : JSON.stringify(content));

  describe('Datei fehlt', () => {
    test('GET /api/config liefert die eingebauten Standardwerte, ohne Datenbankfelder', async () => {
      const { status, body } = await getConfig();

      expect(status).toBe(200);
      expect(body).toEqual(BUILT_IN);
    });

    test('POST /api/calculate rechnet mit den eingebauten Standardwerten', async () => {
      const { status, body } = await calculate();

      expect(status).toBe(200);
      expect(body.config).toEqual(BUILT_IN);
    });
  });

  describe('Datei gültig', () => {
    test('GET /api/config liefert die Werte der Datei', async () => {
      await writeConfig(FILE_CONFIG);

      const { status, body } = await getConfig();

      expect(status).toBe(200);
      expect(body).toEqual(FILE_CONFIG);
    });

    test('GET /api/config liefert die optionalen Links, wenn die Datei sie nennt', async () => {
      await writeConfig({ ...FILE_CONFIG, impressumUrl: 'https://example.org/impressum' });

      const { body } = await getConfig();

      expect(body.impressumUrl).toBe('https://example.org/impressum');
      expect(body).not.toHaveProperty('datenschutzUrl');
    });

    test('POST /api/calculate rechnet mit den Werten der Datei und meldet keine Links', async () => {
      await writeConfig({ ...FILE_CONFIG, impressumUrl: 'https://example.org/impressum' });

      const { status, body } = await calculate();

      expect(status).toBe(200);
      expect(body.config).toEqual(FILE_CONFIG);
    });

    test('eine geänderte Datei wirkt auf die nächste Berechnung, ohne Neustart', async () => {
      await writeConfig({ ...FILE_CONFIG, alpha: 0 });
      const before = await calculate();
      // α = 0: kein Aufschlag, der LÜ-LIX ist der LIX.
      expect(before.body.lueLix).toBe(before.body.lix);

      await writeConfig({ ...FILE_CONFIG, alpha: 1 });
      const after = await calculate();

      expect(after.body.config.alpha).toBe(1);
      expect(after.body.lueLix).toBeGreaterThan(before.body.lueLix);
    });

    test('Werte der Anfrage übersteuern einzelne Werte der Datei, ohne Summenregel', async () => {
      await writeConfig(FILE_CONFIG);

      const { status, body } = await calculate({ alpha: 2, weightComplexSyllables: 90 });

      expect(status).toBe(200);
      expect(body.config).toEqual({ ...FILE_CONFIG, alpha: 2, weightComplexSyllables: 90 });
    });
  });

  describe('Datei fehlerhaft', () => {
    test.each([
      ['kein gültiges JSON', '{ "alpha": 0.3,'],
      ['fehlender Schlüssel', JSON.stringify({ ...FILE_CONFIG, alpha: undefined })],
      ['negativer Wert', JSON.stringify({ ...FILE_CONFIG, weightRareGraphemes: -5 })],
    ])('GET /api/config scheitert mit klarer Meldung: %s', async (_name, content) => {
      await writeConfig(content);

      const { status, body } = await getConfig();

      expect(status).toBe(500);
      expect(body).toEqual(CONFIG_INVALID_RESPONSE);
    });

    test('POST /api/calculate scheitert mit derselben Meldung und rechnet nicht', async () => {
      await writeConfig({ ...FILE_CONFIG, weightRareGraphemes: -5 });

      const { status, body } = await calculate();

      expect(status).toBe(500);
      expect(body).toEqual(CONFIG_INVALID_RESPONSE);
      expect(analyzeText).not.toHaveBeenCalled();
    });

    test('auch eine Anfrage, die alle Werte selbst mitbringt, wird nicht berechnet', async () => {
      await writeConfig('kaputt');

      const { status } = await calculate(BUILT_IN);

      expect(status).toBe(500);
      expect(analyzeText).not.toHaveBeenCalled();
    });

    test('das Log nennt die Datei und das fehlerhafte Feld, aber nicht den Text', async () => {
      const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      await writeConfig({ ...FILE_CONFIG, weightRareGraphemes: -5 });

      await calculate();

      expect(logError).toHaveBeenCalledTimes(1);
      const logged = String(logError.mock.calls[0]![0]);
      expect(logged).toContain(configFile);
      expect(logged).toContain('weightRareGraphemes');
      expect(logged).not.toContain(TEXT);
    });

    test('nach der Korrektur der Datei rechnet die nächste Anfrage wieder', async () => {
      await writeConfig('kaputt');
      expect((await calculate()).status).toBe(500);

      await writeConfig(FILE_CONFIG);

      expect((await calculate()).status).toBe(200);
    });
  });
});
