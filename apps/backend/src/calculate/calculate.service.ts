import {
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RSidecarService } from '../r-sidecar/r-sidecar.service.js';
import { computeReadability } from './result/index.js';

type Config = Prisma.ConfigGetPayload<object>;

@Injectable()
export class CalculateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rSidecar: RSidecarService,
  ) {}

  async calculate(text: string, config: Config, saveResult: boolean = false) {
    let analysis;
    try {
      analysis = await this.rSidecar.analyzeText(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('R sidecar')) {
        throw new ServiceUnavailableException(message);
      }
      throw new InternalServerErrorException(message);
    }

    const resultData = computeReadability(text, analysis, config);

    if (saveResult) {
      return this.prisma.result.create({
        data: resultData,
        include: { config: true },
      });
    }

    return {
      ...resultData,
      config,
      id: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
