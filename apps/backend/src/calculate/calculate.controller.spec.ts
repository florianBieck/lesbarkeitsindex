import { test, expect, describe, vi, beforeEach } from 'vitest';
import { CalculateController } from './calculate.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CalculateService } from './calculate.service.js';
import type { FastifyReply } from 'fastify';

function createMockReply(): FastifyReply {
  const reply = {
    statusCode: 200,
    sent: null as unknown,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(payload?: unknown) {
      reply.sent = payload;
      return reply;
    },
  };
  return reply as unknown as FastifyReply;
}

describe('CalculateController — config persistence behavior', () => {
  let controller: CalculateController;
  let prisma: { config: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> } };
  let calculateService: { calculate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      config: {
        create: vi.fn().mockResolvedValue({ id: 'persisted-config-id', parameterLix: { toNumber: () => 0.6 } }),
        findFirst: vi.fn(),
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

  test('does NOT create a Config row when saveResult is false and parameterLix is provided', async () => {
    const reply = createMockReply();
    await controller.calculate(
      {
        text: 'Hallo Welt',
        saveResult: false,
        parameterLix: 0.6,
        parameterProportionOfWordsWithComplexSyllables: 0.2,
        parameterProportionOfWordsWithConsonantClusters: 0.05,
        parameterProportionOfWordsWithMultiMemberedGraphemes: 0.1,
        parameterProportionOfWordsWithRareGraphemes: 0.05,
      },
      reply,
    );

    expect(prisma.config.create).not.toHaveBeenCalled();
    expect(calculateService.calculate).toHaveBeenCalledTimes(1);

    const configArg = calculateService.calculate.mock.calls[0][1];
    expect(configArg.parameterLix.toNumber()).toBe(0.6);
    expect(configArg.id).toBe('');
  });

  test('does NOT create a Config row when saveResult is omitted and parameterLix is provided', async () => {
    const reply = createMockReply();
    await controller.calculate(
      {
        text: 'Hallo Welt',
        parameterLix: 0.6,
      },
      reply,
    );

    expect(prisma.config.create).not.toHaveBeenCalled();
  });

  test('DOES create a Config row when saveResult is true and parameterLix is provided', async () => {
    const reply = createMockReply();
    await controller.calculate(
      {
        text: 'Hallo Welt',
        saveResult: true,
        parameterLix: 0.6,
      },
      reply,
    );

    expect(prisma.config.create).toHaveBeenCalledTimes(1);
  });

  test('uses existing DB config when no parameterLix override is provided', async () => {
    prisma.config.findFirst.mockResolvedValue({
      id: 'admin-config-id',
      parameterLix: { toNumber: () => 0.5 },
      parameterProportionOfWordsWithComplexSyllables: { toNumber: () => 0.2 },
      parameterProportionOfWordsWithConsonantClusters: { toNumber: () => 0.1 },
      parameterProportionOfWordsWithMultiMemberedGraphemes: { toNumber: () => 0.1 },
      parameterProportionOfWordsWithRareGraphemes: { toNumber: () => 0.1 },
    });

    const reply = createMockReply();
    await controller.calculate(
      {
        text: 'Hallo Welt',
      },
      reply,
    );

    expect(prisma.config.create).not.toHaveBeenCalled();
    expect(prisma.config.findFirst).toHaveBeenCalledTimes(1);

    const configArg = calculateService.calculate.mock.calls[0][1];
    expect(configArg.id).toBe('admin-config-id');
  });
});
