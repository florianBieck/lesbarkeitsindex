import { test, expect, describe } from "bun:test";
import {
    calculateCountWords,
    calculateSyllableComplexity,
    calculateMultiMemberedGraphemes,
    calculateRareGraphemes,
    calculateConsonantClusters,
    calculateAverageWordLength,
    calculateAverageSyllablesPerWord,
    calculateCountPhrases,
    calculateAveragePhraseLength,
    calculateAverageSyllablesPerPhrase,
    calculateProportionOfLongWords,
    calculateLix,
    calculateGsmog,
    calculateFleschKincaid,
    calculateWstf,
} from "./result";

const SIMPLE_TEXT = "Der Hund läuft schnell.";
const TWO_SENTENCES = "Die Kinder spielen im Garten. Der Hund schläft unter dem Baum.";
const COMPLEX_TEXT =
    "Die Bundesregierung hat gestern eine weitreichende Entscheidung getroffen. " +
    "Die Umstrukturierung der Bildungslandschaft soll grundlegend verändert werden. " +
    "Wissenschaftliche Untersuchungen bestätigen die Notwendigkeit dieser Maßnahmen.";

describe("calculateCountWords", () => {
    test("counts words in a simple sentence", () => {
        expect(calculateCountWords(SIMPLE_TEXT)).toBe(4);
    });

    test("counts words across multiple sentences", () => {
        expect(calculateCountWords(TWO_SENTENCES)).toBe(11);
    });

    test("returns 0 for empty string", () => {
        expect(calculateCountWords("")).toBe(0);
    });

    test("handles single word", () => {
        expect(calculateCountWords("Hallo")).toBe(1);
    });

    test("strips punctuation from word boundaries", () => {
        expect(calculateCountWords("Hallo, Welt!")).toBe(2);
    });

    test("handles hyphened words as single words", () => {
        expect(calculateCountWords("Schul-Klasse")).toBe(1);
    });

    test("handles slashes as word separators", () => {
        expect(calculateCountWords("und/oder")).toBe(2);
    });
});

describe("calculateCountPhrases", () => {
    test("counts phrases in a single sentence", () => {
        expect(calculateCountPhrases(SIMPLE_TEXT)).toBe(1);
    });

    test("counts phrases in two sentences", () => {
        expect(calculateCountPhrases(TWO_SENTENCES)).toBe(2);
    });

    test("returns 0 for empty string", () => {
        expect(calculateCountPhrases("")).toBe(0);
    });

    test("counts exclamation and question marks as phrase endings", () => {
        expect(calculateCountPhrases("Ist das so? Ja! Nein.")).toBe(3);
    });

    test("handles text without sentence-ending punctuation", () => {
        expect(calculateCountPhrases("Hallo Welt")).toBe(1);
    });
});

describe("calculateSyllableComplexity", () => {
    test("returns 0 for empty string", () => {
        expect(calculateSyllableComplexity("")).toBe(0);
    });

    test("counts words with 3+ syllables", () => {
        // "Bundesregierung" has 5+ syllables, "weitreichende" has 4+, "Entscheidung" has 3
        const result = calculateSyllableComplexity(
            "Die Bundesregierung hat eine weitreichende Entscheidung getroffen."
        );
        expect(result).toBeGreaterThan(0);
    });

    test("returns 0 for simple monosyllabic words", () => {
        expect(calculateSyllableComplexity("Der Hund ist alt.")).toBe(0);
    });
});

describe("calculateMultiMemberedGraphemes", () => {
    test("returns 0 for empty string", () => {
        expect(calculateMultiMemberedGraphemes("")).toBe(0);
    });

    test("counts sch grapheme", () => {
        expect(calculateMultiMemberedGraphemes("Schule")).toBe(1);
    });

    test("counts ch grapheme", () => {
        expect(calculateMultiMemberedGraphemes("Buch")).toBe(1);
    });

    test("counts ck grapheme", () => {
        expect(calculateMultiMemberedGraphemes("Brücke")).toBe(1);
    });

    test("counts ng grapheme", () => {
        expect(calculateMultiMemberedGraphemes("Zeitung")).toBe(1);
    });

    test("counts multiple graphemes in one word", () => {
        // "Entscheidung" contains "sch" and "ng"
        expect(calculateMultiMemberedGraphemes("Entscheidung")).toBe(2);
    });

    test("counts across multiple words", () => {
        expect(calculateMultiMemberedGraphemes("Schule Buch")).toBe(2);
    });
});

