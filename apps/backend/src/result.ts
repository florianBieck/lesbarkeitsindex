import {PrismaClient} from '../generated/prisma';
import type { Prisma } from '../generated/prisma';

const prisma = new PrismaClient();
type Config = Prisma.ConfigGetPayload<{}>;

function splitIntoWords (text: string) {
    // Split into “words” by whitespace
    return text
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);
}

/*
    Anzahl Wörter
 */
export function calculateCountWords(text: string) {
    return splitIntoWords(text).length;
}

/*
    Silbenkomplexität (≥3 Vokalgruppen)
 */
export function calculateSyllableComplexity(text: string) {
    // Define German vowels (including umlauts, treat Y/y as vowel here)
    const vowelGroupRegex = /[AEIOUÄÖÜaeiouäöüYy]+/g;

    const words = splitIntoWords(text);
    let countWordsWithAtLeast3VowelGroups = 0;

    for (const rawWord of words) {
        // Strip punctuation and non-letter characters, keep German letters
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(vowelGroupRegex);
        const vowelGroupCount = matches ? matches.length : 0;

        if (vowelGroupCount >= 3) {
            countWordsWithAtLeast3VowelGroups++;
        }
    }

    return countWordsWithAtLeast3VowelGroups;
}

/*
    mehrgliedrige Grapheme (sch, ch, ck, ng, etc.)
 */
export function calculateMultiMemberedGraphemes(text: string) {
    // Define multi-letter graphemes to count.
    // Order matters: longer patterns first to avoid splitting "sch" into "ch".
    const multiGraphemeRegex = /(sch|ch|ck|ng)/gi;

    const words = splitIntoWords(text);
    let totalCount = 0;

    for (const rawWord of words) {
        // Keep only letters relevant for German words
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(multiGraphemeRegex);
        if (matches) {
            totalCount += matches.length;
        }
    }

    return totalCount;
}

/*
    seltene Grapheme (ä, ö, ü, ß, c, q, x, y)
 */
export function calculateRareGraphemes(text: string) {
    // Define the set of “rare” graphemes (case-insensitive)
    const rareGraphemeRegex = /[äöüÄÖÜßcqxyCQXY]/g;

    const words = splitIntoWords(text);
    let totalCount = 0;

    for (const rawWord of words) {
        // Keep only letters (including German umlauts and ß)
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(rareGraphemeRegex);
        if (matches) {
            totalCount += matches.length;
        }
    }

    return totalCount;
}

/*
    Konsonantencluster (Str-, Spr-, -nkt, -cht)
 */
export function calculateConsonantClusters(text: string) {
    // We count occurrences of the consonant clusters:
    // "str", "spr", "nkt", "cht" (case-insensitive) within words.
    const consonantClusterRegex = /(str|spr|nkt|cht)/gi;

    const words = splitIntoWords(text);
    let totalCount = 0;

    for (const rawWord of words) {
        // Keep only letters (including German umlauts and ß)
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(consonantClusterRegex);
        if (matches) {
            console.log(`Word ${word} is ${matches.length}`);
            totalCount += matches.length;
        }
    }

    return totalCount;
}

/*
    Durchschnittliche Wortlänge
 */
export function calculateAverageWordLength(text: string) {
    const words = splitIntoWords(text);

    let totalLength = 0;
    let wordCount = 0;

    for (const rawWord of words) {
        // Keep only letters (including German umlauts and ß)
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        totalLength += word.length;
        wordCount++;
    }

    if (wordCount === 0) {
        return 0;
    }

    return totalLength / wordCount;
}

/*
    ∅Silben/Wort
 */
export function calculateAverageSyllablesPerWord(text: string) {
    const words = splitIntoWords(text);
    if (words.length === 0) {
        return 0;
    }

    // German vowels (incl. umlauts, Y/y as vowel)
    const vowelGroupRegex = /[AEIOUÄÖÜaeiouäöüYy]+/g;

    let totalSyllables = 0;
    let wordCount = 0;

    for (const rawWord of words) {
        // Strip punctuation and non-letter characters, keep German letters
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(vowelGroupRegex);
        const syllableCount = matches ? matches.length : 0;

        totalSyllables += syllableCount;
        wordCount++;
    }

    if (wordCount === 0) {
        return 0;
    }

    return totalSyllables / wordCount;
}

/*
    Anzahl Sätze
 */
