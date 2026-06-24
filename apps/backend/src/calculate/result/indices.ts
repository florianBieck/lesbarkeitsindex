import { countWordsWithComplexSyllables } from './basic-metrics.js';

/*
    Lange Wörter (RATTE): Bindestriche werden zuvor entfernt, dann zählt jedes Wort
    mit mehr als 6 Buchstaben. Buchstaben schließen Ziffern ein (gegen das
    RATTE-Referenztool verifiziert). Gemeinsame Hilfsfunktion für LIX und RIX.
 */
function countLongWords(words: readonly string[]): number {
  let count = 0;
  for (const rawWord of words) {
    if (rawWord.replace(/-/g, '').length > 6) count++;
  }
  return count;
}

/*
    LIX (Läsbarhetsindex) - Readability Index
    Formula: (Words / Sentences) + (Long Words * 100 / Words)
    Long words = words with more than 6 Buchstaben.
 */
export function calculateLix(words: readonly string[], sentences: readonly string[]): number {
  const wordCount = words.length;
  if (wordCount === 0) return 0;
  const sentenceCount = Math.max(1, sentences.length);
  const longWordCount = countLongWords(words);
  const lix = wordCount / sentenceCount + (longWordCount * 100) / wordCount;
  return Math.round(lix * 100) / 100;
}

/*
    gSmog (German Simple Measure of Gobbledygook)
    Bamberger's adaptation of McLaughlin's SMOG formula for German texts.
    Formula: √((Count of words with 3+ syllables × 30) / Number of sentences) - 2
    Result approximates the reading age (in school grades) for which the text is suitable.
 */
export function calculateGsmog(
  words: readonly string[],
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const sentenceCount = sentences.length;
  if (sentenceCount === 0) return 0;
  const wordsWithThreeOrMoreSyllables = countWordsWithComplexSyllables(words, syllablesPerWord);
  const gsmog = Math.sqrt((wordsWithThreeOrMoreSyllables * 30) / sentenceCount) - 2;
  return Math.round(gsmog * 100) / 100;
}

/*
    Flesch-Kincaid Index
    Formula: 0.39 * (Words / Sentences) + 11.8 * (Syllables / Words) - 15.59
    Longer sentences require holding more information in memory,
    same applies for decoding long words.
 */
export function calculateFleschKincaid(
  words: readonly string[],
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
  let totalSyllables = 0;
  for (const count of syllablesPerWord) {
    totalSyllables += count;
  }
  const fk = 0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59;
  return Math.round(fk * 100) / 100;
}

/*
    WSTF (Wiener Sachtextformel - 4th Vienna Formula)
    Formula: 0.2656 * (Words / Sentences) + 0.2744 * (Words with 3+ syllables / Words) * 100 - 1.693
    Result indicates reading difficulty level.
*/
export function calculateWstf(
  words: readonly string[],
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
  const wordsWithThreeOrMoreSyllables = countWordsWithComplexSyllables(words, syllablesPerWord);
  const wstf =
    0.2656 * (wordCount / sentenceCount) +
    0.2744 * (wordsWithThreeOrMoreSyllables / wordCount) * 100 -
    1.693;
  return Math.round(wstf * 100) / 100;
}

/*
    RIX (Regensburger Index) — Brügelmann Fußnote 61, S. 17
    Formula:
      √((Words/Sentences) + (LongWords/Words))
    + √(PassiveRatio + SubordinateClauseRatio + NominalizationRatio)
    - 0.26

    Combines sentence length/word complexity with syntactic complexity.
 */
export function calculateRix(
  words: readonly string[],
  sentences: readonly string[],
  passiveCount: number,
  subordinateClauseRatio: number,
  nominalizationCount: number,
): number {
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;

  const longWordCount = countLongWords(words);

  const avgSentenceLength = wordCount / sentenceCount;
  const longWordProportion = longWordCount / wordCount;
  const passiveRatio = passiveCount / sentenceCount;
  const nominalizationRatio = nominalizationCount / sentenceCount;

  const rix =
    Math.sqrt(avgSentenceLength + longWordProportion) +
    Math.sqrt(passiveRatio + subordinateClauseRatio + nominalizationRatio) -
    0.26;

  return Math.round(rix * 100) / 100;
}
