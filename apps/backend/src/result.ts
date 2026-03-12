import type {Prisma} from '../generated/prisma/client';
import { prisma } from './db';
import {createHash} from 'crypto';
import { analyzeText } from './r-sidecar';

type Config = Prisma.ConfigGetPayload<{}>;

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
    syllablesPerWord: readonly number[]
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
    mehrgliedrige Grapheme (sch, ch, ck, ng, etc.)
 */
export function calculateMultiMemberedGraphemes(words: readonly string[]): number {
    const multiGraphemeRegex = /(sch|ch|ck|ng)/gi;
    let totalCount = 0;
    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;
        const matches = word.match(multiGraphemeRegex);
        if (matches) { totalCount += matches.length; }
    }
    return totalCount;
}

/*
    seltene Grapheme (ä, ö, ü, ß, c, q, x, y)
 */
export function calculateRareGraphemes(words: readonly string[]): number {
    const rareGraphemeRegex = /[äöüÄÖÜßcqxyCQXY]/g;
    let totalCount = 0;
    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;
        const matches = word.match(rareGraphemeRegex);
        if (matches) { totalCount += matches.length; }
    }
    return totalCount;
}

/*
    Konsonantencluster (Str-, Spr-, etc.)
    Note: Following BRELIX/RATTE guidelines
    - /cht/ is NOT a cluster (it's /ch/ digraph + /t/)
    - /nkt/ is NOT a special cluster
    - Focus on word-initial clusters that are phonologically significant
 */
export function calculateConsonantClusters(words: readonly string[]): number {
    const consonantClusterRegex = /\b(str|spr|schr|schw|pfl|phr|thr|kn|gn|qu)/gi;
    let totalCount = 0;
    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;
        const matches = word.match(consonantClusterRegex);
        if (matches) { totalCount += matches.length; }
    }
    return totalCount;
}

/*
    Durchschnittliche Wortlänge
 */
export function calculateAverageWordLength(words: readonly string[]): number {
    if (words.length === 0) return 0;
    let totalLength = 0;
    for (const word of words) { totalLength += word.length; }
    return totalLength / words.length;
}

/*
    ∅Silben/Wort
 */
export function calculateAverageSyllablesPerWord(
    words: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    if (words.length === 0) return 0;
    let total = 0;
    for (const count of syllablesPerWord) { total += count; }
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
    sentences: readonly string[]
): number {
    if (sentences.length === 0) return 0;
    return Math.round(words.length / sentences.length * 100) / 100;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(
    sentences: readonly string[],
    words: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    if (sentences.length === 0) return 0;
    let totalSyllables = 0;
    for (const count of syllablesPerWord) { totalSyllables += count; }
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
        if (word.length >= LONG_WORD_MIN_LENGTH) { longWordCount++; }
    }
    return longWordCount / words.length;
}

/*
    LIX (Läsbarhetsindex) - Readability Index
    Formula: (Words / Sentences) + (Long Words * 100 / Words)
    Long words = words with more than 6 characters
 */
export function calculateLix(
    words: readonly string[],
    sentences: readonly string[]
): number {
    const wordCount = words.length;
    if (wordCount === 0) return 0;
    const sentenceCount = Math.max(1, sentences.length);
    const LONG_WORD_MIN_LENGTH = 6;
    let longWordCount = 0;
    for (const word of words) {
        if (word.length > LONG_WORD_MIN_LENGTH) { longWordCount++; }
    }
    const lix = (wordCount / sentenceCount) + ((longWordCount * 100) / wordCount);
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
    syllablesPerWord: readonly number[]
): number {
    const sentenceCount = sentences.length;
    if (sentenceCount === 0) return 0;
    let wordsWithThreeOrMoreSyllables = 0;
    for (const count of syllablesPerWord) {
        if (count >= 3) { wordsWithThreeOrMoreSyllables++; }
    }
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
    syllablesPerWord: readonly number[]
): number {
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    if (wordCount === 0 || sentenceCount === 0) return 0;
    let totalSyllables = 0;
    for (const count of syllablesPerWord) { totalSyllables += count; }
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
    syllablesPerWord: readonly number[]
): number {
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    if (wordCount === 0 || sentenceCount === 0) return 0;
    let wordsWithThreeOrMoreSyllables = 0;
    for (const count of syllablesPerWord) {
        if (count >= 3) { wordsWithThreeOrMoreSyllables++; }
    }
    const wstf = 0.2656 * (wordCount / sentenceCount) + 0.2744 * (wordsWithThreeOrMoreSyllables / wordCount) * 100 - 1.693;
    return Math.round(wstf * 100) / 100;
}

export async function calculateIndex(text: string, config: Config) {
    const { sentences, words, syllablesPerWord } = await analyzeText(text);

    const countWords = calculateCountWords(words);
    const countPhrases = calculateCountPhrases(sentences);
    const countMultipleWords = countPhrases; // known bug, preserved for schema compat
    const countWordsWithComplexSyllables = calculateSyllableComplexity(words, syllablesPerWord);
    const countWordsWithConsonantClusters = calculateConsonantClusters(words);
    const countWordsWithMultiMemberedGraphemes = calculateMultiMemberedGraphemes(words);
    const countWordsWithRareGraphemes = calculateRareGraphemes(words);
    const averageWordLength = calculateAverageWordLength(words);
    const averageSyllablesPerWord = calculateAverageSyllablesPerWord(words, syllablesPerWord);
    const averagePhraseLength = calculateAveragePhraseLength(words, sentences);
    const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(sentences, words, syllablesPerWord);
    const proportionOfLongWords = calculateProportionOfLongWords(words);
    const proportionOfWordsWithComplexSyllables = countWords > 0 ? countWordsWithComplexSyllables / countWords : 0;
    const proportionOfWordsWithConsonantClusters = countWords > 0 ? countWordsWithConsonantClusters / countWords : 0;
    const proportionOfWordsWithMultiMemberedGraphemes = countWords > 0 ? countWordsWithMultiMemberedGraphemes / countWords : 0;
    const proportionOfWordsWithRareGraphemes = countWords > 0 ? countWordsWithRareGraphemes / countWords : 0;
    const lix = calculateLix(words, sentences);
    const gsmog = calculateGsmog(words, sentences, syllablesPerWord);
    const fleschKincaid = calculateFleschKincaid(words, sentences, syllablesPerWord);
    const wst4 = calculateWstf(words, sentences, syllablesPerWord);

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

    return prisma.result.create({
        data: {
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
            averageSyllablesPerWord,
            averagePhraseLength,
            averageSyllablesPerPhrase,
            proportionOfLongWords,
            proportionOfWordsWithComplexSyllables,
            proportionOfWordsWithConsonantClusters,
            proportionOfWordsWithMultiMemberedGraphemes,
            proportionOfWordsWithRareGraphemes,
            lix,
            ratte: 0,
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
            phrases: [...sentences],
            syllables: syllablePlaceholders,
            hashText: createHash('sha256').update(text, 'utf8').digest('hex'),
            configId: config.id,
        },
        include: {
            config: true
        }
    });
}
