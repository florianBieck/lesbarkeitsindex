import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { toJsonNumbers } from '../serialize.js';
import { z } from 'zod';

// Toleranz für die Summenprüfung der WK-Gewichte (Gleitkomma-Eingaben).
const WEIGHT_SUM_EPSILON = 0.01;

const UpdateConfigSchema = z
  .object({
    alpha: z.number().min(0).max(10),
    weightComplexSyllables: z.number().min(0),
    weightMultiMemberedGraphemes: z.number().min(0),
    weightRareGraphemes: z.number().min(0),
    weightConsonantClusters: z.number().min(0),
  })
  .refine(
    (cfg) => {
      const sum =
        cfg.weightComplexSyllables +
        cfg.weightMultiMemberedGraphemes +
        cfg.weightRareGraphemes +
        cfg.weightConsonantClusters;
      return Math.abs(sum - 100) <= WEIGHT_SUM_EPSILON;
    },
    {
      error: 'Die Summe der vier WK-Gewichte muss 100 ergeben.',
      path: ['weightSum'],
    },
  );

@Controller('config')
export class AppConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig(@Res() res: Response) {
    const config = await this.prisma.config.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }
    return res.send(toJsonNumbers(config));
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Body() body: unknown, @Res() res: Response) {
    const parsed = UpdateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
        error: z.flattenError(parsed.error),
      });
    }

    const config = await this.prisma.config.create({
      data: {
        alpha: parsed.data.alpha,
        weightComplexSyllables: parsed.data.weightComplexSyllables,
        weightMultiMemberedGraphemes: parsed.data.weightMultiMemberedGraphemes,
        weightRareGraphemes: parsed.data.weightRareGraphemes,
        weightConsonantClusters: parsed.data.weightConsonantClusters,
      },
    });

    return res.send(toJsonNumbers(config));
  }
}
