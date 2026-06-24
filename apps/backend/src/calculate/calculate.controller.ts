import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
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
  textType: z.enum(['prose', 'list']).optional(),
});

@Controller('calculate')
export class CalculateController {
  constructor(private readonly calculateService: CalculateService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async calculate(@Body() body: unknown, @Res() reply: FastifyReply) {
    const parsed = CalculateSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
        error: parsed.error.flatten(),
      });
    }

    const { text, saveResult, textType, ...overrides } = parsed.data;

    // Konfigurations-Auflösung (Standard + Overrides, Persistenz vs. Vorschau)
    // lebt im Service — der Controller parst und delegiert nur noch.
    const result = await this.calculateService.calculate({
      text,
      saveResult: saveResult ?? false,
      overrides,
      textTypeOverride: textType,
    });
    return reply.send(result);
  }
}
