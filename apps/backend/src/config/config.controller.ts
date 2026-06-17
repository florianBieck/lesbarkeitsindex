import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
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
      message: 'Die Summe der vier WK-Gewichte muss 100 ergeben.',
      path: ['weightSum'],
    },
  );

@Controller('config')
export class AppConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig(@Res() reply: FastifyReply) {
    const config = await this.prisma.config.findFirst({
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
        alpha: parsed.data.alpha,
        weightComplexSyllables: parsed.data.weightComplexSyllables,
        weightMultiMemberedGraphemes: parsed.data.weightMultiMemberedGraphemes,
        weightRareGraphemes: parsed.data.weightRareGraphemes,
        weightConsonantClusters: parsed.data.weightConsonantClusters,
      },
    });

    return reply.send(config);
  }
}
