import { test, expect, describe, vi, beforeEach } from 'vitest';
import { CalculateController } from './calculate.controller.js';
import { Prisma } from '../generated/prisma/client.js';

function createDecimal(value: number) {
  return new Prisma.Decimal(value);
}

const MOCK_CONFIG = {
  id: 'config-1',
  createdAt: new Date(),
  parameterCountWords: createDecimal(0),
  parameterCountPhrases: createDecimal(0),
  parameterCountMultipleWords: createDecimal(0),
  parameterCountWordsWithComplexSyllables: createDecimal(0),
  parameterCountWordsWithConsonantClusters: createDecimal(0),
  parameterCountWordsWithMultiMemberedGraphemes: createDecimal(0),
  parameterCountWordsWithRareGraphemes: createDecimal(0),
  parameterAverageWordLength: createDecimal(0),
  parameterAveragePhraseLength: createDecimal(0),
  parameterAverageSyllablesPerWord: createDecimal(0),
  parameterAverageSyllablesPerPhrase: createDecimal(0),
  parameterProportionOfLongWords: createDecimal(0),
  parameterLix: createDecimal(0.6),
  parameterProportionOfWordsWithComplexSyllables: createDecimal(0.2),
  parameterProportionOfWordsWithConsonantClusters: createDecimal(0.05),
  parameterProportionOfWordsWithMultiMemberedGraphemes: createDecimal(0.1),
  parameterProportionOfWordsWithRareGraphemes: createDecimal(0.05),
};

const MOCK_RESULT = { score: 42 };

describe('CalculateController', () => {
  let controller: CalculateController;
  let mockPrisma: {
    config: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  };
  let mockCalculateService: { calculate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      config: {
        findFirst: vi.fn().mockResolvedValue(MOCK_CONFIG),
        create: vi.fn(),
      },
    };
    mockCalculateService = {
      calculate: vi.fn().mockResolvedValue(MOCK_RESULT),
    };
    controller = new CalculateController(
      mockPrisma as any,
      mockCalculateService as any,
    );
  });

  function mockReply() {
    const reply: any = {
      statusCode: 200,
      body: undefined,
      status(code: number) {
        reply.statusCode = code;
        return reply;
      },
      send(data?: unknown) {
        reply.body = data;
        return reply;
      },
    };
    return reply;
  }

  test('does not create a Config row when parameterLix is provided', async () => {
    const reply = mockReply();

    await controller.calculate(
      {
        text: 'Der Hund läuft.',
        parameterLix: 0.7,
        parameterProportionOfWordsWithComplexSyllables: 0.15,
        parameterProportionOfWordsWithConsonantClusters: 0.05,
        parameterProportionOfWordsWithMultiMemberedGraphemes: 0.05,
        parameterProportionOfWordsWithRareGraphemes: 0.05,
      },
      reply,
    );

    expect(mockPrisma.config.create).not.toHaveBeenCalled();
    expect(mockPrisma.config.findFirst).toHaveBeenCalledOnce();
    expect(reply.statusCode).toBe(200);
  });

  test('applies parameterLix override as Prisma.Decimal', async () => {
    const reply = mockReply();

    await controller.calculate(
      {
        text: 'Der Hund läuft.',
        parameterLix: 0.8,
      },
      reply,
    );

    const passedConfig = mockCalculateService.calculate.mock.calls[0][1];
    expect(passedConfig.parameterLix).toBeInstanceOf(Prisma.Decimal);
    expect(passedConfig.parameterLix.toNumber()).toBe(0.8);
    expect(passedConfig.id).toBe('config-1');
  });

  test('uses DB config as-is when no overrides provided', async () => {
    const reply = mockReply();

    await controller.calculate(
      {
        text: 'Der Hund läuft.',
      },
      reply,
    );

    const passedConfig = mockCalculateService.calculate.mock.calls[0][1];
    expect(passedConfig.parameterLix.toNumber()).toBe(0.6);
    expect(passedConfig.id).toBe('config-1');
    expect(mockPrisma.config.create).not.toHaveBeenCalled();
  });

  test('returns 500 when no config exists in DB', async () => {
    mockPrisma.config.findFirst.mockResolvedValue(null);
    const reply = mockReply();

    await controller.calculate(
      {
        text: 'Der Hund läuft.',
        parameterLix: 0.5,
      },
      reply,
    );

    expect(reply.statusCode).toBe(500);
    expect(mockCalculateService.calculate).not.toHaveBeenCalled();
  });

  test('returns 422 for invalid body', async () => {
    const reply = mockReply();

    await controller.calculate({ text: '' }, reply);

    expect(reply.statusCode).toBe(422);
    expect(mockCalculateService.calculate).not.toHaveBeenCalled();
    expect(mockPrisma.config.findFirst).not.toHaveBeenCalled();
  });
});
