/*
    Wortkomplexität (WK, ADR 0001): eigenständiger Wert 0–100, gewichteter
    Mittelwert von vier Coverage-Komponenten. WK bleibt roh — keine Streckung
    auf Ankertexte. Die vier WK-Komponente-Zähler leben weiterhin in
    basic-metrics.ts / grapheme-analysis.ts (gSMOG/WSTF nutzen denselben
    Silbenzähler); dieses Modul ruft sie auf und bündelt Anteile + Mittelwert.

    Die Grenze zum Aufschlagsmodell ist bewusst: LÜ-LIX (LIX + α·WK) und die
    Niveaustufe gehören NICHT hierher (siehe score-model.ts).
 */

import { countWordsWithComplexSyllables as countComplexSyllableWords } from './basic-metrics.js';
import {
  countWordsWithMultiMemberedGraphemes as countMultiMemberedGraphemeWords,
  countWordsWithRareGraphemes as countRareGraphemeWords,
  countWordsWithConsonantClusters as countConsonantClusterWords,
} from './grapheme-analysis.js';

/**
 * Die acht WK-Komponentenfelder, die computeReadability als eigenständige
 * Ergebnisfelder ausweist und persistiert (Schema-Spaltennamen, exakt).
 */
export interface WordComplexityComponents {
  readonly countWordsWithComplexSyllables: number;
  readonly countWordsWithConsonantClusters: number;
  readonly countWordsWithMultiMemberedGraphemes: number;
  readonly countWordsWithRareGraphemes: number;
  readonly proportionOfWordsWithComplexSyllables: number;
  readonly proportionOfWordsWithConsonantClusters: number;
  readonly proportionOfWordsWithMultiMemberedGraphemes: number;
  readonly proportionOfWordsWithRareGraphemes: number;
}

/**
 * Berechnet die Wortkomplexität (WK, 0–100) samt ihrer acht Komponentenfelder
 * aus den Wörtern, den Silbenzahlen und den vier fachlichen Gewichten
 * (Startwerte 50 / 25 / 12,5 / 12,5). Jede Komponente zählt ein Wort höchstens
 * einmal (Coverage, Anteil in [0, 1]); der Nenner ist die Wortzahl. WK ist der
 * auf die Gewichtssumme normierte, auf 0–100 skalierte gewichtete Mittelwert —
 * bei Gesamtgewicht 0 ist WK 0 (kein Division-durch-Null).
 */
export function computeWordComplexity(
  words: readonly string[],
  syllablesPerWord: readonly number[],
  weights: {
    readonly complexSyllables: number;
    readonly multiMemberedGraphemes: number;
    readonly rareGraphemes: number;
    readonly consonantClusters: number;
  },
): { readonly wordComplexity: number; readonly components: WordComplexityComponents } {
  const countWords = words.length;

  const countWordsWithComplexSyllables = countComplexSyllableWords(syllablesPerWord);
  const countWordsWithConsonantClusters = countConsonantClusterWords(words);
  const countWordsWithMultiMemberedGraphemes = countMultiMemberedGraphemeWords(words);
  const countWordsWithRareGraphemes = countRareGraphemeWords(words);

  const proportionOfWordsWithComplexSyllables =
    countWords > 0 ? countWordsWithComplexSyllables / countWords : 0;
  const proportionOfWordsWithConsonantClusters =
    countWords > 0 ? countWordsWithConsonantClusters / countWords : 0;
  const proportionOfWordsWithMultiMemberedGraphemes =
    countWords > 0 ? countWordsWithMultiMemberedGraphemes / countWords : 0;
  const proportionOfWordsWithRareGraphemes =
    countWords > 0 ? countWordsWithRareGraphemes / countWords : 0;

  const totalWeight =
    weights.complexSyllables +
    weights.multiMemberedGraphemes +
    weights.rareGraphemes +
    weights.consonantClusters;
  const weightedSum =
    proportionOfWordsWithComplexSyllables * weights.complexSyllables +
    proportionOfWordsWithMultiMemberedGraphemes * weights.multiMemberedGraphemes +
    proportionOfWordsWithRareGraphemes * weights.rareGraphemes +
    proportionOfWordsWithConsonantClusters * weights.consonantClusters;
  const wordComplexity =
    totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100 * 100) / 100 : 0;

  return {
    wordComplexity,
    components: {
      countWordsWithComplexSyllables,
      countWordsWithConsonantClusters,
      countWordsWithMultiMemberedGraphemes,
      countWordsWithRareGraphemes,
      proportionOfWordsWithComplexSyllables,
      proportionOfWordsWithConsonantClusters,
      proportionOfWordsWithMultiMemberedGraphemes,
      proportionOfWordsWithRareGraphemes,
    },
  };
}
