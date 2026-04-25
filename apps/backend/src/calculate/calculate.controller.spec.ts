import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CalculateController } from './calculate.controller.js';

const ADMIN_CONFIG = {
  id: 'admin-config-id',
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
  parameterLix: { toNumber: () => 0.8 },
  parameterProportionOfWordsWithComplexSyllables: { toNumber: () => 0.1 },
  parameterProportionOfWordsWithConsonantClusters: { toNumber: () => 0.03 },
  parameterProportionOfWordsWithMultiMemberedGraphemes: { toNumber: () => 0.05 },
  parameterProportionOfWordsWithRareGraphemes: { toNumber: () => 0.02 },
};

function makeMocks() {
  const configCreate = vi.fn();
  const configFindFirst = vi.fn().mockResolvedValue(ADMIN_CONFIG);
  const prisma = {
    config: { findFirst: configFindFirst, create: configCreate },
  };
  const calculateFn = vi.fn().mockResolvedValue({ score: 42 });
  const calculateService = { calculate: calculateFn };

  const controller = new CalculateController(prisma as any, calculateService as any);

  const sent: unknown[] = [];
  let statusCode = 200;
  const reply = {
    status: (code: number) => {
      statusCode = code;
      return reply;
    },
    send: (data: unknown) => {
      sent.push(data);
      return reply;
    },
  };

  return { controller, prisma, configCreate, configFindFirst, calculateFn, reply, sent, get statusCode() { return statusCode; } };
}

describe('CalculateController', () => {
  describe('config pollution bug fix', () => {
    test('does NOT create a Config row when saveResult is false (default)', async () => {
      const { controller, configCreate, configFindFirst, calculateFn, reply, sent } = makeMocks();

      await controller.calculate(
        {
          text: 'Ein einfacher Text zum Testen.',
          parameterLix: 0.6,
          parameterProportionOfWordsWithComplexSyllables: 0.2,
          parameterProportionOfWordsWithConsonantClusters: 0.05,
          parameterProportionOfWordsWithMultiMemberedGraphemes: 0.1,
          parameterProportionOfWordsWithRareGraphemes: 0.05,
        },
        reply as any,
      );

      expect(configCreate).not.toHaveBeenCalled();
      expect(configFindFirst).toHaveBeenCalledOnce();
      expect(calculateFn).toHaveBeenCalledOnce();
      expect(sent).toHaveLength(1);
    });

    test('does NOT create a Config row when saveResult is explicitly false', async () => {
      const { controller, configCreate, reply } = makeMocks();

      await controller.calculate(
        {
          text: 'Noch ein Text.',
          saveResult: false,
          parameterLix: 0.7,
        },
        reply as any,
      );

      expect(configCreate).not.toHaveBeenCalled();
    });

    test('creates a Config row ONLY when saveResult is true', async () => {
      const { controller, configCreate, reply } = makeMocks();
      configCreate.mockResolvedValue({ ...ADMIN_CONFIG, id: 'new-config-id' });

      await controller.calculate(
        {
          text: 'Text der gespeichert werden soll.',
          saveResult: true,
          parameterLix: 0.6,
        },
        reply as any,
      );

      expect(configCreate).toHaveBeenCalledOnce();
    });

    test('passes override weights to calculateService when not saving', async () => {
      const { controller, calculateFn, reply } = makeMocks();

      await controller.calculate(
        {
          text: 'Test text.',
          parameterLix: 0.7,
          parameterProportionOfWordsWithComplexSyllables: 0.15,
        },
        reply as any,
      );

      const configArg = calculateFn.mock.calls[0][1];
      expect(configArg.parameterLix.toNumber()).toBe(0.7);
      expect(configArg.parameterProportionOfWordsWithComplexSyllables.toNumber()).toBe(0.15);
    });

    test('uses DB config when no overrides are provided', async () => {
      const { controller, configCreate, configFindFirst, calculateFn, reply } = makeMocks();

      await controller.calculate(
        { text: 'Kein override.' },
        reply as any,
      );

      expect(configCreate).not.toHaveBeenCalled();
      expect(configFindFirst).toHaveBeenCalledOnce();
      const configArg = calculateFn.mock.calls[0][1];
      expect(configArg.id).toBe('admin-config-id');
    });
  });
});