describe("calculateRareGraphemes", () => {
    test("returns 0 for empty string", () => {
        expect(calculateRareGraphemes("")).toBe(0);
    });

    test("counts umlauts", () => {
        // "für" has ü (1 rare grapheme)
        expect(calculateRareGraphemes("für")).toBe(1);
    });

    test("counts ß", () => {
        expect(calculateRareGraphemes("Straße")).toBe(1);
    });

    test("counts rare consonants (c, q, x, y)", () => {
        expect(calculateRareGraphemes("Taxi")).toBe(1); // x
    });

    test("counts multiple rare graphemes", () => {
        // "Größe" has ö and ß = 2
        expect(calculateRareGraphemes("Größe")).toBe(2);
    });

    test("counts across multiple words", () => {
        // "über" = ü (1), "Straße" = ß (1)
        expect(calculateRareGraphemes("über Straße")).toBe(2);
    });
});

describe("calculateConsonantClusters", () => {
    test("returns 0 for empty string", () => {
        expect(calculateConsonantClusters("")).toBe(0);
    });

    test("counts str cluster", () => {
        expect(calculateConsonantClusters("Straße")).toBe(1);
    });

    test("counts spr cluster", () => {
        expect(calculateConsonantClusters("Sprache")).toBe(1);
    });

    test("counts schr cluster", () => {
        expect(calculateConsonantClusters("Schrift")).toBe(1);
    });

    test("counts schw cluster", () => {
        expect(calculateConsonantClusters("Schwester")).toBe(1);
    });

    test("counts kn cluster", () => {
        expect(calculateConsonantClusters("Knie")).toBe(1);
    });

    test("returns 0 when no clusters present", () => {
        expect(calculateConsonantClusters("Der Hund")).toBe(0);
    });

    test("counts multiple clusters", () => {
        expect(calculateConsonantClusters("Straße Sprache")).toBe(2);
    });
});

describe("calculateAverageWordLength", () => {
    test("returns 0 for empty string", () => {
        expect(calculateAverageWordLength("")).toBe(0);
    });

    test("computes average for single word", () => {
        expect(calculateAverageWordLength("Hallo")).toBe(5);
    });

    test("computes average across words", () => {
        // "Der" (3) + "Hund" (4) = 7 / 2 = 3.5
        const avg = calculateAverageWordLength("Der Hund");
        expect(avg).toBe(3.5);
    });
});

describe("calculateAverageSyllablesPerWord", () => {
    test("returns 0 for empty string", () => {
        expect(calculateAverageSyllablesPerWord("")).toBe(0);
    });

    test("returns positive value for text", () => {
        const result = calculateAverageSyllablesPerWord(TWO_SENTENCES);
        expect(result).toBeGreaterThan(0);
    });
});

describe("calculateAveragePhraseLength", () => {
    test("returns 0 for empty string", () => {
        expect(calculateAveragePhraseLength("")).toBe(0);
    });

    test("computes average words per sentence", () => {
        // "Die Kinder spielen im Garten." = 5 words
        // "Der Hund schläft unter dem Baum." = 6 words
        // Average = 5.5
        const result = calculateAveragePhraseLength(TWO_SENTENCES);
        expect(result).toBe(5.5);
    });

    test("handles single sentence", () => {
        const result = calculateAveragePhraseLength("Der Hund läuft schnell.");
        expect(result).toBe(4);
    });
});

describe("calculateAverageSyllablesPerPhrase", () => {
    test("returns 0 for empty string", () => {
        expect(calculateAverageSyllablesPerPhrase("")).toBe(0);
    });

    test("returns positive value for text", () => {
        const result = calculateAverageSyllablesPerPhrase(TWO_SENTENCES);
        expect(result).toBeGreaterThan(0);
    });
});

describe("calculateProportionOfLongWords", () => {
    test("returns 0 for empty string", () => {
        expect(calculateProportionOfLongWords("")).toBe(0);
    });

    test("returns 0 when no long words exist", () => {
        expect(calculateProportionOfLongWords("Der Hund ist da.")).toBe(0);
    });

    test("returns 1 when all words are long", () => {
        // "Bundesregierung" (16 chars) and "Entscheidung" (12 chars), both >= 7
        expect(calculateProportionOfLongWords("Bundesregierung Entscheidung")).toBe(1);
    });

    test("returns correct proportion for mixed text", () => {
        // "Der" (3, short) "Bundesregierung" (16, long) = 1/2 = 0.5
        const result = calculateProportionOfLongWords("Der Bundesregierung");
        expect(result).toBe(0.5);
    });
});

