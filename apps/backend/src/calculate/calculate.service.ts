import {
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RSidecarService } from '../r-sidecar/r-sidecar.service.js';
import {
  computeReadability,
  resolveTextShape,
  type TextType,
} from './result/index.js';

type Config = Prisma.ConfigGetPayload<object>;

export interface CalculateOptions {
  readonly textTypeOverride?: TextType;
}

@Injectable()
export class CalculateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rSidecar: RSidecarService,
  ) {}

  async calculate(
    text: string,
    config: Config,
    saveResult: boolean = false,
    options: CalculateOptions = {},
  ) {
    // Dieselbe Textgestalt-Auflösung wie in computeReadability (text-shape.ts):
    // so sieht der R-Sidecar genau den bodyText, aus dem die Kennzahlen
    // berechnet werden (ADR 0002). Bei Listen der volle Text, bei Fließtext
    // der Text ohne Titel.
    const shape = resolveTextShape(text, options.textTypeOverride);

    let analysis;
    try {
      analysis = await this.rSidecar.analyzeText(shape.bodyText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('R sidecar')) {
        throw new ServiceUnavailableException(message);
      }
      throw new InternalServerErrorException(message);
    }

    const resultData = computeReadability(text, analysis, config, {
      textTypeOverride: options.textTypeOverride,
    });

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
