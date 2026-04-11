import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalculateController } from './calculate.controller.js';

function createMockPrisma(latestConfig: Record<string, unknown> | null = null) {
  return {
    config: {
      findFirst: vi.fn().mockResolvedValue(latestConfig),
      create: vi.fn().mockRejectedValue(new Error('config.create must not be called from /calculate')),
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
  return reply as any;
}

const SAMPLE_CONFIG = {
  id: 'cfg-1',
  createdAt: new Date(),
  updatedAt: new Date(),
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
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createMockCalculateService>;
  let controller: CalculateController;

  beforeEach(() => {
    prisma = createMockPrisma(SAMPLE_CONFIG);
    service = createMockCalculateService();
    controller = new CalculateController(prisma as any, service as any);
  });

  it('never creates a Config row when parameterLix is provided', async () => {
    const reply = createMockReply();
    await controller.calculate(
      {
        text: 'Hallo Welt',
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
    expect(service.calculate).toHaveBeenCalledOnce();
  });

  it('reads latest config and applies overrides in memory only', async () => {
    const reply = createMockReply();
    await controller.calculate(
      {
        text: 'Test Text',
        parameterLix: 0.8,
      },
      reply,
    );

    expect(prisma.config.create).not.toHaveBeenCalled();
    const passedConfig = service.calculate.mock.calls[0][1];
    expect(Number(passedConfig.parameterLix)).toBeCloseTo(0.8);
  });

  it('uses DB config as-is when no overrides are provided', async () => {
    const reply = createMockReply();
    await controller.calculate({ text: 'Nur Text' }, reply);

    expect(prisma.config.create).not.toHaveBeenCalled();
    expect(prisma.config.findFirst).toHaveBeenCalledOnce();
    const passedConfig = service.calculate.mock.calls[0][1];
    expect(passedConfig.id).toBe('cfg-1');
  });

  it('returns 500 when no config exists in DB', async () => {
    prisma = createMockPrisma(null);
    controller = new CalculateController(prisma as any, service as any);
    const reply = createMockReply();

    await controller.calculate({ text: 'Test' }, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(service.calculate).not.toHaveBeenCalled();
  });
});