describe("calculateLix", () => {
    test("returns 0 for empty string", () => {
        expect(calculateLix("")).toBe(0);
    });

    test("computes LIX for simple text", () => {
        const lix = calculateLix(SIMPLE_TEXT);
        expect(lix).toBeGreaterThan(0);
    });

    test("complex text has higher LIX than simple text", () => {
        const simpleLix = calculateLix(TWO_SENTENCES);
        const complexLix = calculateLix(COMPLEX_TEXT);
        expect(complexLix).toBeGreaterThan(simpleLix);
    });

    test("LIX formula: (words/sentences) + (longWords*100/words)", () => {
        // "Der Hund läuft schnell." => 4 words, 1 sentence
        // Long words (>6 chars): "schnell" (7 chars) = 1
        // LIX = 4/1 + (1*100/4) = 4 + 25 = 29
        const lix = calculateLix(SIMPLE_TEXT);
        expect(lix).toBe(29);
    });
});

describe("calculateGsmog", () => {
    test("returns 0 for empty string", () => {
        expect(calculateGsmog("")).toBe(0);
    });

    test("returns value for text with polysyllabic words", () => {
        const gsmog = calculateGsmog(COMPLEX_TEXT);
        expect(gsmog).toBeGreaterThan(0);
    });

    test("simple text has lower gSmog than complex text", () => {
        const simpleGsmog = calculateGsmog(TWO_SENTENCES);
        const complexGsmog = calculateGsmog(COMPLEX_TEXT);
        expect(complexGsmog).toBeGreaterThan(simpleGsmog);
    });
});

describe("calculateFleschKincaid", () => {
    test("returns 0 for empty string", () => {
        expect(calculateFleschKincaid("")).toBe(0);
    });

    test("returns value for normal text", () => {
        const fk = calculateFleschKincaid(TWO_SENTENCES);
        expect(typeof fk).toBe("number");
        expect(fk).not.toBe(0);
    });

    test("complex text has higher FK than simple text", () => {
        const simpleFk = calculateFleschKincaid(TWO_SENTENCES);
        const complexFk = calculateFleschKincaid(COMPLEX_TEXT);
        expect(complexFk).toBeGreaterThan(simpleFk);
    });
});

describe("calculateWstf", () => {
    test("returns 0 for empty string", () => {
        expect(calculateWstf("")).toBe(0);
    });

    test("returns value for normal text", () => {
        const wstf = calculateWstf(TWO_SENTENCES);
        expect(typeof wstf).toBe("number");
    });

    test("complex text has higher WSTF than simple text", () => {
        const simpleWstf = calculateWstf(TWO_SENTENCES);
        const complexWstf = calculateWstf(COMPLEX_TEXT);
        expect(complexWstf).toBeGreaterThan(simpleWstf);
    });
});

describe("edge cases", () => {
    test("handles text with only whitespace", () => {
        expect(calculateCountWords("   ")).toBe(0);
        expect(calculateCountPhrases("   ")).toBe(0);
        expect(calculateLix("   ")).toBe(0);
    });

    test("handles text with special characters only", () => {
        expect(calculateCountWords("!!! ... ???")).toBe(0);
    });

    test("handles em-dashes and en-dashes", () => {
        const text = "Das Kind – es war müde – schlief ein.";
        const count = calculateCountWords(text);
        expect(count).toBeGreaterThan(0);
    });

    test("handles quoted words (removed by splitIntoWords)", () => {
        const text = "Der sogenannte 'Läsbarhetsindex' wurde erfunden.";
        const count = calculateCountWords(text);
        // 'Läsbarhetsindex' is removed as a quoted word
        expect(count).toBeGreaterThan(0);
    });

    test("handles multiple sentence-ending punctuation", () => {
        // "?!" is one delimiter group, "..." is another → 2 non-empty segments
        expect(calculateCountPhrases("Wirklich?! Ja...")).toBe(2);
    });

    test("all indices handle single-word input", () => {
        const word = "Bundesregierung";
        expect(calculateCountWords(word)).toBe(1);
        expect(calculateCountPhrases(word)).toBe(1);
        expect(calculateLix(word)).toBeGreaterThan(0);
        expect(calculateGsmog(word)).not.toBeNaN();
        expect(calculateFleschKincaid(word)).not.toBeNaN();
        expect(calculateWstf(word)).not.toBeNaN();
    });
});
