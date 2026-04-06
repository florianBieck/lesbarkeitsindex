/*
    Anzahl Wörter
 */
export function calculateCountWords(words: readonly string[]): number {
  return words.length;
}

/*
    Silbenkomplexität (≥3 Silben)
 */
export function calculateSyllableComplexity(
  words: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    if (syllablesPerWord[i] >= 3) {
      count++;
    }
  }
  return count;
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
    const letters = words[i].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
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
    ∅Silben/Wort
 */
export function calculateAverageSyllablesPerWord(
  words: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  if (words.length === 0) return 0;
  let total = 0;
  for (const count of syllablesPerWord) {
    total += count;
  }
  return total / words.length;
}

/*
    Anzahl Sätze
 */
export function calculateCountPhrases(sentences: readonly string[]): number {
  return sentences.length;
}

/*
    Durchschnittliche Satzlänge
 */
export function calculateAveragePhraseLength(
  words: readonly string[],
  sentences: readonly string[],
): number {
  if (sentences.length === 0) return 0;
  return Math.round((words.length / sentences.length) * 100) / 100;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(
  sentences: readonly string[],
  words: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  if (sentences.length === 0) return 0;
  let totalSyllables = 0;
  for (const count of syllablesPerWord) {
    totalSyllables += count;
  }
  return totalSyllables / sentences.length;
}

/*
    Anteil an langen Wörtern
 */
export function calculateProportionOfLongWords(words: readonly string[]): number {
  if (words.length === 0) return 0;
  const LONG_WORD_MIN_LENGTH = 7;
  let longWordCount = 0;
  for (const rawWord of words) {
    const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    if (!word) continue;
    if (word.length >= LONG_WORD_MIN_LENGTH) {
      longWordCount++;
    }
  }
  return longWordCount / words.length;
}