export function calculateCountPhrases(text: string) {
    // Split by sentence-ending punctuation: . ! ?
    const rawSentences = text
        .split(/[.!?]+/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    return rawSentences.length;
}

/*
    Durchschnittliche Satzlänge
 */
export function calculateAveragePhraseLength(text: string) {
    // Split into sentences using the same rule as calculateCountPhrases
    const sentences = text
        .split(/[.!?]+/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    if (sentences.length === 0) {
        return 0;
    }

    // Count words in each sentence (reusing the same idea as splitIntoWords)
    let totalWords = 0;

    for (const sentence of sentences) {
        const wordsInSentence = sentence
            .split(/\s+/)
            .map((w) => w.trim())
            .filter((w) => w.length > 0);

        totalWords += wordsInSentence.length;
    }

    // Average sentence length in words
    return totalWords / sentences.length;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(text: string) {
    // Split into sentences (same rule as for phrase counting)
    const sentences = text
        .split(/[.!?]+/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    if (sentences.length === 0) {
        return 0;
    }

    // German vowels (incl. umlauts, Y/y as vowel)
    const vowelGroupRegex = /[AEIOUÄÖÜaeiouäöüYy]+/g;

    let totalSyllables = 0;

    for (const sentence of sentences) {
        // Split sentence into “words” by whitespace
        const words = sentence
            .split(/\s+/)
            .map((w) => w.trim())
            .filter((w) => w.length > 0);

        for (const rawWord of words) {
            // Strip punctuation and non-letter characters, keep German letters
            const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
            if (!word) continue;

            const matches = word.match(vowelGroupRegex);
            const syllableCount = matches ? matches.length : 0;

            totalSyllables += syllableCount;
        }
    }

    // Average number of syllables per sentence
    return totalSyllables / sentences.length;
}

/*
    Anteil an langen Wörtern
 */
export function calculateProportionOfLongWords(text: string) {
    const words = splitIntoWords(text);
    if (words.length === 0) {
        return 0;
    }

    // “Long” word: at least 7 letters (common definition in German readability metrics)
    const LONG_WORD_MIN_LENGTH = 7;

    let longWordCount = 0;

    for (const rawWord of words) {
        // Keep only letters (including German umlauts and ß)
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        if (word.length >= LONG_WORD_MIN_LENGTH) {
            longWordCount++;
        }
    }

    // Proportion in the interval [0, 1]
    return longWordCount / words.length;
}

export async function calculateIndex(text: string, config: Config) {
    const countWords = calculateCountWords(text);
    const syllableComplexity = calculateSyllableComplexity(text);
    const multiMemberedGraphemes = calculateMultiMemberedGraphemes(text);
    const rareGraphemes = calculateRareGraphemes(text);
    const consonantClusters = calculateConsonantClusters(text);
    const averageWordLength = calculateAverageWordLength(text);
    const averageSyllablesPerWord = calculateAverageSyllablesPerWord(text);
    const countPhrases = calculateCountPhrases(text);
    const averagePhraseLength = calculateAveragePhraseLength(text);
    const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(text);
    const proportionOfLongWords = calculateProportionOfLongWords(text);
    const score =
        countWords * config.parameterCountWords.toNumber() +
        syllableComplexity * config.parameterSyllableComplexity.toNumber() +
        multiMemberedGraphemes * config.parameterMultiMemberedGraphemes.toNumber() +
        rareGraphemes * config.parameterRareGraphemes.toNumber() +
        consonantClusters * config.parameterConsonantClusters.toNumber() +
        averageWordLength * config.parameterAverageWordLength.toNumber() +
        averageSyllablesPerWord * config.parameterAverageSyllablesPerPhrase.toNumber() +
        countPhrases * config.parameterCountPhrases.toNumber() +
        averagePhraseLength * config.parameterAveragePhraseLength.toNumber() +
        averageSyllablesPerPhrase * config.parameterAverageSyllablesPerPhrase.toNumber() +
        proportionOfLongWords * config.parameterProportionOfLongWords.toNumber();
    return prisma.result.create({
        data: {
            countWords,
            syllableComplexity,
            multiMemberedGraphemes,
            rareGraphemes,
            consonantClusters,
            averageWordLength,
            averageSyllablesPerWord,
            countPhrases,
            averagePhraseLength,
            averageSyllablesPerPhrase,
            proportionOfLongWords,
            score,
            configId: config.id,
        },
        include: {
            config: true
        }
    });
}