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
  const resultCreateMock = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...data,
    id: 'result-1',
  }));
  const configFindFirstMock = vi.fn(async () => DB_CONFIG);
  const configCreateMock = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...DB_CONFIG,
    ...data,
    id: 'config-new',
  }));
  const analyzeTextMock = vi.fn(async () => BODY_ANALYSIS);
  const prismaMock = {
    result: { create: resultCreateMock },
    config: { findFirst: configFindFirstMock, create: configCreateMock },
  };
  const rSidecarMock = { analyzeText: analyzeTextMock };
  const service = new CalculateService(
    prismaMock as unknown as PrismaParam,
    rSidecarMock as unknown as SidecarParam,
  );
  return { service, createMock: resultCreateMock, analyzeTextMock };
}

describe('CalculateService', () => {
  test('übergibt bei erkanntem Titel nur den Fließtext an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();

    await service.calculate({
      text: 'Der Igel\nIgel sind nachtaktive Tiere.',
      saveResult: false,
      overrides: {},
    });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith('Igel sind nachtaktive Tiere.');
  });

  test('übergibt einzeiligen Text vollständig an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();

    await service.calculate({
      text: 'Igel sind nachtaktive Tiere.',
      saveResult: false,
      overrides: {},
    });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith('Igel sind nachtaktive Tiere.');
  });

  test('übergibt Text mit Satzzeichen-Erstzeile vollständig an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();
    const text = 'Das ist ein Satz.\nWeiter geht es hier.';

    await service.calculate({ text, saveResult: false, overrides: {} });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith(text);
  });

  test('persistiert den Titel und Fließtext-Kennzahlen bei saveResult=true', async () => {
    const { service, createMock } = makeService();
    const text = 'Der Igel\nIgel sind nachtaktive Tiere.';

    await service.calculate({ text, saveResult: true, overrides: {} });

    expect(createMock).toHaveBeenCalledTimes(1);
    const { data } = createMock.mock.calls[0]![0];
    expect(data['title']).toBe('Der Igel');
    expect(data['text']).toBe(text);
    expect(data['countWords']).toBe(4);
  });

  test('liefert die effektiven Gewichte (numerisch) in result.config bei saveResult=false', async () => {
    const { service, createMock } = makeService();

    const result = await service.calculate({
      text: 'Der Igel\nIgel sind nachtaktive Tiere.',
      saveResult: false,
      overrides: {},
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(result.title).toBe('Der Igel');
    expect(result.id).toBe('');
    expect(result.config.id).toBe('config-1');
    expect(result.config.alpha).toBe(0.3);
    expect(result.config.weightComplexSyllables).toBe(50);
  });

  test('liefert leeren Titel für Text ohne Überschrift zurück', async () => {
    const { service } = makeService();

    const result = await service.calculate({
      text: 'Igel sind nachtaktive Tiere.',
      saveResult: false,
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
      service.calculate({ text: 'Der Igel\nIgel schlafen.', saveResult: false, overrides: {} }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  test('reicht textTypeOverride durch und schickt bei Liste den vollen Text an den R-Sidecar', async () => {
    const { service, analyzeTextMock, createMock } = makeService();
    analyzeTextMock.mockResolvedValueOnce({
      sentences: ['Sonne Eis essen Im Garten spielen.', 'Schwimmen'],
      words: ['Sonne', 'Eis', 'essen', 'Im', 'Garten', 'spielen', 'Schwimmen'],
      syllablesPerWord: [2, 1, 2, 1, 2, 2, 2],
      posTags: ['NN', 'NN', 'VVINF', 'APPR', 'NN', 'VVINF', 'VVINF'],
    });
    const text = 'Sonne\nEis essen\nIm Garten spielen.\nSchwimmen';

    await service.calculate({ text, saveResult: true, overrides: {}, textTypeOverride: 'list' });

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith(text);
    const { data } = createMock.mock.calls[0]![0];
    expect(data['textType']).toBe('list');
    expect(data['readingUnit']).toBe('line');
    expect(data['countReadingUnits']).toBe(4);
    // Titel bleibt leer — die erste Zeile einer Liste ist ein Listenelement.
    expect(data['title']).toBe('');
  });

  test('übersetzt sonstige Fehler in InternalServerErrorException', async () => {
    const { service, analyzeTextMock } = makeService();
    analyzeTextMock.mockRejectedValueOnce(new Error('kaputt'));

    await expect(
      service.calculate({ text: 'Der Igel\nIgel schlafen.', saveResult: false, overrides: {} }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
