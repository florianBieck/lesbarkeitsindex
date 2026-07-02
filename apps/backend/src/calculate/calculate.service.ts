import {
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RSidecarService } from '../r-sidecar/r-sidecar.service.js';
import { toJsonNumbers } from '../serialize.js';
import {
  computeReadability,
  resolveTextShape,
  type ConfigWeights,
  type TextType,
} from './result/index.js';

/** Vom Nutzer übersteuerbare Gewichte/α einer einzelnen Anfrage (jeweils optional). */
export interface ConfigOverrides {
  readonly alpha?: number;
  readonly weightComplexSyllables?: number;
  readonly weightMultiMemberedGraphemes?: number;
  readonly weightRareGraphemes?: number;
  readonly weightConsonantClusters?: number;
}

export interface CalculateParams {
  readonly text: string;
  readonly saveResult: boolean;
  readonly overrides: ConfigOverrides;
  readonly textTypeOverride?: TextType;
}

@Injectable()
export class CalculateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rSidecar: RSidecarService,
  ) {}

  async calculate(params: CalculateParams) {
    const { text, saveResult, overrides, textTypeOverride } = params;

    const dbConfig = await this.prisma.config.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!dbConfig) {
      throw new InternalServerErrorException('Keine Konfiguration vorhanden');
    }

    const hasOverrides = Object.values(overrides).some((value) => value != null);

    // Effektive Gewichte als Zahlen: gespeicherte Standardkonfiguration, von der
    // Anfrage überschrieben. Prisma-Decimal wird hier aufgelöst — die Berechnung
    // bekommt nur noch Zahlen.
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

    // Beim Speichern mit Overrides die exakt genutzte Konfiguration als Zeile
    // festschreiben (FK des Ergebnisses). Sonst die bestehende Zeile nutzen —
    // eine Live-Vorschau persistiert nie eine Config.
    const configRow =
      saveResult && hasOverrides ? await this.prisma.config.create({ data: merged }) : dbConfig;

    const effectiveConfig: ConfigWeights = { ...merged, id: configRow.id };

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

    const resultData = computeReadability(text, analysis, effectiveConfig, { textTypeOverride });

    if (saveResult) {
      const row = await this.prisma.result.create({
        data: resultData,
        include: { config: true },
      });
      return toJsonNumbers(row);
    }

    // Live-Vorschau: nichts persistieren. Die effektiven (ggf. übersteuerten)
    // Gewichte landen numerisch in result.config, damit die Gewichts-Meter
    // zeigen, was wirklich genutzt wurde.
    return {
      ...resultData,
      config: { ...toJsonNumbers(dbConfig), ...merged },
      id: '',
      createdAt: new Date(),
    };
  }
}
