import { createHash } from 'crypto';
import type { TextAnalysis } from '../../r-sidecar/r-sidecar.service.js';

import {
  calculateCountWords,
  calculateCountPhrases,
  calculateSyllableComplexity,
  calculateAverageWordLength,
  calculateAverageCharsPerSyllable,
  calculateAverageSyllablesPerWord,
  calculateAveragePhraseLength,
  calculateAverageSyllablesPerPhrase,
  calculateProportionOfLongWords,
} from './basic-metrics.js';
import {
  calculateMultiMemberedGraphemes,
  calculateRareGraphemes,
  calculateConsonantClusters,
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
import { extractHeadingText, filterHeadingSentences } from './heading-extraction.js';

export * from './basic-metrics.js';
export * from './grapheme-analysis.js';
export * from './indices.js';
export * from './linguistic-features.js';
export * from './text-features.js';
export * from './heading-extraction.js';

export interface ConfigWeights {
  readonly parameterLix: { toNumber(): number };
  readonly parameterProportionOfWordsWithComplexSyllables: { toNumber(): number };
  readonly parameterProportionOfWordsWithMultiMemberedGraphemes: { toNumber(): number };
  readonly parameterProportionOfWordsWithRareGraphemes: { toNumber(): number };
  readonly parameterProportionOfWordsWithConsonantClusters: { toNumber(): number };
  readonly id: string;
}

export function computeReadability(text: string, analysis: TextAnalysis, config: ConfigWeights) {
  const { sentences, words, syllablesPerWord, posTags } = analysis;

  const headingText = extractHeadingText(text);
  const { bodySentences } = filterHeadingSentences(sentences, headingText);

  const countWords = calculateCountWords(words);
  const countPhrases = calculateCountPhrases(bodySentences);
  const countMultipleWords = countPhrases;
  const countWordsWithComplexSyllables = calculateSyllableComplexity(words, syllablesPerWord);
  const countWordsWithConsonantClusters = calculateConsonantClusters(words);
  const countWordsWithMultiMemberedGraphemes = calculateMultiMemberedGraphemes(words);
  const countWordsWithRareGraphemes = calculateRareGraphemes(words);
  const abbreviations = calculateAbbreviations(words);
  const numbers = calculateNumbers(words);
  const specialCharacters = calculateSpecialCharacters(text);
  const averageWordLength = calculateAverageWordLength(words);
  const averageCharsPerSyllable = calculateAverageCharsPerSyllable(words, syllablesPerWord);
  const averageSyllablesPerWord = calculateAverageSyllablesPerWord(words, syllablesPerWord);
  const averagePhraseLength = calculateAveragePhraseLength(words, bodySentences);
  const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(
    bodySentences,
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
  const lix = calculateLix(words, bodySentences);
  const gsmog = calculateGsmog(words, bodySentences, syllablesPerWord);
  const fleschKincaid = calculateFleschKincaid(words, bodySentences, syllablesPerWord);
  const wst4 = calculateWstf(words, bodySentences, syllablesPerWord);
  const ttr = calculateTTR(words);
  const proNIndex = calculateProNIndex(posTags);
  const subordinateClauseRatio = calculateSubordinateClauseRatio(posTags, bodySentences);
  const passiveCount = calculatePassiveCount(words, posTags);
  const nominalizationCount = calculateNominalizations(words, posTags);
  const rix = calculateRix(
    words,
    bodySentences,
    passiveCount,
    subordinateClauseRatio,
    nominalizationCount,
  );

  const llix =
    lix * config.parameterLix.toNumber() +
    proportionOfWordsWithComplexSyllables *
      config.parameterProportionOfWordsWithComplexSyllables.toNumber() +
    proportionOfWordsWithMultiMemberedGraphemes *
      config.parameterProportionOfWordsWithMultiMemberedGraphemes.toNumber() +
    proportionOfWordsWithRareGraphemes *
      config.parameterProportionOfWordsWithRareGraphemes.toNumber() +
    proportionOfWordsWithConsonantClusters *
      config.parameterProportionOfWordsWithConsonantClusters.toNumber();

  const totalSyllables = syllablesPerWord.reduce((sum, c) => sum + c, 0);
  const wordsWithOneSyllable = words.filter((_, i) => syllablesPerWord[i] === 1);
  const wordsWithTwoSyllables = words.filter((_, i) => syllablesPerWord[i] === 2);
  const wordsWithThreeSyllables = words.filter((_, i) => syllablesPerWord[i] === 3);
  const wordsWithFourSyllables = words.filter((_, i) => syllablesPerWord[i] === 4);
  const wordsWithFiveSyllables = words.filter((_, i) => syllablesPerWord[i] === 5);

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
    score: llix,
    scoreLevel: 0,
    text,
    words: [...words],
    wordsWithOneSyllable,
    wordsWithTwoSyllables,
    wordsWithThreeSyllables,
    wordsWithFourSyllables,
    wordsWithFiveSyllables,
    phrases: [...bodySentences],
    syllables: words.flatMap((word, i) => {
      const count = syllablesPerWord[i];
      return Array.from({ length: count }, () => word);
    }),
    hashText: createHash('sha256').update(text, 'utf8').digest('hex'),
    configId: config.id,
  };
}
