import { Body, Controller, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { CalculateService } from './calculate.service.js';
import { z } from 'zod';

const CalculateSchema = z.object({
  text: z.string().min(1).max(100_000),
  alpha: z.number().min(0).max(10).optional(),
  weightComplexSyllables: z.number().min(0).optional(),
  weightMultiMemberedGraphemes: z.number().min(0).optional(),
  weightRareGraphemes: z.number().min(0).optional(),
  weightConsonantClusters: z.number().min(0).optional(),
  textType: z.enum(['prose', 'list']).optional(),
});

// Der Guard hängt nur an diesem Controller: Alle anderen Routen bleiben ohne Obergrenze.
@Controller('calculate')
@UseGuards(ThrottlerGuard)
export class CalculateController {
  constructor(private readonly calculateService: CalculateService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async calculate(@Body() body: unknown, @Res() res: Response) {
    const parsed = CalculateSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
        error: z.flattenError(parsed.error),
      });
    }

    const { text, textType, ...overrides } = parsed.data;

    // Konfigurations-Auflösung (Standard + Overrides) lebt im Service — der Controller parst und delegiert nur noch.
    const result = await this.calculateService.calculate({
      text,
      overrides,
      textTypeOverride: textType,
    });
    return res.send(result);
  }
}
