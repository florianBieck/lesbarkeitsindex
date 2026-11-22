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
/** Aufschlagskoeffizient α und die vier Gewichte der WK-Komponenten (ADR 0001). */
export interface ConfigWeights {
  alpha: number;
  weightComplexSyllables: number;
  weightMultiMemberedGraphemes: number;
  weightRareGraphemes: number;
  weightConsonantClusters: number;
}

/**
 * Die Standardkonfiguration aus der `config.json`, wie `GET /api/config` sie liefert
 * (ADR 0008): die fünf Werte und die Links der Fußzeile, soweit die Datei sie nennt.
 */
export interface Config extends ConfigWeights {
  impressumUrl?: string;
  datenschutzUrl?: string;
}

/** Ergebnis einer Analyse. Es existiert nur in dieser Antwort: Die App speichert nichts (ADR 0008). */
export interface ResultData {
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
  /** Die für diese Analyse genutzten Werte: Standard, von der Anfrage überschrieben. */
  config: ConfigWeights;
}

/*
 * Request-Typen als Typaliasse, nicht als `interface`: Nur Objektliteral-Typen
 * tragen die implizite Indexsignatur, die sie dem `body`-Feld von {@link ApiFetch}
 * (`Record<string, unknown>`) zuweisbar macht.
 */
export type CalculateRequest = {
  text: string;
  alpha?: number;
  weightComplexSyllables?: number;
  weightMultiMemberedGraphemes?: number;
  weightRareGraphemes?: number;
  weightConsonantClusters?: number;
  /** Manueller Texttyp-Override (ADR 0002); übersteuert die Heuristik. */
  textType?: TextType;
};

/**
 * Minimaler Fetch-Vertrag des API-Clients. Der Aufrufer liefert die Umsetzung
 * (im Frontend ein Wrapper um natives `fetch`) und damit jede I/O; der Client
 * baut nur die Pfade samt `/api`-Präfix und bleibt abhängigkeitsfrei.
 */
export type ApiFetch = <T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
  },
) => Promise<T>;

/** Pfad-Präfix der App-API (ADR 0004); alle übrigen Pfade gehören dem Frontend. */
const API_PREFIX = '/api';

export function createApiClient(fetcher: ApiFetch) {
  return {
    getConfig: () => fetcher<Config>(`${API_PREFIX}/config`),
    calculate: (body: CalculateRequest) =>
      fetcher<ResultData>(`${API_PREFIX}/calculate`, { method: 'POST', body }),
  };
}
