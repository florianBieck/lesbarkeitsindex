import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CalculateService } from './calculate.service.js';
import { z } from 'zod';

const CalculateSchema = z.object({
  text: z.string().min(1).max(100_000),
  saveResult: z.boolean().optional(),
  parameterLix: z.number().min(0).optional(),
  parameterProportionOfWordsWithComplexSyllables: z.number().min(0).optional(),
  parameterProportionOfWordsWithConsonantClusters: z.number().min(0).optional(),
  parameterProportionOfWordsWithMultiMemberedGraphemes: z.number().min(0).optional(),
  parameterProportionOfWordsWithRareGraphemes: z.number().min(0).optional(),
});

@Controller('calculate')
export class CalculateController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculateService: CalculateService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async calculate(@Body() body: unknown, @Res() reply: FastifyReply) {
    const parsed = CalculateSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
        error: parsed.error.flatten(),
      });
    }

    const { text, saveResult, ...overrides } = parsed.data;

    const dbConfig = await this.prisma.config.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!dbConfig) {
      return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
    const config = {
      ...dbConfig,
      ...(overrides.parameterLix != null && {
        parameterLix: new Prisma.Decimal(overrides.parameterLix),
      }),
      ...(overrides.parameterProportionOfWordsWithComplexSyllables != null && {
        parameterProportionOfWordsWithComplexSyllables: new Prisma.Decimal(
          overrides.parameterProportionOfWordsWithComplexSyllables,
        ),
      }),
      ...(overrides.parameterProportionOfWordsWithConsonantClusters != null && {
        parameterProportionOfWordsWithConsonantClusters: new Prisma.Decimal(
          overrides.parameterProportionOfWordsWithConsonantClusters,
        ),
      }),
      ...(overrides.parameterProportionOfWordsWithMultiMemberedGraphemes != null && {
        parameterProportionOfWordsWithMultiMemberedGraphemes: new Prisma.Decimal(
          overrides.parameterProportionOfWordsWithMultiMemberedGraphemes,
        ),
      }),
      ...(overrides.parameterProportionOfWordsWithRareGraphemes != null && {
        parameterProportionOfWordsWithRareGraphemes: new Prisma.Decimal(
          overrides.parameterProportionOfWordsWithRareGraphemes,
        ),
      }),
    };

    const result = await this.calculateService.calculate(text, config, saveResult);
    return reply.send(result);
  }
}
