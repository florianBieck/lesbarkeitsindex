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
 * Die vier WK-Felder — genutzt sowohl für die Coverage-Komponenten (jeweils Anteil
 * in [0, 1]) als auch für ihre fachlichen Gewichte (Startwerte 50 / 25 / 12,5 / 12,5).
 * Beide teilen exakt dieselbe Struktur.
 */
export interface WordComplexityValues {
  readonly complexSyllables: number;
  readonly multiMemberedGraphemes: number;
  readonly rareGraphemes: number;
  readonly consonantClusters: number;
}

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
 * Wortkomplexität (WK), 0–100: gewichteter Mittelwert der vier Coverage-Komponenten,
 * normiert auf die Summe der Gewichte und auf 0–100 skaliert. Keine Streckung auf
 * Ankertexte — WK bleibt roh und direkt aus dem Text erklärbar (ADR 0001).
 */
export function calculateWordComplexity(
  components: WordComplexityValues,
  weights: WordComplexityValues,
): number {
  const totalWeight =
    weights.complexSyllables +
    weights.multiMemberedGraphemes +
    weights.rareGraphemes +
    weights.consonantClusters;
  if (totalWeight <= 0) return 0;

  const weightedSum =
    components.complexSyllables * weights.complexSyllables +
    components.multiMemberedGraphemes * weights.multiMemberedGraphemes +
    components.rareGraphemes * weights.rareGraphemes +
    components.consonantClusters * weights.consonantClusters;

  const wordComplexity = (weightedSum / totalWeight) * 100;
  return Math.round(wordComplexity * 100) / 100;
}

/**
 * Berechnet die Wortkomplexität samt ihrer acht Komponentenfelder aus den Wörtern,
 * den Silbenzahlen und den vier Gewichten. Jede Komponente zählt ein Wort höchstens
 * einmal (Coverage, Anteil in [0, 1]); der Nenner ist die Wortzahl.
 */
export function computeWordComplexity(
  words: readonly string[],
  syllablesPerWord: readonly number[],
  weights: WordComplexityValues,
): { readonly wordComplexity: number; readonly components: WordComplexityComponents } {
  const countWords = words.length;

  const countWordsWithComplexSyllables = countComplexSyllableWords(words, syllablesPerWord);
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

  const wordComplexity = calculateWordComplexity(
    {
      complexSyllables: proportionOfWordsWithComplexSyllables,
      multiMemberedGraphemes: proportionOfWordsWithMultiMemberedGraphemes,
      rareGraphemes: proportionOfWordsWithRareGraphemes,
      consonantClusters: proportionOfWordsWithConsonantClusters,
    },
    weights,
  );

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
