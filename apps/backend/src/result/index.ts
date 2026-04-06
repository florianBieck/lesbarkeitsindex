import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../db';
import { createHash } from 'crypto';
import { analyzeText } from '../r-sidecar';

import { calculateCountWords, calculateCountPhrases, calculateSyllableComplexity, calculateAverageWordLength, calculateAverageCharsPerSyllable, calculateAverageSyllablesPerWord, calculateAveragePhraseLength, calculateAverageSyllablesPerPhrase, calculateProportionOfLongWords } from './basic-metrics';
import { calculateMultiMemberedGraphemes, calculateRareGraphemes, calculateConsonantClusters } from './grapheme-analysis';
import { calculateLix, calculateGsmog, calculateFleschKincaid, calculateWstf, calculateRix } from './indices';
import { calculateProNIndex, calculateSubordinateClauseRatio, calculatePassiveCount, calculateNominalizations } from './linguistic-features';
import { calculateTTR, calculateAbbreviations, calculateNumbers, calculateSpecialCharacters } from './text-features';
import { extractHeadingText, filterHeadingSentences } from './heading-extraction';

export * from './basic-metrics';
export * from './grapheme-analysis';
export * from './indices';
export * from './linguistic-features';
export * from './text-features';
export * from './heading-extraction';

type Config = Prisma.ConfigGetPayload<{}>;

export async function calculateIndex(text: string, config: Config, saveResult: boolean = false) {
    const { sentences, words, syllablesPerWord, posTags } = await analyzeText(text);

    const headingText = extractHeadingText(text);
    const { bodySentences } = filterHeadingSentences(sentences, headingText);

    const countWords = calculateCountWords(words);
    const countPhrases = calculateCountPhrases(bodySentences);
    const countMultipleWords = countPhrases; // known bug, preserved for schema compat
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
    const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(bodySentences, words, syllablesPerWord);
    const proportionOfLongWords = calculateProportionOfLongWords(words);
    const proportionOfWordsWithComplexSyllables = countWords > 0 ? countWordsWithComplexSyllables / countWords : 0;
    const proportionOfWordsWithConsonantClusters = countWords > 0 ? countWordsWithConsonantClusters / countWords : 0;
    const proportionOfWordsWithMultiMemberedGraphemes = countWords > 0 ? countWordsWithMultiMemberedGraphemes / countWords : 0;
    const proportionOfWordsWithRareGraphemes = countWords > 0 ? countWordsWithRareGraphemes / countWords : 0;
    const lix = calculateLix(words, bodySentences);
    const gsmog = calculateGsmog(words, bodySentences, syllablesPerWord);
    const fleschKincaid = calculateFleschKincaid(words, bodySentences, syllablesPerWord);
    const wst4 = calculateWstf(words, bodySentences, syllablesPerWord);
    const ttr = calculateTTR(words);
    const proNIndex = calculateProNIndex(posTags);
    const subordinateClauseRatio = calculateSubordinateClauseRatio(posTags, bodySentences);
    const passiveCount = calculatePassiveCount(words, posTags);
    const nominalizationCount = calculateNominalizations(words, posTags);
    const rix = calculateRix(words, bodySentences, passiveCount, subordinateClauseRatio, nominalizationCount);

    const llix =
        lix * config.parameterLix.toNumber() +
        proportionOfWordsWithComplexSyllables * config.parameterProportionOfWordsWithComplexSyllables.toNumber() +
        proportionOfWordsWithMultiMemberedGraphemes * config.parameterProportionOfWordsWithMultiMemberedGraphemes.toNumber() +
        proportionOfWordsWithRareGraphemes * config.parameterProportionOfWordsWithRareGraphemes.toNumber() +
        proportionOfWordsWithConsonantClusters * config.parameterProportionOfWordsWithConsonantClusters.toNumber();

    const totalSyllables = syllablesPerWord.reduce((sum, c) => sum + c, 0);
    const wordsWithOneSyllable = words.filter((_, i) => syllablesPerWord[i] === 1);
    const wordsWithTwoSyllables = words.filter((_, i) => syllablesPerWord[i] === 2);
    const wordsWithThreeSyllables = words.filter((_, i) => syllablesPerWord[i] === 3);
    const wordsWithFourSyllables = words.filter((_, i) => syllablesPerWord[i] === 4);
    const wordsWithFiveSyllables = words.filter((_, i) => syllablesPerWord[i] === 5);

    const syllablePlaceholders = words.flatMap((word, i) => {
        const count = syllablesPerWord[i];
        return Array.from({ length: count }, () => word);
    });

    const resultData = {
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
        syllables: syllablePlaceholders,
        hashText: createHash('sha256').update(text, 'utf8').digest('hex'),
        configId: config.id,
    };

    if (saveResult) {
        return prisma.result.create({
            data: resultData,
            include: { config: true }
        });
    }

    return {
        ...resultData,
        config,
        id: '',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
