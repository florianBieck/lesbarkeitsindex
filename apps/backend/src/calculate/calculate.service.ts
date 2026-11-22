import {
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RSidecarService } from '../r-sidecar/r-sidecar.service.js';
import {
  computeReadability,
  resolveTextShape,
  type ConfigWeights,
  type TextType,
} from './result/index.js';

/** Vom Nutzer übersteuerbare Gewichte/α einer einzelnen Anfrage (jeweils optional). */
interface ConfigOverrides {
  readonly alpha?: number;
  readonly weightComplexSyllables?: number;
  readonly weightMultiMemberedGraphemes?: number;
  readonly weightRareGraphemes?: number;
  readonly weightConsonantClusters?: number;
}

export interface CalculateParams {
  readonly text: string;
  readonly overrides: ConfigOverrides;
  readonly textTypeOverride?: TextType;
}

@Injectable()
export class CalculateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rSidecar: RSidecarService,
  ) {}

  /**
   * Berechnet die Kennzahlen eines Textes. Nichts wird gespeichert: weder der
   * Text noch das Ergebnis noch die Gewichte der Anfrage (ADR 0008).
   */
  async calculate(params: CalculateParams) {
    const { text, overrides, textTypeOverride } = params;

    const dbConfig = await this.prisma.config.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!dbConfig) {
      throw new InternalServerErrorException('Keine Konfiguration vorhanden');
    }

    // Effektive Gewichte als Zahlen: gespeicherte Standardkonfiguration, von der
    // Anfrage überschrieben. Prisma-Decimal wird hier aufgelöst — die Berechnung
    // bekommt nur noch Zahlen.
    const config: ConfigWeights = {
      alpha: overrides.alpha ?? dbConfig.alpha.toNumber(),
      weightComplexSyllables:
        overrides.weightComplexSyllables ?? dbConfig.weightComplexSyllables.toNumber(),
      weightMultiMemberedGraphemes:
        overrides.weightMultiMemberedGraphemes ?? dbConfig.weightMultiMemberedGraphemes.toNumber(),
      weightRareGraphemes: overrides.weightRareGraphemes ?? dbConfig.weightRareGraphemes.toNumber(),
      weightConsonantClusters:
        overrides.weightConsonantClusters ?? dbConfig.weightConsonantClusters.toNumber(),
    };

    // Dieselbe Textgestalt-Auflösung wie in computeReadability (text-shape.ts).
    const shape = resolveTextShape(text, textTypeOverride);

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

    // Die effektiven (ggf. übersteuerten) Gewichte gehen mit zurück, damit die
    // Gewichts-Meter zeigen, was wirklich genutzt wurde.
    return { ...computeReadability(text, analysis, config, textTypeOverride), config };
  }
}
