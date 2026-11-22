import {
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DefaultConfigService } from '../config/default-config.service.js';
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
    private readonly defaultConfig: DefaultConfigService,
    private readonly rSidecar: RSidecarService,
  ) {}

  /**
   * Berechnet die Kennzahlen eines Textes. Nichts wird gespeichert: weder der
   * Text noch das Ergebnis noch die Gewichte der Anfrage (ADR 0008).
   */
  async calculate(params: CalculateParams) {
    const { text, overrides, textTypeOverride } = params;

    // Effektive Werte: die Standardkonfiguration aus der config.json, von der
    // Anfrage überschrieben. Eine fehlerhafte Datei bricht hier ab, bevor gerechnet wird.
    const defaults = await this.defaultConfig.read();
    const config: ConfigWeights = {
      alpha: overrides.alpha ?? defaults.alpha,
      weightComplexSyllables: overrides.weightComplexSyllables ?? defaults.weightComplexSyllables,
      weightMultiMemberedGraphemes:
        overrides.weightMultiMemberedGraphemes ?? defaults.weightMultiMemberedGraphemes,
      weightRareGraphemes: overrides.weightRareGraphemes ?? defaults.weightRareGraphemes,
      weightConsonantClusters:
        overrides.weightConsonantClusters ?? defaults.weightConsonantClusters,
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
