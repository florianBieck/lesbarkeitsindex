/** Alles außer deutschen Buchstaben (A–Z, Umlaute, ß). */
const NON_LETTERS = /[^A-Za-zÄÖÜäöüß]/g;

/** Entfernt alle Nicht-Buchstaben aus einem Wort — gemeinsamer Strip für alle Zähler. */
export function stripNonLetters(word: string): string {
  return word.replace(NON_LETTERS, '');
}

/*
    Coverage: Anzahl der Wörter mit komplexen Silben (≥3 Silben), je Wort max. einmal.
 */
export function countWordsWithComplexSyllables(syllablesPerWord: readonly number[]): number {
  return syllablesPerWord.filter((count) => count >= 3).length;
}

/*
    Durchschnittliche Buchstaben pro Silbe (Br 9)
    Formula: total letter characters / total syllables
 */
export function calculateAverageCharsPerSyllable(
  words: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  if (words.length === 0) return 0;
  let totalChars = 0;
  let totalSyllables = 0;
  for (let i = 0; i < words.length; i++) {
    const letters = stripNonLetters(words[i]);
    totalChars += letters.length;
    totalSyllables += syllablesPerWord[i];
  }
  if (totalSyllables === 0) return 0;
  return Math.round((totalChars / totalSyllables) * 100) / 100;
}

/*
    Durchschnittliche Wortlänge
 */
export function calculateAverageWordLength(words: readonly string[]): number {
  if (words.length === 0) return 0;
  let totalLength = 0;
  for (const word of words) {
    totalLength += word.length;
  }
  return totalLength / words.length;
}

/*
    ∅Silben/Wort (Nenner: Silbenzahl-Liste — per Sidecar-Vertrag == Wortzahl)
 */
export function calculateAverageSyllablesPerWord(syllablesPerWord: readonly number[]): number {
  if (syllablesPerWord.length === 0) return 0;
  let total = 0;
  for (const count of syllablesPerWord) {
    total += count;
  }
  return total / syllablesPerWord.length;
}

/*
    Durchschnittliche Satzlänge (Nenner: Anzahl Leseeinheiten — Sätze oder Zeilen)
 */
export function calculateAveragePhraseLength(
  words: readonly string[],
  sentenceCount: number,
): number {
  if (sentenceCount === 0) return 0;
  return Math.round((words.length / sentenceCount) * 100) / 100;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(
  sentenceCount: number,
  syllablesPerWord: readonly number[],
): number {
  if (sentenceCount === 0) return 0;
  let totalSyllables = 0;
  for (const count of syllablesPerWord) {
    totalSyllables += count;
  }
  return totalSyllables / sentenceCount;
}

/*
    Anteil an langen Wörtern
 */
export function calculateProportionOfLongWords(words: readonly string[]): number {
  if (words.length === 0) return 0;
  const LONG_WORD_MIN_LENGTH = 7;
  let longWordCount = 0;
  for (const rawWord of words) {
    if (stripNonLetters(rawWord).length >= LONG_WORD_MIN_LENGTH) {
      longWordCount++;
    }
  }
  return longWordCount / words.length;
}
