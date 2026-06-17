import { createHash } from 'crypto';
import type { TextAnalysis } from '../../r-sidecar/r-sidecar.service.js';

import {
  calculateCountWords,
  calculateCountPhrases,
  countWordsWithComplexSyllables as computeWordsWithComplexSyllables,
  calculateAverageWordLength,
  calculateAverageCharsPerSyllable,
  calculateAverageSyllablesPerWord,
  calculateAveragePhraseLength,
  calculateAverageSyllablesPerPhrase,
  calculateProportionOfLongWords,
} from './basic-metrics.js';
import {
  countWordsWithMultiMemberedGraphemes as computeWordsWithMultiMemberedGraphemes,
  countWordsWithRareGraphemes as computeWordsWithRareGraphemes,
  countWordsWithConsonantClusters as computeWordsWithConsonantClusters,
} from './grapheme-analysis.js';
import {
  calculateLix,
  calculateGsmog,
  calculateFleschKincaid,
  calculateWstf,
  calculateRix,
} from './indices.js';
import {
  calculateProNIndex,
  calculateSubordinateClauseRatio,
  calculatePassiveCount,
  calculateNominalizations,
} from './linguistic-features.js';
import {
  calculateTTR,
  calculateAbbreviations,
  calculateNumbers,
  calculateSpecialCharacters,
} from './text-features.js';
import { detectTitle } from './title-guard.js';
import { calculateWordComplexity, calculateLueLix, calculateLevel } from './score-model.js';

export * from './basic-metrics.js';
export * from './grapheme-analysis.js';
export * from './indices.js';
export * from './linguistic-features.js';
export * from './text-features.js';
export * from './title-guard.js';
export * from './score-model.js';

/**
 * Konfiguration des Aufschlagsmodells: Aufschlagskoeffizient α plus die vier
 * Gewichte der Wortkomplexitäts-Komponenten. `toNumber()`-Schnittstelle, damit
 * sowohl Prisma-`Decimal` als auch einfache Test-Doubles passen.
 */
export interface ConfigWeights {
  readonly alpha: { toNumber(): number };
  readonly weightComplexSyllables: { toNumber(): number };
  readonly weightMultiMemberedGraphemes: { toNumber(): number };
  readonly weightRareGraphemes: { toNumber(): number };
  readonly weightConsonantClusters: { toNumber(): number };
  readonly id: string;
}

/**
 * Berechnet alle Kennzahlen aus dem vollen Originaltext und der
 * Sidecar-Analyse des Fließtexts.
 *
 * Invariante: `analysis` MUSS aus `detectTitle(text).bodyText` erzeugt worden
 * sein. `detectTitle` ist deterministisch, daher leitet diese Funktion Titel
 * und Fließtext selbst aus `text` ab und kann nie von der Analyse abweichen.
 * Ein erkannter Titel fließt in keine Kennzahl ein; `text` und `hashText`
 * behalten den vollen Originaltext inklusive Titel.
 */
