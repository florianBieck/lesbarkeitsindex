import { test, expect, describe } from "bun:test";
import {
    calculateCountWords,
    calculateCountPhrases,
    calculateSyllableComplexity,
    calculateMultiMemberedGraphemes,
    calculateRareGraphemes,
    calculateConsonantClusters,
    calculateAverageWordLength,
    calculateAverageSyllablesPerWord,
    calculateAveragePhraseLength,
    calculateAverageSyllablesPerPhrase,
    calculateProportionOfLongWords,
    calculateLix,
    calculateGsmog,
    calculateFleschKincaid,
    calculateWstf,
    calculateTTR,
    calculateAverageCharsPerSyllable,
    calculateAbbreviations,
    calculateNumbers,
    calculateSpecialCharacters,
    calculateProNIndex,
    calculateSubordinateClauseRatio,
    calculatePassiveCount,
    calculateNominalizations,
    calculateRix,
} from "./result";

const WORDS = ["Der", "Hund", "läuft", "über", "die", "Straße"];
const SENTENCES = ["Der Hund läuft über die Straße."];
const SYLLABLES = [1, 1, 1, 2, 1, 2];

describe("metric functions with pre-computed arrays", () => {
  test("calculateCountWords returns word count", () => {
    expect(calculateCountWords(WORDS)).toBe(6);
  });

  test("calculateCountWords returns 0 for empty array", () => {
    expect(calculateCountWords([])).toBe(0);
  });

  test("calculateCountPhrases returns sentence count", () => {
    expect(calculateCountPhrases(SENTENCES)).toBe(1);
  });

  test("calculateCountPhrases returns 1 for single sentence without punctuation", () => {
    expect(calculateCountPhrases(["Hallo Welt"])).toBe(1);
  });

  test("calculateSyllableComplexity counts words with 3+ syllables", () => {
    expect(calculateSyllableComplexity(WORDS, SYLLABLES)).toBe(0);
    expect(calculateSyllableComplexity(["Ananas"], [3])).toBe(1);
  });

  test("calculateSyllableComplexity returns 0 for empty arrays", () => {
    expect(calculateSyllableComplexity([], [])).toBe(0);
  });

describe("calculateMultiMemberedGraphemes", () => {
    test("counts original graphemes (sch, ch, ck, ng)", () => {
        expect(calculateMultiMemberedGraphemes(["Schule", "Dach"])).toBe(2);
        expect(calculateMultiMemberedGraphemes(["Brücke"])).toBe(1);    // ck
        expect(calculateMultiMemberedGraphemes(["Zeitung"])).toBe(2);   // ei + ng
    });

    test("counts diphthongs (ie, ei, eu, äu, au)", () => {
        expect(calculateMultiMemberedGraphemes(["Tier"])).toBe(1);      // ie
        expect(calculateMultiMemberedGraphemes(["Bein"])).toBe(1);      // ei
        expect(calculateMultiMemberedGraphemes(["Freund"])).toBe(1);    // eu
        expect(calculateMultiMemberedGraphemes(["Häuser"])).toBe(1);    // äu
        expect(calculateMultiMemberedGraphemes(["Baum"])).toBe(1);      // au
    });

    test("counts sp at word/syllable beginning", () => {
        expect(calculateMultiMemberedGraphemes(["Sport"])).toBe(1);     // sp
        expect(calculateMultiMemberedGraphemes(["Spiegel"])).toBe(2);   // sp + ie
    });

    test("counts st at word/syllable beginning", () => {
        expect(calculateMultiMemberedGraphemes(["Stein"])).toBe(2);     // st + ei
        expect(calculateMultiMemberedGraphemes(["Stunde"])).toBe(1);    // st
    });

    test("does NOT count sp/st mid-word (not at syllable onset)", () => {
        expect(calculateMultiMemberedGraphemes(["Wespe"])).toBe(0);     // sp not at start
        expect(calculateMultiMemberedGraphemes(["Fenster"])).toBe(0);   // st not at start
    });

    test("counts multiple graphemes in one word", () => {
        expect(calculateMultiMemberedGraphemes(["Entscheidung"])).toBe(3); // sch + ei + ng
    });

    test("counts across multiple words", () => {
        expect(calculateMultiMemberedGraphemes(["Schule", "Buch"])).toBe(2);
    });

    test("returns 0 for empty array", () => {
        expect(calculateMultiMemberedGraphemes([])).toBe(0);
    });

    test("returns 0 for words without graphemes", () => {
        expect(calculateMultiMemberedGraphemes(["Hund", "Katze"])).toBe(0);
    });
});

test("calculateSyllableComplexity counts complex words in a sentence", () => {
    const words = ["Die", "Bundesregierung", "hat", "eine", "weitreichende", "Entscheidung", "getroffen"];
    const syllables = [1, 5, 1, 2, 4, 3, 3];
    const result = calculateSyllableComplexity(words, syllables);
    expect(result).toBeGreaterThan(0);
});

test("calculateRareGraphemes counts ä, ö, ü, ß, c, q, x, y", () => {
    expect(calculateRareGraphemes(["Straße", "über"])).toBe(2);
});

test("calculateSyllableComplexity returns 0 for simple monosyllabic words", () => {
    const words = ["Der", "Hund", "ist", "alt"];
    const syllables = [1, 1, 1, 1];
    expect(calculateSyllableComplexity(words, syllables)).toBe(0);
});

describe("calculateConsonantClusters", () => {
    test("counts existing onset clusters (str, spr)", () => {
        expect(calculateConsonantClusters(["Straße", "Sprache"])).toBe(2);
    });

    test("counts 2-letter onset clusters (bl, br, fl, fr, gl, gr, kl, kn, kr, pf, pl, pr, tr, dr)", () => {
        expect(calculateConsonantClusters(["Blume"])).toBe(1);      // bl
        expect(calculateConsonantClusters(["Brücke"])).toBe(1);     // br
        expect(calculateConsonantClusters(["Klasse"])).toBe(1);     // kl
        expect(calculateConsonantClusters(["Freund"])).toBe(1);     // fr
        expect(calculateConsonantClusters(["Glocke"])).toBe(1);     // gl
        expect(calculateConsonantClusters(["Traum"])).toBe(1);      // tr
        expect(calculateConsonantClusters(["Pflanze"])).toBe(1);    // pf
        expect(calculateConsonantClusters(["Platz"])).toBe(1);      // pl
        expect(calculateConsonantClusters(["Preis"])).toBe(1);      // pr
        expect(calculateConsonantClusters(["Drache"])).toBe(1);     // dr
        expect(calculateConsonantClusters(["Grün"])).toBe(1);       // gr
        expect(calculateConsonantClusters(["Knie"])).toBe(1);       // kn
        expect(calculateConsonantClusters(["Kraft"])).toBe(1);      // kr
        expect(calculateConsonantClusters(["Flasche"])).toBe(1);    // fl
    });

    test("counts multi-letter onset clusters (schl, schm, schn, schr)", () => {
        expect(calculateConsonantClusters(["Schlange"])).toBe(1);   // schl
        expect(calculateConsonantClusters(["Schmerz"])).toBe(1);    // schm
        expect(calculateConsonantClusters(["Schnee"])).toBe(1);     // schn
        expect(calculateConsonantClusters(["Schrank"])).toBe(1);    // schr
    });

    test("counts coda clusters (3+ sounds at word end)", () => {
        expect(calculateConsonantClusters(["Herbst"])).toBe(1);     // rbst
        expect(calculateConsonantClusters(["nichts"])).toBe(1);     // chts
        expect(calculateConsonantClusters(["Markt"])).toBe(1);      // rkt
        expect(calculateConsonantClusters(["sitzt"])).toBe(1);      // tzt
        expect(calculateConsonantClusters(["sanft"])).toBe(1);      // nft
        expect(calculateConsonantClusters(["Kampf"])).toBe(1);      // mpf
        expect(calculateConsonantClusters(["Angst"])).toBe(1);      // ngst
        expect(calculateConsonantClusters(["Punkt"])).toBe(1);      // nkt
        expect(calculateConsonantClusters(["Kunst"])).toBe(1);      // nst
        expect(calculateConsonantClusters(["wirft"])).toBe(1);      // rft
    });

    test("counts both onset AND coda clusters in one word", () => {
        expect(calculateConsonantClusters(["Trumpf"])).toBe(2);     // tr + mpf
    });

    test("returns 0 for words without clusters", () => {
        expect(calculateConsonantClusters(["Hund", "Katze", "Haus"])).toBe(0);
    });

    test("returns 0 for empty array", () => {
        expect(calculateConsonantClusters([])).toBe(0);
    });

    test("does NOT count st/sp as consonant clusters (they are multi-membered graphemes)", () => {
        expect(calculateConsonantClusters(["Stein"])).toBe(0);
        expect(calculateConsonantClusters(["Sport"])).toBe(0);
    });
});

test("calculateAverageWordLength computes average char length", () => {
    const avg = calculateAverageWordLength(WORDS);
    const expected = (3 + 4 + 5 + 4 + 3 + 6) / 6;
    expect(avg).toBeCloseTo(expected, 5);
});

test("calculateAverageWordLength returns 0 for empty array", () => {
    expect(calculateAverageWordLength([])).toBe(0);
});

test("calculateAverageSyllablesPerWord computes average", () => {
    const avg = calculateAverageSyllablesPerWord(WORDS, SYLLABLES);
    const expected = (1 + 1 + 1 + 2 + 1 + 2) / 6;
    expect(avg).toBeCloseTo(expected, 5);
});

test("calculateAveragePhraseLength computes words per sentence", () => {
    const avg = calculateAveragePhraseLength(WORDS, SENTENCES);
    expect(avg).toBe(6);
});

test("calculateAverageSyllablesPerPhrase computes syllables per sentence", () => {
    const avg = calculateAverageSyllablesPerPhrase(SENTENCES, WORDS, SYLLABLES);
    expect(avg).toBeCloseTo(8 / 1, 5);
});

test("calculateProportionOfLongWords counts words with 7+ chars", () => {
    expect(calculateProportionOfLongWords(WORDS)).toBe(0);
    expect(calculateProportionOfLongWords(["Kindergarten", "und"])).toBe(0.5);
});

test("calculateLix computes LIX score", () => {
    const lix = calculateLix(WORDS, SENTENCES);
    expect(lix).toBeCloseTo(6.0, 1);
});

test("calculateLix strips hyphens before measuring word length", () => {
    // "ab-cde" = 6 raw chars, 5 Buchstaben (not long)
    const words = ["ab-cde", "Der", "ist"];
    const sentences = ["ab-cde Der ist."];
    const lix = calculateLix(words, sentences);
    // 3 words, 1 sentence, 0 long words: LIX = 3/1 + 0 = 3.0
    expect(lix).toBe(3);
});

test("calculateLix counts hyphenated compound as long when Buchstaben > 6", () => {
    const words = ["Carl-Heinrich", "von"]; // "CarlHeinrich" = 12 Buchstaben (long)
    const sentences = ["Carl-Heinrich von."];
    const lix = calculateLix(words, sentences);
    // 2 words, 1 sentence, 1 long: LIX = 2/1 + 1*100/2 = 52.0
    expect(lix).toBe(52);
});

describe("calculateRareGraphemes", () => {
    test("returns 0 for empty array", () => {
        expect(calculateRareGraphemes([])).toBe(0);
    });

    test("counts umlauts", () => {
        expect(calculateRareGraphemes(["für"])).toBe(1);
    });

    test("counts ß", () => {
        expect(calculateRareGraphemes(["Straße"])).toBe(1);
    });

    test("counts rare consonants (c, q, x, y)", () => {
        expect(calculateRareGraphemes(["Taxi"])).toBe(1); // x
    });
});

test("calculateGsmog computes gSmog score", () => {
    const gsmog = calculateGsmog(WORDS, SENTENCES, SYLLABLES);
    expect(gsmog).toBeCloseTo(-2, 1);
});

test("calculateFleschKincaid computes FK score", () => {
    const fk = calculateFleschKincaid(WORDS, SENTENCES, SYLLABLES);
    const expected = 0.39 * 6 + 11.8 * (8 / 6) - 15.59;
    expect(fk).toBeCloseTo(expected, 1);
});

test("calculateWstf computes WSTF score", () => {
    const wstf = calculateWstf(WORDS, SENTENCES, SYLLABLES);
    const expected = 0.2656 * 6 + 0.2744 * 0 * 100 - 1.693;
    expect(wstf).toBeCloseTo(expected, 1);
});

test("all functions handle empty arrays without crashing", () => {
    expect(calculateCountWords([])).toBe(0);
    expect(calculateCountPhrases([])).toBe(0);
    expect(calculateSyllableComplexity([], [])).toBe(0);
    expect(calculateMultiMemberedGraphemes([])).toBe(0);
    expect(calculateRareGraphemes([])).toBe(0);
    expect(calculateConsonantClusters([])).toBe(0);
    expect(calculateAverageWordLength([])).toBe(0);
    expect(calculateAverageSyllablesPerWord([], [])).toBe(0);
    expect(calculateAveragePhraseLength([], [])).toBe(0);
    expect(calculateAverageSyllablesPerPhrase([], [], [])).toBe(0);
    expect(calculateProportionOfLongWords([])).toBe(0);
    expect(calculateLix([], [])).toBe(0);
    expect(calculateGsmog([], [], [])).toBe(0);
    expect(calculateFleschKincaid([], [], [])).toBe(0);
    expect(calculateWstf([], [], [])).toBe(0);
    expect(calculateTTR([])).toBe(0);
    expect(calculateAverageCharsPerSyllable([], [])).toBe(0);
    expect(calculateAbbreviations([]).count).toBe(0);
    expect(calculateNumbers([]).count).toBe(0);
    expect(calculateSpecialCharacters("").count).toBe(0);
});

describe("calculateTTR", () => {
    test("returns 100 for all unique words", () => {
        expect(calculateTTR(["Der", "Hund", "Katze"])).toBe(100);
    });

    test("computes correct ratio for repeated words", () => {
        // 2 unique / 4 total = 50%
        expect(calculateTTR(["Der", "Der", "Hund", "Hund"])).toBe(50);
    });

    test("is case-insensitive", () => {
        // "Der" and "der" count as same type
        expect(calculateTTR(["Der", "der"])).toBe(50);
    });

    test("returns 0 for empty array", () => {
        expect(calculateTTR([])).toBe(0);
    });

    test("handles single word", () => {
        expect(calculateTTR(["Hund"])).toBe(100);
    });
});

describe("calculateAverageCharsPerSyllable", () => {
    test("computes chars per syllable", () => {
        // "Hund" = 4 chars, 1 syllable → 4.0
        expect(calculateAverageCharsPerSyllable(["Hund"], [1])).toBe(4);
    });

    test("averages across multiple words", () => {
        // "Der"(3c,1s) + "über"(4c,2s) = 7 chars / 3 syllables = 2.33
        expect(calculateAverageCharsPerSyllable(["Der", "über"], [1, 2])).toBeCloseTo(7 / 3, 2);
    });

    test("returns 0 for empty arrays", () => {
        expect(calculateAverageCharsPerSyllable([], [])).toBe(0);
    });

    test("strips non-letter chars before counting", () => {
        // "Hund." → 4 letter chars, 1 syllable
        expect(calculateAverageCharsPerSyllable(["Hund."], [1])).toBe(4);
    });
});

describe("calculateAbbreviations", () => {
    test("detects unit abbreviations", () => {
        const result = calculateAbbreviations(["5", "km", "und", "3", "kg"]);
        expect(result.count).toBe(2);
    });

    test("detects common abbreviations with dots", () => {
        const result = calculateAbbreviations(["z.B.", "ist", "d.h.", "gut"]);
        expect(result.count).toBe(2);
    });

    test("detects acronyms", () => {
        const result = calculateAbbreviations(["Die", "EU", "und", "USA"]);
        expect(result.count).toBe(2);
    });

    test("detects mixed abbreviation types", () => {
        const result = calculateAbbreviations(["Die", "EU", "hat", "ca.", "5", "km"]);
        expect(result.count).toBe(3); // EU + ca. + km
    });

    test("returns 0 for text without abbreviations", () => {
        const result = calculateAbbreviations(["Der", "Hund", "läuft"]);
        expect(result.count).toBe(0);
    });

    test("returns 0 for empty array", () => {
        const result = calculateAbbreviations([]);
        expect(result.count).toBe(0);
    });

    test("returns matched abbreviations list", () => {
        const result = calculateAbbreviations(["Die", "EU", "hat", "ca.", "5", "km"]);
        expect(result.matches).toContain("EU");
        expect(result.matches).toContain("ca.");
        expect(result.matches).toContain("km");
    });
});

describe("calculateNumbers", () => {
    test("detects 2-digit numbers", () => {
        const result = calculateNumbers(["Er", "ist", "72", "Jahre"]);
        expect(result.count).toBe(1);
        expect(result.twoDigit).toBe(1);
    });

    test("detects 3-digit numbers", () => {
        const result = calculateNumbers(["Es", "sind", "786", "Meter"]);
        expect(result.count).toBe(1);
        expect(result.threeDigit).toBe(1);
    });

    test("detects 4-digit numbers", () => {
        const result = calculateNumbers(["Im", "Jahr", "2024"]);
        expect(result.count).toBe(1);
        expect(result.fourDigit).toBe(1);
    });

    test("detects 5+ digit numbers", () => {
        const result = calculateNumbers(["87945", "Einwohner"]);
        expect(result.count).toBe(1);
        expect(result.fivePlusDigit).toBe(1);
    });

    test("detects numbers with dot separators (e.g. 5.289)", () => {
        const result = calculateNumbers(["5.289", "Menschen"]);
        expect(result.count).toBe(1);
        expect(result.fourDigit).toBe(1);
    });

    test("counts multiple numbers of different lengths", () => {
        const result = calculateNumbers(["72", "und", "786", "und", "2024"]);
        expect(result.count).toBe(3);
        expect(result.twoDigit).toBe(1);
        expect(result.threeDigit).toBe(1);
        expect(result.fourDigit).toBe(1);
    });

    test("ignores single-digit numbers", () => {
        const result = calculateNumbers(["Er", "hat", "5", "Äpfel"]);
        expect(result.count).toBe(0);
    });

    test("returns 0 for text without numbers", () => {
        const result = calculateNumbers(["Der", "Hund", "läuft"]);
        expect(result.count).toBe(0);
    });

    test("returns 0 for empty array", () => {
        const result = calculateNumbers([]);
        expect(result.count).toBe(0);
    });
});

describe("calculateSpecialCharacters", () => {
    test("counts question and exclamation marks", () => {
        expect(calculateSpecialCharacters("Was ist das? Toll!").count).toBe(2);
    });

    test("counts quotation marks (German style)", () => {
        expect(calculateSpecialCharacters('Er sagte: „Hallo"').count).toBe(2); // „ and "
    });

    test("counts parentheses", () => {
        expect(calculateSpecialCharacters("Der Hund (groß) läuft").count).toBe(2);
    });

    test("counts special symbols (%, &, §, #, @)", () => {
        expect(calculateSpecialCharacters("50% & §1 #tag @user").count).toBe(5);
    });

    test("counts em-dash and slash", () => {
        expect(calculateSpecialCharacters("gut – schlecht und/oder").count).toBe(2); // – and /
    });

    test("does NOT count period, comma, colon, semicolon (standard punctuation)", () => {
        expect(calculateSpecialCharacters("Der Hund, die Katze; und: der Vogel.").count).toBe(0);
    });

    test("returns 0 for empty string", () => {
        expect(calculateSpecialCharacters("").count).toBe(0);
    });

    test("returns matched characters", () => {
        const result = calculateSpecialCharacters("50% (gut)");
        expect(result.matches).toContain("%");
        expect(result.matches).toContain("(");
        expect(result.matches).toContain(")");
    });
});

describe("calculateProNIndex", () => {
    test("computes pronoun/noun ratio", () => {
        // 1 pronoun (PPER), 1 noun (NN) → 1.0
        expect(calculateProNIndex(["PPER", "VVFIN", "NN"])).toBe(1);
    });

    test("returns 0 when no pronouns", () => {
        expect(calculateProNIndex(["NN", "VVFIN", "NN"])).toBe(0);
    });

    test("returns 0 when no nouns", () => {
        expect(calculateProNIndex(["PPER", "VVFIN", "ADV"])).toBe(0);
    });

    test("handles multiple pronoun types", () => {
        // 2 pronouns (PPER, PRELS), 1 noun → 2.0
        expect(calculateProNIndex(["PPER", "NN", "PRELS", "VVFIN"])).toBe(2);
    });

    test("returns 0 for empty array", () => {
        expect(calculateProNIndex([])).toBe(0);
    });
});

describe("calculateSubordinateClauseRatio", () => {
    test("counts KOUS as subordinate clause", () => {
        // 1 KOUS in 2 sentences → 0.5
        expect(calculateSubordinateClauseRatio(["ART", "NN", "KOUS", "PPER", "VVFIN"], ["Satz eins.", "weil er geht."])).toBe(0.5);
    });

    test("counts KOUI as subordinate clause", () => {
        expect(calculateSubordinateClauseRatio(["KOUI", "VVINF"], ["Um zu gehen."])).toBe(1);
    });

    test("returns 0 when no subordinating conjunctions", () => {
        expect(calculateSubordinateClauseRatio(["ART", "NN", "VVFIN"], ["Der Hund läuft."])).toBe(0);
    });

    test("returns 0 for empty arrays", () => {
        expect(calculateSubordinateClauseRatio([], [])).toBe(0);
    });
});

describe("calculatePassiveCount", () => {
    test("detects werden + VVPP as passive", () => {
        expect(calculatePassiveCount(
            ["Der", "Hund", "wird", "gefüttert"],
            ["ART", "NN", "VAFIN", "VVPP"]
        )).toBe(1);
    });

    test("does not count haben + VVPP as passive", () => {
        expect(calculatePassiveCount(
            ["Er", "hat", "gegessen"],
            ["PPER", "VAFIN", "VVPP"]
        )).toBe(0);
    });

    test("detects wurde (past passive)", () => {
        expect(calculatePassiveCount(
            ["Das", "wurde", "gemacht"],
            ["PDS", "VAFIN", "VVPP"]
        )).toBe(1);
    });

    test("returns 0 when no VVPP", () => {
        expect(calculatePassiveCount(
            ["Der", "Hund", "läuft"],
            ["ART", "NN", "VVFIN"]
        )).toBe(0);
    });

    test("returns 0 for empty arrays", () => {
        expect(calculatePassiveCount([], [])).toBe(0);
    });
});

describe("calculateNominalizations", () => {
    test("detects article + adjective without following noun", () => {
        // "das Leichte" → ART + ADJD, no NN after
        expect(calculateNominalizations(
            ["das", "Leichte"],
            ["ART", "ADJD"]
        )).toBe(1);
    });

    test("does NOT count article + adjective + noun", () => {
        // "das große Haus" → ART + ADJA + NN → normal adjective use
        expect(calculateNominalizations(
            ["das", "große", "Haus"],
            ["ART", "ADJA", "NN"]
        )).toBe(0);
    });

    test("detects multiple nominalizations", () => {
        expect(calculateNominalizations(
            ["das", "Gute", "und", "das", "Böse"],
            ["ART", "ADJD", "KON", "ART", "ADJD"]
        )).toBe(2);
    });

    test("returns 0 for empty arrays", () => {
        expect(calculateNominalizations([], [])).toBe(0);
    });
});

describe("calculateRix", () => {
    test("computes RIX with all components", () => {
        const words = ["Der", "Hund", "wird", "gefüttert", "das", "Leichtes"];
        const sentences = ["Der Hund wird gefüttert das Leichtes."];
        const result = calculateRix(words, sentences, 1, 0.5, 1);
        expect(result).toBeGreaterThan(0);
    });

    test("returns simplified value when no passive/subordinate/nominalization", () => {
        // 4 words, 1 sentence, 0 long words, no complexity
        // √(4/1 + 0/4) + √(0 + 0 + 0) - 0.26 = √4 + 0 - 0.26 = 2 - 0.26 = 1.74
        const words = ["Der", "Hund", "ist", "alt"];
        const sentences = ["Der Hund ist alt."];
        expect(calculateRix(words, sentences, 0, 0, 0)).toBe(1.74);
    });

    test("returns 0 for empty arrays", () => {
        expect(calculateRix([], [], 0, 0, 0)).toBe(0);
    });
});
});
