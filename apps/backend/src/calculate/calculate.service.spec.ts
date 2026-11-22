import { describe, test, expect, vi } from 'vitest';
import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { CalculateService } from './calculate.service.js';

type PrismaParam = ConstructorParameters<typeof CalculateService>[0];
type SidecarParam = ConstructorParameters<typeof CalculateService>[1];

const BODY_ANALYSIS = {
  sentences: ['Igel sind nachtaktive Tiere.'],
  words: ['Igel', 'sind', 'nachtaktive', 'Tiere'],
  syllablesPerWord: [2, 1, 4, 2],
  posTags: ['NN', 'VAFIN', 'ADJA', 'NN'],
};

/** Gespeicherte Standardkonfiguration, wie sie prisma.config.findFirst liefert (Decimal-Doubles). */
const DB_CONFIG = {
  id: 'config-1',
  createdAt: new Date('2026-06-24T00:00:00.000Z'),
  alpha: { toNumber: () => 0.3 },
  weightComplexSyllables: { toNumber: () => 50 },
  weightMultiMemberedGraphemes: { toNumber: () => 25 },
  weightRareGraphemes: { toNumber: () => 12.5 },
  weightConsonantClusters: { toNumber: () => 12.5 },
};

function makeService() {
  const configFindFirstMock = vi.fn(async () => DB_CONFIG);
  const analyzeTextMock = vi.fn(async () => BODY_ANALYSIS);
  // Nur Lesezugriff auf die Konfiguration: ein Schreibversuch (config.create,
  // result.create) schlüge mit einem TypeError fehl.
  const prismaMock = { config: { findFirst: configFindFirstMock } };
  const rSidecarMock = { analyzeText: analyzeTextMock };
  const service = new CalculateService(
    prismaMock as unknown as PrismaParam,
    rSidecarMock as unknown as SidecarParam,
  );
  return { service, analyzeTextMock };
}

describe('CalculateService', () => {
  test('übergibt bei erkanntem Titel nur den Fließtext an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();

    await service.calculate({
      text: 'Der Igel\nIgel sind nachtaktive Tiere.',
      overrides: {},
    });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith('Igel sind nachtaktive Tiere.');
  });

  test('übergibt einzeiligen Text vollständig an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();

    await service.calculate({
      text: 'Igel sind nachtaktive Tiere.',
      overrides: {},
    });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith('Igel sind nachtaktive Tiere.');
  });

  test('übergibt Text mit Satzzeichen-Erstzeile vollständig an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();
    const text = 'Das ist ein Satz.\nWeiter geht es hier.';

    await service.calculate({ text, overrides: {} });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith(text);
  });

  test('liefert Titel und Fließtext-Kennzahlen zurück', async () => {
    const { service } = makeService();
    const text = 'Der Igel\nIgel sind nachtaktive Tiere.';

    const result = await service.calculate({ text, overrides: {} });

    expect(result.title).toBe('Der Igel');
    expect(result.text).toBe(text);
    expect(result.countWords).toBe(4);
  });

  test('liefert die Standardkonfiguration als fünf Zahlen in result.config', async () => {
    const { service } = makeService();

    const result = await service.calculate({
      text: 'Der Igel\nIgel sind nachtaktive Tiere.',
      overrides: {},
    });

    expect(result.config).toEqual({
      alpha: 0.3,
      weightComplexSyllables: 50,
      weightMultiMemberedGraphemes: 25,
      weightRareGraphemes: 12.5,
      weightConsonantClusters: 12.5,
    });
  });

  test('Overrides der Anfrage ersetzen einzelne Standardwerte in result.config', async () => {
    const { service } = makeService();

    const result = await service.calculate({
      text: 'Igel sind nachtaktive Tiere.',
      overrides: { alpha: 1, weightRareGraphemes: 40 },
    });

    expect(result.config).toEqual({
      alpha: 1,
      weightComplexSyllables: 50,
      weightMultiMemberedGraphemes: 25,
      weightRareGraphemes: 40,
      weightConsonantClusters: 12.5,
    });
  });

  test('die Antwort trägt keine Datenbankfelder', async () => {
    const { service } = makeService();

    const result = await service.calculate({ text: 'Igel sind nachtaktive Tiere.', overrides: {} });

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('configId');
  });

  test('liefert leeren Titel für Text ohne Überschrift zurück', async () => {
    const { service } = makeService();

    const result = await service.calculate({
      text: 'Igel sind nachtaktive Tiere.',
      overrides: {},
    });

    expect(result.title).toBe('');
  });

  test('übersetzt R-Sidecar-Fehler in ServiceUnavailableException', async () => {
    const { service, analyzeTextMock } = makeService();
    analyzeTextMock.mockRejectedValueOnce(
      new Error('R sidecar unreachable at http://localhost:8787: fetch failed'),
    );

    await expect(
      service.calculate({ text: 'Der Igel\nIgel schlafen.', overrides: {} }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  test('reicht textTypeOverride durch und schickt bei Liste den vollen Text an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();
    analyzeTextMock.mockResolvedValueOnce({
      sentences: ['Sonne Eis essen Im Garten spielen.', 'Schwimmen'],
      words: ['Sonne', 'Eis', 'essen', 'Im', 'Garten', 'spielen', 'Schwimmen'],
      syllablesPerWord: [2, 1, 2, 1, 2, 2, 2],
      posTags: ['NN', 'NN', 'VVINF', 'APPR', 'NN', 'VVINF', 'VVINF'],
    });
    const text = 'Sonne\nEis essen\nIm Garten spielen.\nSchwimmen';

    const result = await service.calculate({ text, overrides: {}, textTypeOverride: 'list' });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith(text);
    expect(result.textType).toBe('list');
    expect(result.readingUnit).toBe('line');
    expect(result.countReadingUnits).toBe(4);
    // Titel bleibt leer — die erste Zeile einer Liste ist ein Listenelement.
    expect(result.title).toBe('');
  });

  test('übersetzt sonstige Fehler in InternalServerErrorException', async () => {
    const { service, analyzeTextMock } = makeService();
    analyzeTextMock.mockRejectedValueOnce(new Error('kaputt'));

    await expect(
      service.calculate({ text: 'Der Igel\nIgel schlafen.', overrides: {} }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
