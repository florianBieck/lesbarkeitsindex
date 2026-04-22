import { describe, test, expect, vi } from 'vitest';
import { CalculateController } from './calculate.controller.js';

function createMockPrisma(dbConfig: Record<string, unknown> | null) {
  return {
    config: {
      findFirst: vi.fn().mockResolvedValue(dbConfig),
      create: vi.fn(),
    },
  };
}

function createMockCalculateService() {
  return {
    calculate: vi.fn().mockResolvedValue({ score: 42 }),
  };
}

function createMockReply() {
  const reply: Record<string, unknown> = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply as ReturnType<typeof vi.fn> & { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
}

function makeDecimal(n: number) {
  return { toNumber: () => n, toString: () => String(n) };
}

function makeFakeDbConfig() {
  return {
    id: 'config-1',
    createdAt: new Date(),
    parameterCountWords: makeDecimal(0),
    parameterCountPhrases: makeDecimal(0),
    parameterCountMultipleWords: makeDecimal(0),
    parameterCountWordsWithComplexSyllables: makeDecimal(0),
    parameterCountWordsWithConsonantClusters: makeDecimal(0),
    parameterCountWordsWithMultiMemberedGraphemes: makeDecimal(0),
    parameterCountWordsWithRareGraphemes: makeDecimal(0),
    parameterAverageWordLength: makeDecimal(0),
    parameterAveragePhraseLength: makeDecimal(0),
    parameterAverageSyllablesPerWord: makeDecimal(0),
    parameterAverageSyllablesPerPhrase: makeDecimal(0),
    parameterProportionOfLongWords: makeDecimal(0),
    parameterLix: makeDecimal(0.6),
    parameterProportionOfWordsWithComplexSyllables: makeDecimal(0.2),
    parameterProportionOfWordsWithConsonantClusters: makeDecimal(0.05),
    parameterProportionOfWordsWithMultiMemberedGraphemes: makeDecimal(0.1),
    parameterProportionOfWordsWithRareGraphemes: makeDecimal(0.05),
  };
}

describe('CalculateController', () => {
  test('does not create a Config row when parameterLix is sent', async () => {
    const dbConfig = makeFakeDbConfig();
    const prisma = createMockPrisma(dbConfig);
    const service = createMockCalculateService();
    const reply = createMockReply();

    const controller = new CalculateController(prisma as never, service as never);
    await controller.calculate(
      {
        text: 'Hallo Welt',
        parameterLix: 0.7,
        parameterProportionOfWordsWithComplexSyllables: 0.15,
        parameterProportionOfWordsWithConsonantClusters: 0.05,
        parameterProportionOfWordsWithMultiMemberedGraphemes: 0.05,
        parameterProportionOfWordsWithRareGraphemes: 0.05,
      },
      reply as never,
    );

    expect(prisma.config.create).not.toHaveBeenCalled();
    expect(prisma.config.findFirst).toHaveBeenCalledOnce();
    expect(service.calculate).toHaveBeenCalledOnce();
  });

  test('applies parameterLix override from request onto the DB config', async () => {
    const dbConfig = makeFakeDbConfig();
    const prisma = createMockPrisma(dbConfig);
    const service = createMockCalculateService();
    const reply = createMockReply();

    const controller = new CalculateController(prisma as never, service as never);
    await controller.calculate(
      { text: 'Hallo Welt', parameterLix: 0.8 },
      reply as never,
    );

    const configArg = service.calculate.mock.calls[0][1] as Record<string, { toNumber?: () => number }>;
    expect(configArg.id).toBe('config-1');
    expect(configArg.parameterLix.toNumber?.() ?? Number(configArg.parameterLix)).toBeCloseTo(0.8);
  });

  test('uses DB config values when no overrides are sent', async () => {
    const dbConfig = makeFakeDbConfig();
    const prisma = createMockPrisma(dbConfig);
    const service = createMockCalculateService();
    const reply = createMockReply();

    const controller = new CalculateController(prisma as never, service as never);
    await controller.calculate({ text: 'Hallo Welt' }, reply as never);

    expect(prisma.config.create).not.toHaveBeenCalled();
    const configArg = service.calculate.mock.calls[0][1] as Record<string, { toNumber?: () => number }>;
    expect(configArg.parameterLix.toNumber?.()).toBeCloseTo(0.6);
  });

  test('returns 500 when no config exists', async () => {
    const prisma = createMockPrisma(null);
    const service = createMockCalculateService();
    const reply = createMockReply();

    const controller = new CalculateController(prisma as never, service as never);
    await controller.calculate({ text: 'Hallo Welt' }, reply as never);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(service.calculate).not.toHaveBeenCalled();
  });
});
