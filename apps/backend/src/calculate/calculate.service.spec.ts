import { describe, test, expect, vi } from 'vitest';
import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { CalculateService } from './calculate.service.js';

type PrismaParam = ConstructorParameters<typeof CalculateService>[0];
type SidecarParam = ConstructorParameters<typeof CalculateService>[1];
type ConfigParam = Parameters<CalculateService['calculate']>[1];

const BODY_ANALYSIS = {
  sentences: ['Igel sind nachtaktive Tiere.'],
  words: ['Igel', 'sind', 'nachtaktive', 'Tiere'],
  syllablesPerWord: [2, 1, 4, 2],
  posTags: ['NN', 'VAFIN', 'ADJA', 'NN'],
};

function makeConfig(): ConfigParam {
  return {
    id: 'config-1',
    parameterLix: { toNumber: () => 0.5 },
    parameterProportionOfWordsWithComplexSyllables: { toNumber: () => 0.2 },
    parameterProportionOfWordsWithMultiMemberedGraphemes: { toNumber: () => 0.1 },
    parameterProportionOfWordsWithRareGraphemes: { toNumber: () => 0.1 },
    parameterProportionOfWordsWithConsonantClusters: { toNumber: () => 0.1 },
  } as unknown as ConfigParam;
}

function makeService() {
  const createMock = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...data,
    id: 'result-1',
  }));
  const analyzeTextMock = vi.fn(async () => BODY_ANALYSIS);
  const prismaMock = { result: { create: createMock } };
  const rSidecarMock = { analyzeText: analyzeTextMock };
  const service = new CalculateService(
    prismaMock as unknown as PrismaParam,
    rSidecarMock as unknown as SidecarParam,
  );
  return { service, createMock, analyzeTextMock };
}

describe('CalculateService', () => {
  test('übergibt bei erkanntem Titel nur den Fließtext an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();

    await service.calculate('Der Igel\nIgel sind nachtaktive Tiere.', makeConfig());

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith('Igel sind nachtaktive Tiere.');
  });

  test('übergibt einzeiligen Text vollständig an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();

    await service.calculate('Igel sind nachtaktive Tiere.', makeConfig());

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith('Igel sind nachtaktive Tiere.');
  });

  test('übergibt Text mit Satzzeichen-Erstzeile vollständig an den R-Sidecar', async () => {
    const { service, analyzeTextMock } = makeService();
    const text = 'Das ist ein Satz.\nWeiter geht es hier.';

    await service.calculate(text, makeConfig());

    expect(analyzeTextMock).toHaveBeenCalledExactlyOnceWith(text);
  });

  test('persistiert den Titel und Fließtext-Kennzahlen bei saveResult=true', async () => {
    const { service, createMock } = makeService();
    const text = 'Der Igel\nIgel sind nachtaktive Tiere.';

    await service.calculate(text, makeConfig(), true);

    expect(createMock).toHaveBeenCalledTimes(1);
    const { data } = createMock.mock.calls[0]![0];
    expect(data['title']).toBe('Der Igel');
    expect(data['text']).toBe(text);
    expect(data['countWords']).toBe(4);
  });

  test('liefert Titel und Config bei saveResult=false zurück', async () => {
    const { service, createMock } = makeService();
    const config = makeConfig();

    const result = await service.calculate('Der Igel\nIgel sind nachtaktive Tiere.', config);

    expect(createMock).not.toHaveBeenCalled();
    expect(result.title).toBe('Der Igel');
    expect(result.config).toBe(config);
    expect(result.id).toBe('');
  });

  test('liefert leeren Titel für Text ohne Überschrift zurück', async () => {
    const { service } = makeService();

    const result = await service.calculate('Igel sind nachtaktive Tiere.', makeConfig());

    expect(result.title).toBe('');
  });

  test('übersetzt R-Sidecar-Fehler in ServiceUnavailableException', async () => {
    const { service, analyzeTextMock } = makeService();
    analyzeTextMock.mockRejectedValueOnce(
      new Error('R sidecar unreachable at http://localhost:8787: fetch failed'),
    );

    await expect(
      service.calculate('Der Igel\nIgel schlafen.', makeConfig()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  test('übersetzt sonstige Fehler in InternalServerErrorException', async () => {
    const { service, analyzeTextMock } = makeService();
    analyzeTextMock.mockRejectedValueOnce(new Error('kaputt'));

    await expect(
      service.calculate('Der Igel\nIgel schlafen.', makeConfig()),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
