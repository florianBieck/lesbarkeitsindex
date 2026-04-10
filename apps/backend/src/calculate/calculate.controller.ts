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

    let config;
    if (overrides.parameterLix != null) {
      const configInput = {
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
        config = await this.prisma.config.create({ data: configInput });
      } else {
        config = {
          id: '',
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
          parameterLix: new Prisma.Decimal(overrides.parameterLix),
          parameterProportionOfWordsWithComplexSyllables: new Prisma.Decimal(
            overrides.parameterProportionOfWordsWithComplexSyllables ?? 0,
          ),
          parameterProportionOfWordsWithConsonantClusters: new Prisma.Decimal(
            overrides.parameterProportionOfWordsWithConsonantClusters ?? 0,
          ),
          parameterProportionOfWordsWithMultiMemberedGraphemes: new Prisma.Decimal(
            overrides.parameterProportionOfWordsWithMultiMemberedGraphemes ?? 0,
          ),
          parameterProportionOfWordsWithRareGraphemes: new Prisma.Decimal(
            overrides.parameterProportionOfWordsWithRareGraphemes ?? 0,
          ),
        };
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
