import { test, expect, describe, vi, beforeEach } from 'vitest';
import { CalculateController } from './calculate.controller.js';

const mockConfigRow = {
  id: 'config-1',
  createdAt: new Date(),
  parameterCountWords: { toNumber: () => 0 },
  parameterCountPhrases: { toNumber: () => 0 },
  parameterCountMultipleWords: { toNumber: () => 0 },
  parameterCountWordsWithComplexSyllables: { toNumber: () => 0 },
  parameterCountWordsWithConsonantClusters: { toNumber: () => 0 },
  parameterCountWordsWithMultiMemberedGraphemes: { toNumber: () => 0 },
  parameterCountWordsWithRareGraphemes: { toNumber: () => 0 },
  parameterAverageWordLength: { toNumber: () => 0 },
  parameterAveragePhraseLength: { toNumber: () => 0 },
  parameterAverageSyllablesPerWord: { toNumber: () => 0 },
  parameterAverageSyllablesPerPhrase: { toNumber: () => 0 },
  parameterProportionOfLongWords: { toNumber: () => 0 },
  parameterLix: { toNumber: () => 0.6 },
  parameterProportionOfWordsWithComplexSyllables: { toNumber: () => 0.2 },
  parameterProportionOfWordsWithConsonantClusters: { toNumber: () => 0.05 },
  parameterProportionOfWordsWithMultiMemberedGraphemes: { toNumber: () => 0.1 },
  parameterProportionOfWordsWithRareGraphemes: { toNumber: () => 0.05 },
};

describe('CalculateController', () => {
  let controller: CalculateController;
  let mockPrisma: { config: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } };
  let mockCalculateService: { calculate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      config: {
        findFirst: vi.fn().mockResolvedValue(mockConfigRow),
        create: vi.fn(),
      },
    };
    mockCalculateService = {
      calculate: vi.fn().mockResolvedValue({ score: 42, configId: 'config-1' }),
    };
    controller = new CalculateController(
      mockPrisma as never,
      mockCalculateService as never,
    );
  });

  test('does not create a Config row when user provides custom weights', async () => {
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await controller.calculate(
      {
        text: 'Ein einfacher Testsatz.',
        parameterLix: 0.8,
        parameterProportionOfWordsWithComplexSyllables: 0.1,
        parameterProportionOfWordsWithConsonantClusters: 0.05,
        parameterProportionOfWordsWithMultiMemberedGraphemes: 0.03,
        parameterProportionOfWordsWithRareGraphemes: 0.02,
      },
      reply as never,
    );

    expect(mockPrisma.config.create).not.toHaveBeenCalled();
    expect(mockPrisma.config.findFirst).toHaveBeenCalled();
    expect(mockCalculateService.calculate).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalled();
  });

  test('passes user-overridden weights to the calculate service', async () => {
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await controller.calculate(
      {
        text: 'Testtext hier.',
        parameterLix: 0.9,
      },
      reply as never,
    );

    const [, configArg] = mockCalculateService.calculate.mock.calls[0];
    expect(configArg.parameterLix.toNumber()).toBe(0.9);
    expect(configArg.id).toBe('config-1');
  });

  test('uses db config weights when no overrides provided', async () => {
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await controller.calculate(
      { text: 'Nur Text ohne Parameter.' },
      reply as never,
    );

    expect(mockPrisma.config.create).not.toHaveBeenCalled();
    const [, configArg] = mockCalculateService.calculate.mock.calls[0];
    expect(configArg.parameterLix.toNumber()).toBe(0.6);
  });
});
