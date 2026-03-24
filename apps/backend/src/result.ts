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
    Mehrgliedrige Grapheme — following Brügelmann (Br 10).

    Categories:
    1. Digraphs/trigraphs: sch, ch, ck, ng
    2. Diphthongs: ie, ei, eu, äu, au (au included per BL, contrary to Br who excludes it)
    3. sp/st at word beginning (treated as graphemes per Br 10, not consonant clusters)

    Order matters: longer patterns first to prevent partial matches
    (e.g., "sch" before "ch", "äu" before "au").
 */

// Digraphs/trigraphs + diphthongs — matched anywhere in the word
const graphemeRegex = /(sch|ch|ck|ng|äu|au|eu|ei|ie)/gi;

// sp/st only at word beginning (syllable-onset grapheme per Br 10)
const onsetGraphemeRegex = /\b(sp|st)/gi;

export function calculateMultiMemberedGraphemes(words: readonly string[]): number {
    let totalCount = 0;
    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;
        const graphemeMatches = word.match(graphemeRegex);
        if (graphemeMatches) { totalCount += graphemeMatches.length; }
        const onsetMatches = word.match(onsetGraphemeRegex);
        if (onsetMatches) { totalCount += onsetMatches.length; }
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
    Konsonantencluster — following Brügelmann/BRELIX PDF parameter list.

    Two categories:
    1. Onset clusters (2+ consonant sounds at syllable/word beginning)
       - Excludes st/sp at onset (counted as multi-membered graphemes per Br 10)
    2. Coda clusters (3+ consonant sounds at syllable/word end)
       - Excludes patterns with only 2 sounds (tz, rk, rt, rch) and
         double consonants (only 1 sound)
       - ng counts as 1 sound, so "ngt" = 2 sounds (not a cluster)

    Longer patterns are listed first to prevent partial matches.
 */

// Onset: at word boundary — 2+ consonant sounds at syllable start
const onsetClusterRegex = /\b(schl|schm|schn|schr|str|spr|bl|br|cl|cr|dr|fl|fr|gl|gn|gr|kl|kn|kr|pf|pl|pr|tr)/gi;

// Coda: at word boundary — 3+ consonant sounds at word/syllable end
// Ordered longest-first to avoid partial matches
const codaClusterRegex = /(rchst|mpfst|rbst|chst|chts|rcht|ckst|lfst|rfst|mpft|mpst|ngst|nkst|rnst|rbt|bst|ckt|dst|fst|rft|gst|lfs|mpf|mpt|nft|nkt|nst|nzt|rnt|rkt|rzt|rts|tzt)\b/gi;

export function calculateConsonantClusters(words: readonly string[]): number {
    let totalCount = 0;
    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;
        const onsetMatches = word.match(onsetClusterRegex);
        if (onsetMatches) { totalCount += onsetMatches.length; }
        const codaMatches = word.match(codaClusterRegex);
        if (codaMatches) { totalCount += codaMatches.length; }
    }
    return totalCount;
}

/*
    Durchschnittliche Buchstaben pro Silbe (Br 9)
    Formula: total letter characters / total syllables
 */
