import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CalculateController } from './calculate.controller.js';
import { CalculateService } from './calculate.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

function createMockConfig() {
  return {
    id: 'cfg-1',
    createdAt: new Date(),
    parameterCountWords: new Prisma.Decimal(0),
    parameterCountPhrases: new Prisma.Decimal(0),
    parameterCountMultipleWords: new Prisma.Decimal(0),
    parameterCountWordsWithComplexSyllables: new Prisma.Decimal(0),
    parameterCountWordsWithConsonantClusters: new Prisma.Decimal(0),
    parameterCountWordsWithMultiMemberedGraphemes: new Prisma.Decimal(0),
    parameterCountWordsWithRareGraphemes: new Prisma.Decimal(0),
    parameterAverageWordLength: new Prisma.Decimal(0),
    parameterAveragePhraseLength: new Prisma.Decimal(0),
    parameterAverageSyllablesPerWord: new Prisma.Decimal(0),
    parameterAverageSyllablesPerPhrase: new Prisma.Decimal(0),
    parameterProportionOfLongWords: new Prisma.Decimal(0),
    parameterLix: new Prisma.Decimal(0.6),
    parameterProportionOfWordsWithComplexSyllables: new Prisma.Decimal(0.2),
    parameterProportionOfWordsWithConsonantClusters: new Prisma.Decimal(0.05),
    parameterProportionOfWordsWithMultiMemberedGraphemes: new Prisma.Decimal(0.1),
    parameterProportionOfWordsWithRareGraphemes: new Prisma.Decimal(0.05),
  };
}

function createMockReply() {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as Parameters<CalculateController['calculate']>[1];
}

describe('CalculateController', () => {
  let controller: CalculateController;
  let prisma: { config: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } };
  let calculateService: { calculate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      config: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };
    calculateService = {
      calculate: vi.fn().mockResolvedValue({ score: 42 }),
    };
    controller = new CalculateController(
      prisma as unknown as PrismaService,
      calculateService as unknown as CalculateService,
    );
  });

  test('does not create Config rows when parameterLix is provided', async () => {
    prisma.config.findFirst.mockResolvedValue(createMockConfig());
    const reply = createMockReply();

    await controller.calculate(
      {
        text: 'Ein einfacher Satz.',
        parameterLix: 0.7,
        parameterProportionOfWordsWithComplexSyllables: 0.15,
        parameterProportionOfWordsWithConsonantClusters: 0.05,
        parameterProportionOfWordsWithMultiMemberedGraphemes: 0.05,
        parameterProportionOfWordsWithRareGraphemes: 0.05,
      },
      reply,
    );

    expect(prisma.config.create).not.toHaveBeenCalled();
    expect(prisma.config.findFirst).toHaveBeenCalledOnce();
  });

  test('applies parameter overrides as in-memory Prisma.Decimal values', async () => {
    prisma.config.findFirst.mockResolvedValue(createMockConfig());
    const reply = createMockReply();

    await controller.calculate(
      {
        text: 'Ein einfacher Satz.',
        parameterLix: 0.8,
        parameterProportionOfWordsWithComplexSyllables: 0.1,
      },
      reply,
    );

    const configArg = calculateService.calculate.mock.calls[0][1];
    expect(configArg.parameterLix).toEqual(new Prisma.Decimal(0.8));
    expect(configArg.parameterProportionOfWordsWithComplexSyllables).toEqual(
      new Prisma.Decimal(0.1),
    );
    expect(configArg.parameterProportionOfWordsWithConsonantClusters).toEqual(
      new Prisma.Decimal(0.05),
    );
  });

  test('uses DB config as-is when no overrides given', async () => {
    const dbConfig = createMockConfig();
    prisma.config.findFirst.mockResolvedValue(dbConfig);
    const reply = createMockReply();

    await controller.calculate({ text: 'Ein einfacher Satz.' }, reply);

    const configArg = calculateService.calculate.mock.calls[0][1];
    expect(configArg.parameterLix).toEqual(dbConfig.parameterLix);
    expect(configArg.id).toBe('cfg-1');
  });

  test('returns 500 when no config exists', async () => {
    prisma.config.findFirst.mockResolvedValue(null);
    const reply = createMockReply();

    await controller.calculate({ text: 'Ein einfacher Satz.' }, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(calculateService.calculate).not.toHaveBeenCalled();
  });

  test('returns 422 for invalid input', async () => {
    const reply = createMockReply();

    await controller.calculate({ text: '' }, reply);

    expect(reply.status).toHaveBeenCalledWith(422);
  });
});
