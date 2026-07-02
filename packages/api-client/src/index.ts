import { ofetch, type $Fetch } from 'ofetch';
import { z } from 'zod';

/** Texttyp eines Textes (ADR 0002): Fließtext oder Liste. */
export const textTypeSchema = z.enum(['prose', 'list']);
export type TextType = z.infer<typeof textTypeSchema>;

/** Leseeinheit (ADR 0002): Satz bei Fließtext, Zeile bei Liste. */
export const readingUnitSchema = z.enum(['sentence', 'line']);
export type ReadingUnit = z.infer<typeof readingUnitSchema>;

/**
 * Heuristische Texttyp-Erkennung (ADR 0002, Issue #30). Liefert „list", wenn
 * die Mehrheit der nicht-leeren Zeilen kein Satzendzeichen (`.`, `!`, `?`)
 * trägt; sonst „prose". Die kanonische Implementierung lebt im Backend; diese
 * Kopie nutzen Backend und Frontend, damit die Erkennung an beiden Stellen
 * identisch bleibt — die Oberfläche zeigt sie schon vor dem Absenden an.
 */
export function detectTextType(text: string): TextType {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return 'prose';

  let withoutTerminal = 0;
  let withTerminal = 0;
  for (const line of lines) {
    if (/[.!?]$/.test(line)) {
      withTerminal++;
    } else {
      withoutTerminal++;
    }
  }
  return withoutTerminal > withTerminal ? 'list' : 'prose';
}

/**
 * Datenvertrag der API — einzige Quelle der Wahrheit für die Antwortform.
 * Das Backend liefert durchgängig Zahlen (kein Decimal-String mehr), daher sind
 * alle Kennzahlen `z.number()`. `z.infer` leitet die Typen ab; die Schemas
 * können bei Bedarf zur Laufzeit validieren.
 */
export const configSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  alpha: z.number(),
  weightComplexSyllables: z.number(),
  weightMultiMemberedGraphemes: z.number(),
  weightRareGraphemes: z.number(),
  weightConsonantClusters: z.number(),
});
export type Config = z.infer<typeof configSchema>;

export const resultDataSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  countWords: z.number(),
  countPhrases: z.number(),
  countSyllables: z.number(),
  countWordsWithComplexSyllables: z.number(),
  countWordsWithConsonantClusters: z.number(),
  countWordsWithMultiMemberedGraphemes: z.number(),
  countWordsWithRareGraphemes: z.number(),
  countWordsWithOneSyllable: z.number(),
  countWordsWithTwoSyllable: z.number(),
  countWordsWithThreeSyllable: z.number(),
  countWordsWithFourSyllable: z.number(),
  countWordsWithFiveSyllable: z.number(),
  averageWordLength: z.number(),
  averagePhraseLength: z.number(),
  averageCharsPerSyllable: z.number(),
  averageSyllablesPerWord: z.number(),
  averageSyllablesPerPhrase: z.number(),
  proportionOfLongWords: z.number(),
  proportionOfWordsWithComplexSyllables: z.number(),
  proportionOfWordsWithConsonantClusters: z.number(),
  proportionOfWordsWithMultiMemberedGraphemes: z.number(),
  proportionOfWordsWithRareGraphemes: z.number(),
  lix: z.number(),
  ratte: z.number(),
  gsmog: z.number(),
  wst4: z.number(),
  fleschKincaid: z.number(),
  ttr: z.number(),
  countAbbreviations: z.number(),
  countNumbers: z.number(),
  countNumbersTwoDigit: z.number(),
  countNumbersThreeDigit: z.number(),
  countNumbersFourDigit: z.number(),
  countNumbersFivePlusDigit: z.number(),
  countSpecialCharacters: z.number(),
  proNIndex: z.number(),
  subordinateClauseRatio: z.number(),
  passiveCount: z.number(),
  nominalizationCount: z.number(),
  wordComplexity: z.number(),
  lueLix: z.number(),
  level: z.number(),
  textType: textTypeSchema,
  readingUnit: readingUnitSchema,
  detectedTextType: textTypeSchema,
  countReadingUnits: z.number(),
  text: z.string(),
  title: z.string(),
  words: z.array(z.string()),
  wordsWithOneSyllable: z.array(z.string()),
  wordsWithTwoSyllables: z.array(z.string()),
  wordsWithThreeSyllables: z.array(z.string()),
  wordsWithFourSyllables: z.array(z.string()),
  wordsWithFiveSyllables: z.array(z.string()),
  phrases: z.array(z.string()),
  hashText: z.string(),
  config: configSchema,
  configId: z.string(),
});
export type ResultData = z.infer<typeof resultDataSchema>;

export interface ResultsResponse {
  data: ResultData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CalculateRequest {
  text: string;
  saveResult?: boolean;
  alpha?: number;
  weightComplexSyllables?: number;
  weightMultiMemberedGraphemes?: number;
  weightRareGraphemes?: number;
  weightConsonantClusters?: number;
  /** Manueller Texttyp-Override (ADR 0002); übersteuert die Heuristik. */
  textType?: TextType;
}

export interface UpdateConfigRequest {
  alpha: number;
  weightComplexSyllables: number;
  weightMultiMemberedGraphemes: number;
  weightRareGraphemes: number;
  weightConsonantClusters: number;
}

export function createApiClient(baseURL: string) {
  const api: $Fetch = ofetch.create({
    baseURL,
    credentials: 'include',
  });

  return {
    getConfig: () => api<Config>('/config'),
    updateConfig: (body: UpdateConfigRequest) => api<Config>('/config', { method: 'POST', body }),
    calculate: (body: CalculateRequest) => api<ResultData>('/calculate', { method: 'POST', body }),
    getResults: (query?: { page?: number; limit?: number }) =>
      api<ResultsResponse>('/results', { query }),
  };
}
