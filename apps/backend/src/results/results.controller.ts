import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('results')
export class ResultsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getResults(@Query('page') pageParam?: string, @Query('limit') limitParam?: string) {
    const page = Math.max(0, parseInt(pageParam ?? '0', 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '10', 10) || 10));

    const [data, total] = await Promise.all([
      this.prisma.result.findMany({
        skip: page * limit,
        take: limit,
        include: { config: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.result.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
