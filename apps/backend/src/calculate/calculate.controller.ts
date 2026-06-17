import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CalculateService } from './calculate.service.js';
import { z } from 'zod';

const CalculateSchema = z.object({
  text: z.string().min(1).max(100_000),
  saveResult: z.boolean().optional(),
  alpha: z.number().min(0).max(10).optional(),
  weightComplexSyllables: z.number().min(0).optional(),
  weightMultiMemberedGraphemes: z.number().min(0).optional(),
  weightRareGraphemes: z.number().min(0).optional(),
  weightConsonantClusters: z.number().min(0).optional(),
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

    const hasOverrides = Object.values(overrides).some((value) => value != null);

    // Effektive Parameter: gespeicherte Standardkonfiguration, von der Anfrage überschrieben.
    const merged = {
      alpha: overrides.alpha ?? dbConfig.alpha.toNumber(),
      weightComplexSyllables:
        overrides.weightComplexSyllables ?? dbConfig.weightComplexSyllables.toNumber(),
      weightMultiMemberedGraphemes:
        overrides.weightMultiMemberedGraphemes ?? dbConfig.weightMultiMemberedGraphemes.toNumber(),
      weightRareGraphemes: overrides.weightRareGraphemes ?? dbConfig.weightRareGraphemes.toNumber(),
      weightConsonantClusters:
        overrides.weightConsonantClusters ?? dbConfig.weightConsonantClusters.toNumber(),
    };

    let config;
    if (!hasOverrides) {
      config = dbConfig;
    } else if (saveResult) {
      // Beim Speichern die exakt verwendete Konfiguration festschreiben (FK des Ergebnisses).
      config = await this.prisma.config.create({ data: merged });
    } else {
      // Live-Vorschau: Konfiguration nur im Speicher, nicht persistieren.
      config = {
        ...dbConfig,
        alpha: new Prisma.Decimal(merged.alpha),
        weightComplexSyllables: new Prisma.Decimal(merged.weightComplexSyllables),
        weightMultiMemberedGraphemes: new Prisma.Decimal(merged.weightMultiMemberedGraphemes),
        weightRareGraphemes: new Prisma.Decimal(merged.weightRareGraphemes),
        weightConsonantClusters: new Prisma.Decimal(merged.weightConsonantClusters),
      };
    }

    const result = await this.calculateService.calculate(text, config, saveResult);
    return reply.send(result);
  }
}
