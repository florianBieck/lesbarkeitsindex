import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CalculateService } from './calculate.service.js';
import { z } from 'zod';

const CalculateSchema = z.object({
  text: z.string().min(1).max(100_000),
  saveResult: z.boolean().optional(),
  parameterLix: z.number().min(0).max(1).optional(),
  parameterProportionOfWordsWithComplexSyllables: z.number().min(0).max(1).optional(),
  parameterProportionOfWordsWithConsonantClusters: z.number().min(0).max(1).optional(),
  parameterProportionOfWordsWithMultiMemberedGraphemes: z.number().min(0).max(1).optional(),
  parameterProportionOfWordsWithRareGraphemes: z.number().min(0).max(1).optional(),
});

function toDecimal(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

function buildInMemoryConfig(weights: {
  parameterLix: number;
  parameterProportionOfWordsWithComplexSyllables: number;
  parameterProportionOfWordsWithConsonantClusters: number;
  parameterProportionOfWordsWithMultiMemberedGraphemes: number;
  parameterProportionOfWordsWithRareGraphemes: number;
}) {
  return {
    id: '',
    createdAt: new Date(),
    parameterCountWords: toDecimal(0),
    parameterCountPhrases: toDecimal(0),
    parameterCountMultipleWords: toDecimal(0),
    parameterCountWordsWithComplexSyllables: toDecimal(0),
    parameterCountWordsWithConsonantClusters: toDecimal(0),
    parameterCountWordsWithMultiMemberedGraphemes: toDecimal(0),
    parameterCountWordsWithRareGraphemes: toDecimal(0),
    parameterAverageWordLength: toDecimal(0),
    parameterAveragePhraseLength: toDecimal(0),
    parameterAverageSyllablesPerWord: toDecimal(0),
    parameterAverageSyllablesPerPhrase: toDecimal(0),
    parameterProportionOfLongWords: toDecimal(0),
    parameterLix: toDecimal(weights.parameterLix),
    parameterProportionOfWordsWithComplexSyllables: toDecimal(
      weights.parameterProportionOfWordsWithComplexSyllables,
    ),
    parameterProportionOfWordsWithConsonantClusters: toDecimal(
      weights.parameterProportionOfWordsWithConsonantClusters,
    ),
    parameterProportionOfWordsWithMultiMemberedGraphemes: toDecimal(
      weights.parameterProportionOfWordsWithMultiMemberedGraphemes,
    ),
    parameterProportionOfWordsWithRareGraphemes: toDecimal(
      weights.parameterProportionOfWordsWithRareGraphemes,
    ),
  };
}

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

    let config;
    if (overrides.parameterLix != null) {
      const weights = {
        parameterLix: overrides.parameterLix,
        parameterProportionOfWordsWithComplexSyllables:
          overrides.parameterProportionOfWordsWithComplexSyllables ?? 0,
        parameterProportionOfWordsWithConsonantClusters:
          overrides.parameterProportionOfWordsWithConsonantClusters ?? 0,
        parameterProportionOfWordsWithMultiMemberedGraphemes:
          overrides.parameterProportionOfWordsWithMultiMemberedGraphemes ?? 0,
        parameterProportionOfWordsWithRareGraphemes:
          overrides.parameterProportionOfWordsWithRareGraphemes ?? 0,
      };

      if (saveResult) {
        config = await this.prisma.config.create({
          data: {
            parameterCountWords: 0,
            parameterCountPhrases: 0,
            parameterCountMultipleWords: 0,
            parameterCountWordsWithComplexSyllables: 0,
            parameterCountWordsWithConsonantClusters: 0,
            parameterCountWordsWithMultiMemberedGraphemes: 0,
            parameterCountWordsWithRareGraphemes: 0,
            parameterAverageWordLength: 0,
            parameterAveragePhraseLength: 0,
            parameterAverageSyllablesPerWord: 0,
            parameterAverageSyllablesPerPhrase: 0,
            parameterProportionOfLongWords: 0,
            ...weights,
          },
        });
      } else {
        config = buildInMemoryConfig(weights);
      }
    } else {
      const dbConfig = await this.prisma.config.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (!dbConfig) {
        return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
      }
      config = {
        ...dbConfig,
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
    }

    const result = await this.calculateService.calculate(text, config, saveResult);
    return reply.send(result);
  }
}