export function computeReadability(text: string, analysis: TextAnalysis, config: ConfigWeights) {
  const { sentences, words, syllablesPerWord, posTags } = analysis;

  const { title, bodyText } = detectTitle(text);

  const countWords = calculateCountWords(words);
  const countPhrases = calculateCountPhrases(sentences);
  const countMultipleWords = countPhrases;
  const countWordsWithComplexSyllables = computeWordsWithComplexSyllables(words, syllablesPerWord);
  const countWordsWithConsonantClusters = computeWordsWithConsonantClusters(words);
  const countWordsWithMultiMemberedGraphemes = computeWordsWithMultiMemberedGraphemes(words);
  const countWordsWithRareGraphemes = computeWordsWithRareGraphemes(words);
  const abbreviations = calculateAbbreviations(words);
  const numbers = calculateNumbers(words);
  const specialCharacters = calculateSpecialCharacters(bodyText);
  const averageWordLength = calculateAverageWordLength(words);
  const averageCharsPerSyllable = calculateAverageCharsPerSyllable(words, syllablesPerWord);
  const averageSyllablesPerWord = calculateAverageSyllablesPerWord(words, syllablesPerWord);
  const averagePhraseLength = calculateAveragePhraseLength(words, sentences);
  const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(
    sentences,
    words,
    syllablesPerWord,
  );
  const proportionOfLongWords = calculateProportionOfLongWords(words);
  const proportionOfWordsWithComplexSyllables =
    countWords > 0 ? countWordsWithComplexSyllables / countWords : 0;
  const proportionOfWordsWithConsonantClusters =
    countWords > 0 ? countWordsWithConsonantClusters / countWords : 0;
  const proportionOfWordsWithMultiMemberedGraphemes =
    countWords > 0 ? countWordsWithMultiMemberedGraphemes / countWords : 0;
  const proportionOfWordsWithRareGraphemes =
    countWords > 0 ? countWordsWithRareGraphemes / countWords : 0;
  const lix = calculateLix(words, sentences);
  const gsmog = calculateGsmog(words, sentences, syllablesPerWord);
  const fleschKincaid = calculateFleschKincaid(words, sentences, syllablesPerWord);
  const wst4 = calculateWstf(words, sentences, syllablesPerWord);
  const ttr = calculateTTR(words);
  const proNIndex = calculateProNIndex(posTags);
  const subordinateClauseRatio = calculateSubordinateClauseRatio(posTags, sentences);
  const passiveCount = calculatePassiveCount(words, posTags);
  const nominalizationCount = calculateNominalizations(words, posTags);
  const rix = calculateRix(
    words,
    sentences,
    passiveCount,
    subordinateClauseRatio,
    nominalizationCount,
  );

  const wordComplexity = calculateWordComplexity(
    {
      complexSyllables: proportionOfWordsWithComplexSyllables,
      multiMemberedGraphemes: proportionOfWordsWithMultiMemberedGraphemes,
      rareGraphemes: proportionOfWordsWithRareGraphemes,
      consonantClusters: proportionOfWordsWithConsonantClusters,
    },
    {
      complexSyllables: config.weightComplexSyllables.toNumber(),
      multiMemberedGraphemes: config.weightMultiMemberedGraphemes.toNumber(),
      rareGraphemes: config.weightRareGraphemes.toNumber(),
      consonantClusters: config.weightConsonantClusters.toNumber(),
    },
  );
  const lueLix = calculateLueLix(lix, wordComplexity, config.alpha.toNumber());
  const level = calculateLevel(lueLix);

  const totalSyllables = syllablesPerWord.reduce((sum, c) => sum + c, 0);
  const wordsWithOneSyllable = words.filter((_, i) => syllablesPerWord[i] === 1);
  const wordsWithTwoSyllables = words.filter((_, i) => syllablesPerWord[i] === 2);
  const wordsWithThreeSyllables = words.filter((_, i) => syllablesPerWord[i] === 3);
  const wordsWithFourSyllables = words.filter((_, i) => syllablesPerWord[i] === 4);
  const wordsWithFiveSyllables = words.filter((_, i) => syllablesPerWord[i] >= 5);

  return {
    countWords,
    countPhrases,
    countSyllables: totalSyllables,
    countMultipleWords,
    countWordsWithComplexSyllables,
    countWordsWithConsonantClusters,
    countWordsWithMultiMemberedGraphemes,
    countWordsWithRareGraphemes,
    countWordsWithOneSyllable: wordsWithOneSyllable.length,
    countWordsWithTwoSyllable: wordsWithTwoSyllables.length,
    countWordsWithThreeSyllable: wordsWithThreeSyllables.length,
    countWordsWithFourSyllable: wordsWithFourSyllables.length,
    countWordsWithFiveSyllable: wordsWithFiveSyllables.length,
    averageWordLength,
    averageCharsPerSyllable,
    averageSyllablesPerWord,
    averagePhraseLength,
    averageSyllablesPerPhrase,
    proportionOfLongWords,
    proportionOfWordsWithComplexSyllables,
    proportionOfWordsWithConsonantClusters,
    proportionOfWordsWithMultiMemberedGraphemes,
    proportionOfWordsWithRareGraphemes,
    lix,
    ttr,
    countAbbreviations: abbreviations.count,
    countNumbers: numbers.count,
    countNumbersTwoDigit: numbers.twoDigit,
    countNumbersThreeDigit: numbers.threeDigit,
    countNumbersFourDigit: numbers.fourDigit,
    countNumbersFivePlusDigit: numbers.fivePlusDigit,
    countSpecialCharacters: specialCharacters.count,
    proNIndex,
    subordinateClauseRatio,
    passiveCount,
    nominalizationCount,
    ratte: rix,
    ratteLevel: 0,
    gsmog,
    wst4,
    fleschKincaid,
    wordComplexity,
    lueLix,
    level,
    text,
    title,
    words: [...words],
    wordsWithOneSyllable,
    wordsWithTwoSyllables,
    wordsWithThreeSyllables,
    wordsWithFourSyllables,
    wordsWithFiveSyllables,
    phrases: [...sentences],
    syllables: words.flatMap((word, i) => {
      const count = syllablesPerWord[i];
      return Array.from({ length: count }, () => word);
    }),
    hashText: createHash('sha256').update(text, 'utf8').digest('hex'),
    configId: config.id,
  };
}
