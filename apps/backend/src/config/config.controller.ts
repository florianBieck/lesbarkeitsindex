import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { z } from 'zod';

const UpdateConfigSchema = z.object({
  parameterLix: z.number().min(0).max(1),
  parameterProportionOfWordsWithComplexSyllables: z.number().min(0).max(1),
  parameterProportionOfWordsWithMultiMemberedGraphemes: z.number().min(0).max(1),
  parameterProportionOfWordsWithRareGraphemes: z.number().min(0).max(1),
  parameterProportionOfWordsWithConsonantClusters: z.number().min(0).max(1),
});

@Controller('config')
export class AppConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig(@Res() reply: FastifyReply) {
    const config = await this.prisma.config.findFirst({
      where: { results: { none: {} } },
      orderBy: { createdAt: 'desc' },
    });
    if (!config) {
      return reply.status(HttpStatus.NOT_FOUND).send();
    }
    return reply.send(config);
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Body() body: unknown, @Res() reply: FastifyReply) {
    const parsed = UpdateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
        error: parsed.error.flatten(),
      });
    }

    const config = await this.prisma.config.create({
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
        parameterLix: parsed.data.parameterLix,
        parameterProportionOfWordsWithComplexSyllables:
          parsed.data.parameterProportionOfWordsWithComplexSyllables,
        parameterProportionOfWordsWithConsonantClusters:
          parsed.data.parameterProportionOfWordsWithConsonantClusters,
        parameterProportionOfWordsWithMultiMemberedGraphemes:
          parsed.data.parameterProportionOfWordsWithMultiMemberedGraphemes,
        parameterProportionOfWordsWithRareGraphemes:
          parsed.data.parameterProportionOfWordsWithRareGraphemes,
      },
    });

    return reply.send(config);
  }
}