export function calculateAverageCharsPerSyllable(
    words: readonly string[],
    syllablesPerWord: readonly number[]
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
    Long words = words with more than 6 Buchstaben.
    Per RATTE documentation: hyphens are removed before measuring word length
    ("Bindestriche werden zuvor entfernt"). Buchstaben includes all alphanumeric
    characters (digits count as Buchstaben, verified against RATTE reference tool).
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
    for (const rawWord of words) {
        // Strip hyphens before measuring Buchstaben length (RATTE convention)
        const buchstaben = rawWord.replace(/-/g, '');
        if (buchstaben.length > LONG_WORD_MIN_LENGTH) { longWordCount++; }
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

/*
    Type-Token-Relation (TTR)
    Formula: (Types / Tokens) * 100
    Types = unique words (case-insensitive), Tokens = total word count.
    Measures vocabulary diversity — higher TTR means more varied vocabulary.
 */
export function calculateTTR(words: readonly string[]): number {
    if (words.length === 0) return 0;
    const types = new Set(words.map(w => w.toLowerCase()));
    return Math.round((types.size / words.length) * 10000) / 100;
}

/*
    Abkürzungen erkennen — three categories per PDF parameter list:
    1. Unit abbreviations (km, kg, cm, etc.)
    2. Common abbreviations with dots (z.B., d.h., etc.)
    3. Acronyms (EU, USA, ADAC, etc.)
 */

const UNIT_ABBREVIATIONS = new Set([
    'km', 'm', 'cm', 'mm', 'g', 'kg', 'l', 'ml',
    'h', 'min', 'sec', 's',
    '€', 'km/h',
]);

const DOTTED_ABBREVIATIONS = new Set([
    'z.b.', 'd.h.', 'u.a.', 'bzw.', 'etc.', 'usw.', 'ca.', 'evtl.',
    'nr.', 'str.', 'i.d.r.', 'v.a.', 'dr.', 'prof.', 'mind.', 'max.',
    'std.', 'min.', 'sek.', 'ct.', 'tsd.', 'mio.', 'mrd.',
    'm²', 'km²', '°c',
]);

const ACRONYMS = new Set([
    'UNO', 'UNICEF', 'UNESCO', 'EU', 'USA', 'ADAC', 'NASA',
    'DRK', 'DB', 'IC', 'ICE', 'WWF', 'ARD', 'ZDF', 'TV',
    'EM', 'WM', 'FIFA', 'DFB', 'LKW', 'PKW',
    'G7', 'G20', 'OECD', 'GPS', 'AI', 'KI',
    'NABU', 'BUND',
]);

export function calculateAbbreviations(words: readonly string[]): { count: number; matches: string[] } {
    if (words.length === 0) return { count: 0, matches: [] };
    const matches: string[] = [];
    for (const word of words) {
        const lower = word.toLowerCase().replace(/[,;:!?]$/, '');
        if (UNIT_ABBREVIATIONS.has(lower)) {
            matches.push(word);
        } else if (DOTTED_ABBREVIATIONS.has(lower)) {
            matches.push(word);
        } else if (ACRONYMS.has(word.replace(/[,;:!?]$/, ''))) {
            matches.push(word);
        }
    }
    return { count: matches.length, matches };
}

/*
    Zahlen erkennen — categorized by digit count per PDF:
    - 2-digit: difficult for beginning readers
    - 3-digit: somewhat difficult
    - 4-digit: more difficult
    - 5+ digit: very difficult
    Numbers with dot separators (e.g. 5.289) are treated as one number,
    digits only counted (dots stripped).
    Single-digit numbers are ignored (not difficult).
 */
/*
    Sonderzeichen erkennen — per PDF (section b, Zeichen):
    ?, !, quotation marks (various styles), parentheses,
    %, &, §, #, @, em-dash (–), slash (/)
    Excludes standard punctuation (. , : ;) which is expected in text.
    Operates on raw text since tokenization strips many of these.
 */
const SPECIAL_CHAR_REGEX = /[?!""„"»«'‚'()%&§#@–—\/]/g;

export function calculateSpecialCharacters(text: string): { count: number; matches: string[] } {
    if (!text) return { count: 0, matches: [] };
    const found = text.match(SPECIAL_CHAR_REGEX);
    if (!found) return { count: 0, matches: [] };
    return { count: found.length, matches: found };
}

type NumberResult = {
    count: number;
    twoDigit: number;
    threeDigit: number;
    fourDigit: number;
    fivePlusDigit: number;
};

export function calculateNumbers(words: readonly string[]): NumberResult {
    const result: NumberResult = { count: 0, twoDigit: 0, threeDigit: 0, fourDigit: 0, fivePlusDigit: 0 };
    if (words.length === 0) return result;
    for (const word of words) {
        // Match tokens that are purely numeric (with optional dot separators)
        const cleaned = word.replace(/[,;:!?]$/, '');
        if (!/^\d[\d.]*\d$|^\d{2,}$/.test(cleaned)) continue;
        const digitsOnly = cleaned.replace(/\./g, '');
        if (!/^\d+$/.test(digitsOnly)) continue;
        const len = digitsOnly.length;
        if (len < 2) continue;
        result.count++;
        if (len === 2) result.twoDigit++;
        else if (len === 3) result.threeDigit++;
        else if (len === 4) result.fourDigit++;
        else result.fivePlusDigit++;
    }
    return result;
}

/*
    Pronominalisierungsindex (ProNIndex) — R 5
    Formula: Number of pronouns / Number of nouns
    Uses STTS tagset from OpenNLP German POS tagger.
 */
const PRONOUN_TAGS = /^(PPER|PPOSAT|PPOSS|PRELS|PRELAT|PRF|PDS|PDAT|PIS|PIAT|PWS|PWAT|PWAV)$/;
const NOUN_TAGS = /^(NN|NE)$/;

export function calculateProNIndex(posTags: readonly string[]): number {
    if (posTags.length === 0) return 0;
    let pronouns = 0;
    let nouns = 0;
    for (const tag of posTags) {
        if (PRONOUN_TAGS.test(tag)) pronouns++;
        if (NOUN_TAGS.test(tag)) nouns++;
    }
    if (nouns === 0) return 0;
    return Math.round((pronouns / nouns) * 100) / 100;
}

/*
    Anteil Nebensätze — R 5
    Counts subordinating conjunctions (KOUS, KOUI) as proxy for subordinate clauses.
    Returns ratio of subordinate clauses per sentence.
 */
export function calculateSubordinateClauseRatio(
    posTags: readonly string[],
    sentences: readonly string[]
): number {
    if (sentences.length === 0) return 0;
    let subordinateClauses = 0;
    for (const tag of posTags) {
        if (tag === "KOUS" || tag === "KOUI") subordinateClauses++;
    }
    return Math.round((subordinateClauses / sentences.length) * 100) / 100;
}

/*
    Passivkonstruktionen — R (RATTE)
    German passive: conjugated form of "werden" + past participle (VVPP).
    Looks back up to 10 tokens from each VVPP for a "werden" form.
 */
const WERDEN_FORMS = new Set([
    "wird", "werde", "werden", "werdet", "wirst",
    "wurde", "wurden", "wurdest", "wurdet",
    "würde", "würden", "würdest", "würdet",
]);

export function calculatePassiveCount(
    words: readonly string[],
    posTags: readonly string[]
): number {
    let passiveCount = 0;
    for (let i = 0; i < posTags.length; i++) {
        if (posTags[i] === "VVPP") {
            for (let j = Math.max(0, i - 10); j < i; j++) {
                if (WERDEN_FORMS.has(words[j].toLowerCase())) {
                    passiveCount++;
                    break;
                }
            }
        }
    }
    return passiveCount;
}

/*
    Substantivierungen — R (RATTE)
    Detects nominalized adjectives: article + adjective with no following noun.
    E.g., "das Leichte", "der Alte", "die Kranken".
 */
export function calculateNominalizations(
    words: readonly string[],
    posTags: readonly string[]
): number {
    let count = 0;
    for (let i = 0; i < posTags.length - 1; i++) {
        if (posTags[i] === "ART") {
            if (posTags[i + 1] === "ADJA" || posTags[i + 1] === "ADJD") {
                const hasNounAfter =
                    (i + 2 < posTags.length && posTags[i + 2] === "NN") ||
                    (i + 3 < posTags.length && posTags[i + 3] === "NN");
                if (!hasNounAfter) count++;
            }
        }
    }
    return count;
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
    nominalizationCount: number
): number {
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    if (wordCount === 0 || sentenceCount === 0) return 0;

    let longWordCount = 0;
    for (const rawWord of words) {
        const buchstaben = rawWord.replace(/-/g, '');
        if (buchstaben.length > 6) longWordCount++;
    }

    const avgSentenceLength = wordCount / sentenceCount;
    const longWordProportion = longWordCount / wordCount;
    const passiveRatio = passiveCount / sentenceCount;
    const nominalizationRatio = nominalizationCount / sentenceCount;

    const rix = Math.sqrt(avgSentenceLength + longWordProportion)
              + Math.sqrt(passiveRatio + subordinateClauseRatio + nominalizationRatio)
              - 0.26;

    return Math.round(rix * 100) / 100;
}

export async function calculateIndex(text: string, config: Config, saveResult: boolean = false) {
    const { sentences, words, syllablesPerWord, posTags } = await analyzeText(text);

    const countWords = calculateCountWords(words);
    const countPhrases = calculateCountPhrases(sentences);
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
    const ttr = calculateTTR(words);
    const proNIndex = calculateProNIndex(posTags);
    const subordinateClauseRatio = calculateSubordinateClauseRatio(posTags, sentences);
    const passiveCount = calculatePassiveCount(words, posTags);
    const nominalizationCount = calculateNominalizations(words, posTags);
    const rix = calculateRix(words, sentences, passiveCount, subordinateClauseRatio, nominalizationCount);

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
        phrases: [...sentences],
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
