import { ofetch, type $Fetch } from 'ofetch';

/** Texttyp eines Textes (ADR 0002): Fließtext oder Liste. */
export type TextType = 'prose' | 'list';

/** Leseeinheit (ADR 0002): Satz bei Fließtext, Zeile bei Liste. */
export type ReadingUnit = 'sentence' | 'line';

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

/** Leseeinheit aus dem Texttyp (ADR 0002). */
export function readingUnitForTextType(textType: TextType): ReadingUnit {
  return textType === 'list' ? 'line' : 'sentence';
}

export interface Config {
  id: string;
  createdAt: string;
  alpha: string;
  weightComplexSyllables: string;
  weightMultiMemberedGraphemes: string;
  weightRareGraphemes: string;
  weightConsonantClusters: string;
  [key: string]: unknown;
}

export interface ResultData {
  id: string;
  createdAt: string;
  countWords: string;
  countPhrases: string;
  countSyllables: string;
  countMultipleWords: string;
  countWordsWithComplexSyllables: string;
  countWordsWithConsonantClusters: string;
  countWordsWithMultiMemberedGraphemes: string;
  countWordsWithRareGraphemes: string;
  countWordsWithOneSyllable: string;
  countWordsWithTwoSyllable: string;
  countWordsWithThreeSyllable: string;
  countWordsWithFourSyllable: string;
  countWordsWithFiveSyllable: string;
  averageWordLength: string;
  averagePhraseLength: string;
  averageCharsPerSyllable: string;
  averageSyllablesPerWord: string;
  averageSyllablesPerPhrase: string;
  proportionOfLongWords: string;
  proportionOfWordsWithComplexSyllables: string;
  proportionOfWordsWithConsonantClusters: string;
  proportionOfWordsWithMultiMemberedGraphemes: string;
  proportionOfWordsWithRareGraphemes: string;
  lix: string;
  ratte: string;
  ratteLevel: string;
  gsmog: string;
  wst4: string;
  fleschKincaid: string;
  ttr: string;
  countAbbreviations: string;
  countNumbers: string;
  countNumbersTwoDigit: string;
  countNumbersThreeDigit: string;
  countNumbersFourDigit: string;
  countNumbersFivePlusDigit: string;
  countSpecialCharacters: string;
  proNIndex: string;
  subordinateClauseRatio: string;
  passiveCount: string;
  nominalizationCount: string;
  wordComplexity: string;
  lueLix: string;
  level: string;
  textType: TextType;
  readingUnit: ReadingUnit;
  detectedTextType: TextType;
  countReadingUnits: string;
  text: string;
  title: string;
  words: string[];
  wordsWithOneSyllable: string[];
  wordsWithTwoSyllables: string[];
  wordsWithThreeSyllables: string[];
  wordsWithFourSyllables: string[];
  wordsWithFiveSyllables: string[];
  phrases: string[];
  syllables: string[];
  hashText: string;
  config: Config;
  configId: string;
}

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

export interface ApiClient {
  getConfig(): Promise<Config>;
  updateConfig(body: UpdateConfigRequest): Promise<Config>;
  calculate(body: CalculateRequest): Promise<ResultData>;
  getResults(query?: { page?: number; limit?: number }): Promise<ResultsResponse>;
}

export function createApiClient(baseURL: string): ApiClient {
  const api: $Fetch = ofetch.create({
    baseURL,
    credentials: 'include',
  });

  return {
    getConfig: () => api('/config'),
    updateConfig: (body) => api('/config', { method: 'POST', body }),
    calculate: (body) => api('/calculate', { method: 'POST', body }),
    getResults: (query) => api('/results', { query }),
  };
}
