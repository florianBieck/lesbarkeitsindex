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

/**
 * Datenvertrag der API — einzige Quelle der Wahrheit für die Antwortform.
 * Das Backend liefert durchgängig Zahlen (kein Decimal-String mehr), daher
 * sind alle Kennzahlen `number`.
 */
export interface Config {
  id: string;
  createdAt: string;
  alpha: number;
  weightComplexSyllables: number;
  weightMultiMemberedGraphemes: number;
  weightRareGraphemes: number;
  weightConsonantClusters: number;
}

export interface ResultData {
  id: string;
  createdAt: string;
  countWords: number;
  countSyllables: number;
  countWordsWithComplexSyllables: number;
  countWordsWithConsonantClusters: number;
  countWordsWithMultiMemberedGraphemes: number;
  countWordsWithRareGraphemes: number;
  countWordsWithOneSyllable: number;
  countWordsWithTwoSyllable: number;
  countWordsWithThreeSyllable: number;
  countWordsWithFourSyllable: number;
  countWordsWithFiveSyllable: number;
  averageWordLength: number;
  averagePhraseLength: number;
  averageCharsPerSyllable: number;
  averageSyllablesPerWord: number;
  averageSyllablesPerPhrase: number;
  proportionOfLongWords: number;
  proportionOfWordsWithComplexSyllables: number;
  proportionOfWordsWithConsonantClusters: number;
  proportionOfWordsWithMultiMemberedGraphemes: number;
  proportionOfWordsWithRareGraphemes: number;
  lix: number;
  ratte: number;
  gsmog: number;
  wst4: number;
  fleschKincaid: number;
  ttr: number;
  countAbbreviations: number;
  countNumbers: number;
  countSpecialCharacters: number;
  proNIndex: number;
  subordinateClauseRatio: number;
  passiveCount: number;
  nominalizationCount: number;
  wordComplexity: number;
  lueLix: number;
  level: number;
  textType: TextType;
  readingUnit: ReadingUnit;
  detectedTextType: TextType;
  countReadingUnits: number;
  text: string;
  title: string;
  words: string[];
  wordsWithOneSyllable: string[];
  wordsWithTwoSyllables: string[];
  wordsWithThreeSyllables: string[];
  wordsWithFourSyllables: string[];
  wordsWithFiveSyllables: string[];
  phrases: string[];
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
