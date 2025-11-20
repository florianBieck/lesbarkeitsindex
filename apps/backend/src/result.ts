import type {Prisma} from '../generated/prisma';
import {PrismaClient} from '../generated/prisma';
import {createHash} from 'crypto';
import {hyphenateSync as hyphenate} from 'hyphen/de';

const prisma = new PrismaClient();
type Config = Prisma.ConfigGetPayload<{}>;

/*
    Helper function to split text into words
 */
function splitIntoWords(text: string) {
    return text
        // Normalize various dash types to regular hyphen
        .replace(/[–—]/g, '-')
        // Remove quoted words (words surrounded by single quotes like 'Läsbarhetsindex')
        .replace(/'[^']+'/g, ' ')
        // Remove punctuation EXCEPT hyphens within words
        // This removes periods, commas, quotes, etc. but keeps hyphens
        .replace(/([.,;:!?()\"»«""''])/g, ' ')
        // Split on whitespace and slashes
        .split(/[\s/]+/)
        .map((w) => w.trim())
        // Filter out empty strings, standalone hyphens, and pure numbers
        .filter((w) => {
            if (w.length === 0 || w === '-') return false;
            // Exclude pure numeric tokens (e.g., "1968", "2023")
            if (/^\d+$/.test(w)) return false;
            return true;
        });
}

/*
    Helper function to split text into phrases
 */
function splitIntoPhrases(text: string) {
    return text
        .split(/[.!?]+/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/*
    Helper function to split sentence into words
 */
function splitSentenceIntoWords(sentence: string) {
    return sentence
        // Normalize various dash types to regular hyphen
        .replace(/[–—]/g, '-')
        // Split on whitespace and slashes
        .split(/[\s/]+/)
        .map((w) => w.trim()).filter((w) => {
            if (w.length === 0 || w === '-') return false;
            return true;
        })
}

/*
    Helper function to count syllables in German text
    Uses the hyphen library with German patterns for accurate syllable counting
 */
function countSyllables(word: string): number {
    if (!word) return 0;
    if (word.length === 0) return 0;

    try {
        // Hyphenate the word using German patterns
        // The hyphen function uses soft hyphens (\u00AD) by default
        const hyphenated = hyphenate(word);

        // Count syllables by splitting on soft hyphens
        const syllables = hyphenated.split('\u00AD');

        // Debug first few words
        if (Math.random() < 0.05) { // Log ~5% of words
            // console.log(`Word: "${word}" -> Hyphenated: "${hyphenated}" -> Syllables: ${syllables.length}`);
        }

        return syllables.length;
    } catch (error) {
        console.log(`Hyphenation failed for "${word}":`, error);
        return 1;
    }
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

        const syllableCount = countSyllables(word);

        if (syllableCount >= 3) {
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

    for (const word of words) {
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

    let totalSyllables = 0;
    let wordCount = 0;

    for (const word of words) {
        const syllableCount = countSyllables(word);
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
    return splitIntoPhrases(text).length;
}

/*
    Durchschnittliche Satzlänge
 */
export function calculateAveragePhraseLength(text: string) {
    // Split into sentences using the same rule as calculateCountPhrases
    const sentences = splitIntoPhrases(text);

    if (sentences.length === 0) {
        return 0;
    }

    // Count words in each sentence (reusing the same idea as splitIntoWords)
    let totalWords = 0;

    for (const sentence of sentences) {
        const wordsInSentence = splitSentenceIntoWords(sentence);

        totalWords += wordsInSentence.length;
    }

    // Average sentence length in words
    return Math.round(totalWords / sentences.length * 100) / 100;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(text: string) {
    // Split into sentences (same rule as for phrase counting)
    const sentences = splitIntoPhrases(text);

    if (sentences.length === 0) {
        return 0;
    }

    let totalSyllables = 0;

    for (const sentence of sentences) {
        // Split sentence into “words” by whitespace
        const words = splitSentenceIntoWords(sentence);

        for (const word of words) {
            const syllableCount = countSyllables(word);
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

/*
    LIX (Läsbarhetsindex) - Readability Index
    Formula: (Words / Sentences) + (Long Words * 100 / Words)
    Long words = words with more than 6 characters
 */
export function calculateLix(text: string) {
    const words = splitIntoWords(text);
    const wordCount = words.length;

    if (wordCount === 0) {
        return 0;
    }

    // Count sentences (occurrences of . ! ?)
    const sentenceCount = Math.max(1, calculateCountPhrases(text));

    // Count long words (length > 6)
    const LONG_WORD_MIN_LENGTH = 6;
    let longWordCount = 0;

    for (const word of words) {
        if (word.length > LONG_WORD_MIN_LENGTH) {
            longWordCount++;
        }
    }

    // LIX formula: (Words / Sentences) + (Long Words * 100 / Words)
    const lix = (wordCount / sentenceCount) + ((longWordCount * 100) / wordCount);

    // Round to 2 decimal places
    return Math.round(lix * 100) / 100;
}

/*
    gSmog (German Simple Measure of Gobbledygook)
    Bamberger's adaptation of McLaughlin's SMOG formula for German texts.
    Formula: √((Count of words with 3+ syllables × 30) / Number of sentences) - 2
    Result approximates the reading age (in school grades) for which the text is suitable.
 */
export function calculateGsmog(text: string) {
    const sentenceCount = calculateCountPhrases(text);

    if (sentenceCount === 0) {
        return 0;
    }

    const words = splitIntoWords(text);
    let wordsWithThreeOrMoreSyllables = 0;

    for (const word of words) {
        const syllableCount = countSyllables(word);

        if (syllableCount >= 3) {
            wordsWithThreeOrMoreSyllables++;
        }
    }

    // gSmog formula: √((polysyllabic words × 30) / sentences) - 2
    const gsmog = Math.sqrt((wordsWithThreeOrMoreSyllables * 30) / sentenceCount) - 2;

    // Round to 2 decimal places
    return Math.round(gsmog * 100) / 100;
}

/*
    Flesch-Kincaid Index
    Formula: 0.39 * (Words / Sentences) + 11.8 * (Syllables / Words) - 15.59
    Longer sentences require holding more information in memory,
    same applies for decoding long words.
 */
export function calculateFleschKincaid(text: string) {
    const wordCount = calculateCountWords(text);
    const sentenceCount = calculateCountPhrases(text);

    if (wordCount === 0 || sentenceCount === 0) {
        return 0;
    }

    const words = splitIntoWords(text);
    let totalSyllables = 0;

    for (const word of words) {
        const syllableCount = countSyllables(word);
        totalSyllables += syllableCount;
    }

    // Flesch-Kincaid formula: 0.39 * (Words / Sentences) + 11.8 * (Syllables / Words) - 15.59
    const averageWordsPerSentence = wordCount / sentenceCount;
    const averageSyllablesPerWord = totalSyllables / wordCount;
    const fleschKincaid = 0.39 * averageWordsPerSentence + 11.8 * averageSyllablesPerWord - 15.59;

    // Round to 2 decimal places
    return Math.round(fleschKincaid * 100) / 100;
}

/*
    WSTF (Wiener Sachtextformel - 4th Vienna Formula)
    Formula: 0.2656 * (Words / Sentences) + 0.2744 * (Words with 3+ syllables / Words) * 100 - 1.693
    Result indicates reading difficulty level.
*/
export function calculateWstf(text: string) {
    const wordCount = calculateCountWords(text);
    const sentenceCount = calculateCountPhrases(text);

    if (wordCount === 0 || sentenceCount === 0) {
        return 0;
    }

    const words = splitIntoWords(text);
    let wordsWithThreeOrMoreSyllables = 0;

    for (const word of words) {
        const syllableCount = countSyllables(word);

        if (syllableCount >= 3) {
            wordsWithThreeOrMoreSyllables++;
        }
    }

    // WSTF formula: 0.2656 * (Words / Sentences) + 0.2744 * (Words with 3+ syllables / Words) * 100 - 1.693
    const averageWordsPerSentence = wordCount / sentenceCount;
    const proportionPolysyllabic = wordsWithThreeOrMoreSyllables / wordCount;
    const wstf = 0.2656 * averageWordsPerSentence + 0.2744 * proportionPolysyllabic * 100 - 1.693;

    // Round to 2 decimal places
    return Math.round(wstf * 100) / 100;
}

export async function calculateIndex(text: string, config: Config) {
    const countWords = calculateCountWords(text);
    const countPhrases = calculateCountPhrases(text);
    const countMultipleWords = calculateCountPhrases(text);
    const countWordsWithComplexSyllables = calculateSyllableComplexity(text);
    const countWordsWithConsonantClusters = calculateConsonantClusters(text);
    const countWordsWithMultiMemberedGraphemes = calculateMultiMemberedGraphemes(text);
    const countWordsWithRareGraphemes = calculateRareGraphemes(text);
    const averageWordLength = calculateAverageWordLength(text);
    const averageSyllablesPerWord = calculateAverageSyllablesPerWord(text);
    const averagePhraseLength = calculateAveragePhraseLength(text);
    const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(text);
    const proportionOfLongWords = calculateProportionOfLongWords(text);
    const proportionOfWordsWithComplexSyllables = countWordsWithComplexSyllables / countWords;
    const proportionOfWordsWithConsonantClusters = countWordsWithConsonantClusters / countWords;
    const proportionOfWordsWithMultiMemberedGraphemes = countWordsWithMultiMemberedGraphemes / countWords;
    const proportionOfWordsWithRareGraphemes = countWordsWithRareGraphemes / countWords;
    const lix = calculateLix(text);
    const gsmog = calculateGsmog(text);
    const fleschKincaid = calculateFleschKincaid(text);
    const wst4 = calculateWstf(text);

    const llix =
        lix * config.parameterLix.toNumber() +
        proportionOfWordsWithComplexSyllables * config.parameterProportionOfWordsWithComplexSyllables.toNumber() +
        proportionOfWordsWithMultiMemberedGraphemes * config.parameterProportionOfWordsWithMultiMemberedGraphemes.toNumber() +
        proportionOfWordsWithRareGraphemes * config.parameterProportionOfWordsWithRareGraphemes.toNumber() +
        proportionOfWordsWithConsonantClusters * config.parameterProportionOfWordsWithConsonantClusters.toNumber();

    return prisma.result.create({
        data: {
            countWords,
            countPhrases,
            countMultipleWords,
            countWordsWithComplexSyllables,
            countWordsWithConsonantClusters,
            countWordsWithMultiMemberedGraphemes,
            countWordsWithRareGraphemes,
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
            words: splitIntoWords(text),
            phrases: splitIntoPhrases(text),
            hashText: createHash('sha256').update(text, 'utf8').digest('hex'),
            configId: config.id,
        },
        include: {
            config: true
        }
    });
}

// Add this temporarily at the end of the file for debugging
export function debugText(text: string) {
    console.log('=== DEBUG CALCULATIONS ===');

    const words = splitIntoWords(text);
    console.log('Total words:', words.length, '(expected: 112)');

    const sentences = calculateCountPhrases(text);
    console.log('Total sentences:', sentences, '(expected: 7)');

    // LIX calculation with > 6 chars
    let longWords6 = 0;
    let longWords7 = 0;
    words.forEach(w => {
        const clean = w.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (clean.length > 6) longWords6++;
        if (clean.length >= 7) longWords7++;
    });

    console.log('Words with >6 chars:', longWords6);
    console.log('Words with >=7 chars:', longWords7);

    const lix1 = (words.length / sentences) + ((longWords6 * 100) / words.length);
    const lix2 = (words.length / sentences) + ((longWords7 * 100) / words.length);

    console.log('LIX (>6):', Math.round(lix1 * 100) / 100);
    console.log('LIX (>=7):', Math.round(lix2 * 100) / 100);
    console.log('Expected LIX: 44.57');

    // Syllable counts
    let totalSyllables = 0;
    let words3plus = 0;

    words.forEach(w => {
        const clean = w.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!clean) return;
        const syls = countSyllables(clean);
        totalSyllables += syls;
        if (syls >= 3) words3plus++;
    });

    console.log('Total syllables:', totalSyllables);
    console.log('Words with 3+ syllables:', words3plus);
    console.log('Avg syllables per word:', (totalSyllables / words.length).toFixed(2));

    const gsmog = Math.sqrt((words3plus * 30) / sentences) - 2;
    console.log('gSmog:', Math.round(gsmog * 100) / 100, '(expected: 8.14)');

    const wstf = 0.2656 * (words.length / sentences) + 0.2744 * (words3plus / words.length) * 100 - 1.693;
    console.log('WSTF:', Math.round(wstf * 100) / 100, '(expected: 8.41)');

    const fk = 0.39 * (words.length / sentences) + 11.8 * (totalSyllables / words.length) - 15.59;
    console.log('Flesch-Kincaid:', Math.round(fk * 100) / 100, '(expected: 12.19)');
}