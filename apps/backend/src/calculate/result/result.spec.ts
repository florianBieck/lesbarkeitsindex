import { createHash } from 'crypto';
import { test, expect, describe } from 'vitest';
import {
  computeReadability,
  type ConfigWeights,
  calculateCountWords,
  calculateCountPhrases,
  countWordsWithComplexSyllables,
  countWordsWithMultiMemberedGraphemes,
  countWordsWithRareGraphemes,
  countWordsWithConsonantClusters,
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
} from './index.js';

const WORDS = ['Der', 'Hund', 'läuft', 'über', 'die', 'Straße'];
const SENTENCES = ['Der Hund läuft über die Straße.'];
const SYLLABLES = [1, 1, 1, 2, 1, 2];

describe('metric functions with pre-computed arrays', () => {
  test('calculateCountWords returns word count', () => {
    expect(calculateCountWords(WORDS)).toBe(6);
  });

  test('calculateCountWords returns 0 for empty array', () => {
    expect(calculateCountWords([])).toBe(0);
  });

  test('calculateCountPhrases returns sentence count', () => {
    expect(calculateCountPhrases(SENTENCES)).toBe(1);
  });

  test('calculateCountPhrases returns 1 for single sentence without punctuation', () => {
    expect(calculateCountPhrases(['Hallo Welt'])).toBe(1);
  });

  test('countWordsWithComplexSyllables counts words with 3+ syllables', () => {
    expect(countWordsWithComplexSyllables(WORDS, SYLLABLES)).toBe(0);
    expect(countWordsWithComplexSyllables(['Ananas'], [3])).toBe(1);
  });

  test('countWordsWithComplexSyllables returns 0 for empty arrays', () => {
    expect(countWordsWithComplexSyllables([], [])).toBe(0);
  });

  describe('countWordsWithMultiMemberedGraphemes', () => {
    test('zählt Wörter mit Graphemen (sch, ch, ck, ng) — je Wort einmal', () => {
      expect(countWordsWithMultiMemberedGraphemes(['Schule', 'Dach'])).toBe(2);
      expect(countWordsWithMultiMemberedGraphemes(['Brücke'])).toBe(1);
      // "Zeitung" enthält ei + ng, zählt als ein Wort (Coverage)
      expect(countWordsWithMultiMemberedGraphemes(['Zeitung'])).toBe(1);
    });

    test('counts diphthongs (ie, ei, eu, äu, au)', () => {
      expect(countWordsWithMultiMemberedGraphemes(['Tier'])).toBe(1);
      expect(countWordsWithMultiMemberedGraphemes(['Bein'])).toBe(1);
      expect(countWordsWithMultiMemberedGraphemes(['Freund'])).toBe(1);
      expect(countWordsWithMultiMemberedGraphemes(['Häuser'])).toBe(1);
      expect(countWordsWithMultiMemberedGraphemes(['Baum'])).toBe(1);
    });

    test('zählt sp am Wort-/Silbenanfang — je Wort einmal', () => {
      expect(countWordsWithMultiMemberedGraphemes(['Sport'])).toBe(1);
      // "Spiegel": sp + ie -> ein Wort (Coverage)
      expect(countWordsWithMultiMemberedGraphemes(['Spiegel'])).toBe(1);
    });

    test('zählt st am Wort-/Silbenanfang — je Wort einmal', () => {
      // "Stein": st + ei -> ein Wort (Coverage)
      expect(countWordsWithMultiMemberedGraphemes(['Stein'])).toBe(1);
      expect(countWordsWithMultiMemberedGraphemes(['Stunde'])).toBe(1);
    });

    test('does NOT count sp/st mid-word (not at syllable onset)', () => {
      expect(countWordsWithMultiMemberedGraphemes(['Wespe'])).toBe(0);
      expect(countWordsWithMultiMemberedGraphemes(['Fenster'])).toBe(0);
    });

    test('zählt ein Wort mit mehreren Graphemen nur einmal (Coverage)', () => {
      // "Entscheidung": sch + ei + ng -> ein Wort
      expect(countWordsWithMultiMemberedGraphemes(['Entscheidung'])).toBe(1);
    });

    test('counts across multiple words', () => {
      expect(countWordsWithMultiMemberedGraphemes(['Schule', 'Buch'])).toBe(2);
    });

    test('returns 0 for empty array', () => {
      expect(countWordsWithMultiMemberedGraphemes([])).toBe(0);
    });

    test('returns 0 for words without graphemes', () => {
      expect(countWordsWithMultiMemberedGraphemes(['Hund', 'Katze'])).toBe(0);
    });
  });

  test('countWordsWithComplexSyllables counts complex words in a sentence', () => {
    const words = [
      'Die',
      'Bundesregierung',
      'hat',
      'eine',
      'weitreichende',
      'Entscheidung',
      'getroffen',
    ];
    const syllables = [1, 5, 1, 2, 4, 3, 3];
    const result = countWordsWithComplexSyllables(words, syllables);
    expect(result).toBeGreaterThan(0);
  });

  test('countWordsWithRareGraphemes counts ä, ö, ü, ß, c, q, x, y', () => {
    expect(countWordsWithRareGraphemes(['Straße', 'über'])).toBe(2);
  });

  test('countWordsWithComplexSyllables returns 0 for simple monosyllabic words', () => {
    const words = ['Der', 'Hund', 'ist', 'alt'];
    const syllables = [1, 1, 1, 1];
    expect(countWordsWithComplexSyllables(words, syllables)).toBe(0);
  });

  describe('countWordsWithConsonantClusters', () => {
    test('counts existing onset clusters (str, spr)', () => {
      expect(countWordsWithConsonantClusters(['Straße', 'Sprache'])).toBe(2);
    });

    test('counts 2-letter onset clusters', () => {
      expect(countWordsWithConsonantClusters(['Blume'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Brücke'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Klasse'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Freund'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Glocke'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Traum'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Pflanze'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Platz'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Preis'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Drache'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Grün'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Knie'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Kraft'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Flasche'])).toBe(1);
    });

    test('counts multi-letter onset clusters (schl, schm, schn, schr)', () => {
      expect(countWordsWithConsonantClusters(['Schlange'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Schmerz'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Schnee'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Schrank'])).toBe(1);
    });

    test('counts coda clusters (3+ sounds at word end)', () => {
      expect(countWordsWithConsonantClusters(['Herbst'])).toBe(1);
      expect(countWordsWithConsonantClusters(['nichts'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Markt'])).toBe(1);
      expect(countWordsWithConsonantClusters(['sitzt'])).toBe(1);
      expect(countWordsWithConsonantClusters(['sanft'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Kampf'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Angst'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Punkt'])).toBe(1);
      expect(countWordsWithConsonantClusters(['Kunst'])).toBe(1);
      expect(countWordsWithConsonantClusters(['wirft'])).toBe(1);
    });

    test('zählt ein Wort mit Onset- UND Coda-Cluster nur einmal (Coverage)', () => {
      // "Trumpf": tr (Onset) + mpf (Coda) -> ein Wort
      expect(countWordsWithConsonantClusters(['Trumpf'])).toBe(1);
    });

    test('returns 0 for words without clusters', () => {
      expect(countWordsWithConsonantClusters(['Hund', 'Katze', 'Haus'])).toBe(0);
    });

    test('returns 0 for empty array', () => {
      expect(countWordsWithConsonantClusters([])).toBe(0);
    });

    test('does NOT count st/sp as consonant clusters', () => {
      expect(countWordsWithConsonantClusters(['Stein'])).toBe(0);
      expect(countWordsWithConsonantClusters(['Sport'])).toBe(0);
    });
  });

  test('calculateAverageWordLength computes average char length', () => {
    const avg = calculateAverageWordLength(WORDS);
    const expected = (3 + 4 + 5 + 4 + 3 + 6) / 6;
    expect(avg).toBeCloseTo(expected, 5);
  });

  test('calculateAverageWordLength returns 0 for empty array', () => {
    expect(calculateAverageWordLength([])).toBe(0);
  });

  test('calculateAverageSyllablesPerWord computes average', () => {
    const avg = calculateAverageSyllablesPerWord(WORDS, SYLLABLES);
    const expected = (1 + 1 + 1 + 2 + 1 + 2) / 6;
    expect(avg).toBeCloseTo(expected, 5);
  });

  test('calculateAveragePhraseLength computes words per sentence', () => {
    const avg = calculateAveragePhraseLength(WORDS, SENTENCES);
    expect(avg).toBe(6);
  });

  test('calculateAverageSyllablesPerPhrase computes syllables per sentence', () => {
    const avg = calculateAverageSyllablesPerPhrase(SENTENCES, WORDS, SYLLABLES);
    expect(avg).toBeCloseTo(8 / 1, 5);
  });

  test('calculateProportionOfLongWords counts words with 7+ chars', () => {
    expect(calculateProportionOfLongWords(WORDS)).toBe(0);
    expect(calculateProportionOfLongWords(['Kindergarten', 'und'])).toBe(0.5);
  });

  test('calculateLix computes LIX score', () => {
    const lix = calculateLix(WORDS, SENTENCES);
    expect(lix).toBeCloseTo(6.0, 1);
  });

  test('calculateLix strips hyphens before measuring word length', () => {
    const words = ['ab-cde', 'Der', 'ist'];
    const sentences = ['ab-cde Der ist.'];
    const lix = calculateLix(words, sentences);
    expect(lix).toBe(3);
  });

  test('calculateLix counts hyphenated compound as long when Buchstaben > 6', () => {
    const words = ['Carl-Heinrich', 'von'];
    const sentences = ['Carl-Heinrich von.'];
    const lix = calculateLix(words, sentences);
    expect(lix).toBe(52);
  });

  describe('countWordsWithRareGraphemes', () => {
    test('returns 0 for empty array', () => {
      expect(countWordsWithRareGraphemes([])).toBe(0);
    });

    test('counts umlauts', () => {
      expect(countWordsWithRareGraphemes(['für'])).toBe(1);
    });

    test('counts ß', () => {
      expect(countWordsWithRareGraphemes(['Straße'])).toBe(1);
    });

    test('counts rare consonants (c, q, x, y)', () => {
      expect(countWordsWithRareGraphemes(['Taxi'])).toBe(1);
    });
  });

  test('calculateGsmog computes gSmog score', () => {
    const gsmog = calculateGsmog(WORDS, SENTENCES, SYLLABLES);
    expect(gsmog).toBeCloseTo(-2, 1);
  });

  test('calculateFleschKincaid computes FK score', () => {
    const fk = calculateFleschKincaid(WORDS, SENTENCES, SYLLABLES);
    const expected = 0.39 * 6 + 11.8 * (8 / 6) - 15.59;
    expect(fk).toBeCloseTo(expected, 1);
  });

  test('calculateWstf computes WSTF score', () => {
    const wstf = calculateWstf(WORDS, SENTENCES, SYLLABLES);
    const expected = 0.2656 * 6 + 0.2744 * 0 * 100 - 1.693;
    expect(wstf).toBeCloseTo(expected, 1);
  });

  test('all functions handle empty arrays without crashing', () => {
    expect(calculateCountWords([])).toBe(0);
    expect(calculateCountPhrases([])).toBe(0);
    expect(countWordsWithComplexSyllables([], [])).toBe(0);
    expect(countWordsWithMultiMemberedGraphemes([])).toBe(0);
    expect(countWordsWithRareGraphemes([])).toBe(0);
    expect(countWordsWithConsonantClusters([])).toBe(0);
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
    expect(calculateSpecialCharacters('').count).toBe(0);
  });

  describe('calculateTTR', () => {
    test('returns 100 for all unique words', () => {
      expect(calculateTTR(['Der', 'Hund', 'Katze'])).toBe(100);
    });

    test('computes correct ratio for repeated words', () => {
      expect(calculateTTR(['Der', 'Der', 'Hund', 'Hund'])).toBe(50);
    });

    test('is case-insensitive', () => {
      expect(calculateTTR(['Der', 'der'])).toBe(50);
    });

    test('returns 0 for empty array', () => {
      expect(calculateTTR([])).toBe(0);
    });

    test('handles single word', () => {
      expect(calculateTTR(['Hund'])).toBe(100);
    });
  });

  describe('calculateAverageCharsPerSyllable', () => {
    test('computes chars per syllable', () => {
      expect(calculateAverageCharsPerSyllable(['Hund'], [1])).toBe(4);
    });

    test('averages across multiple words', () => {
      expect(calculateAverageCharsPerSyllable(['Der', 'über'], [1, 2])).toBeCloseTo(7 / 3, 2);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateAverageCharsPerSyllable([], [])).toBe(0);
    });

    test('strips non-letter chars before counting', () => {
      expect(calculateAverageCharsPerSyllable(['Hund.'], [1])).toBe(4);
    });
  });

  describe('calculateAbbreviations', () => {
    test('detects unit abbreviations', () => {
      const result = calculateAbbreviations(['5', 'km', 'und', '3', 'kg']);
      expect(result.count).toBe(2);
    });

    test('detects common abbreviations with dots', () => {
      const result = calculateAbbreviations(['z.B.', 'ist', 'd.h.', 'gut']);
      expect(result.count).toBe(2);
    });

    test('detects acronyms', () => {
      const result = calculateAbbreviations(['Die', 'EU', 'und', 'USA']);
      expect(result.count).toBe(2);
    });

    test('detects mixed abbreviation types', () => {
      const result = calculateAbbreviations(['Die', 'EU', 'hat', 'ca.', '5', 'km']);
      expect(result.count).toBe(3);
    });

    test('returns 0 for text without abbreviations', () => {
      const result = calculateAbbreviations(['Der', 'Hund', 'läuft']);
      expect(result.count).toBe(0);
    });

    test('returns 0 for empty array', () => {
      const result = calculateAbbreviations([]);
      expect(result.count).toBe(0);
    });

    test('returns matched abbreviations list', () => {
      const result = calculateAbbreviations(['Die', 'EU', 'hat', 'ca.', '5', 'km']);
      expect(result.matches).toContain('EU');
      expect(result.matches).toContain('ca.');
      expect(result.matches).toContain('km');
    });
  });

  describe('calculateNumbers', () => {
    test('detects 2-digit numbers', () => {
      const result = calculateNumbers(['Er', 'ist', '72', 'Jahre']);
      expect(result.count).toBe(1);
      expect(result.twoDigit).toBe(1);
    });

    test('detects 3-digit numbers', () => {
      const result = calculateNumbers(['Es', 'sind', '786', 'Meter']);
      expect(result.count).toBe(1);
      expect(result.threeDigit).toBe(1);
    });

    test('detects 4-digit numbers', () => {
      const result = calculateNumbers(['Im', 'Jahr', '2024']);
      expect(result.count).toBe(1);
      expect(result.fourDigit).toBe(1);
    });

    test('detects 5+ digit numbers', () => {
      const result = calculateNumbers(['87945', 'Einwohner']);
      expect(result.count).toBe(1);
      expect(result.fivePlusDigit).toBe(1);
    });

    test('detects numbers with dot separators', () => {
      const result = calculateNumbers(['5.289', 'Menschen']);
      expect(result.count).toBe(1);
      expect(result.fourDigit).toBe(1);
    });

    test('counts multiple numbers of different lengths', () => {
      const result = calculateNumbers(['72', 'und', '786', 'und', '2024']);
      expect(result.count).toBe(3);
      expect(result.twoDigit).toBe(1);
      expect(result.threeDigit).toBe(1);
      expect(result.fourDigit).toBe(1);
    });

    test('ignores single-digit numbers', () => {
      const result = calculateNumbers(['Er', 'hat', '5', 'Äpfel']);
      expect(result.count).toBe(0);
    });

    test('returns 0 for text without numbers', () => {
      const result = calculateNumbers(['Der', 'Hund', 'läuft']);
      expect(result.count).toBe(0);
    });

    test('returns 0 for empty array', () => {
      const result = calculateNumbers([]);
      expect(result.count).toBe(0);
    });
  });

  describe('calculateSpecialCharacters', () => {
    test('counts question and exclamation marks', () => {
      expect(calculateSpecialCharacters('Was ist das? Toll!').count).toBe(2);
    });

    test('counts quotation marks (German style)', () => {
      expect(calculateSpecialCharacters('Er sagte: „Hallo"').count).toBe(2);
    });

    test('counts parentheses', () => {
      expect(calculateSpecialCharacters('Der Hund (groß) läuft').count).toBe(2);
    });

    test('counts special symbols (%, &, §, #, @)', () => {
      expect(calculateSpecialCharacters('50% & §1 #tag @user').count).toBe(5);
    });

    test('counts em-dash and slash', () => {
      expect(calculateSpecialCharacters('gut \u2013 schlecht und/oder').count).toBe(2);
    });

    test('does NOT count period, comma, colon, semicolon', () => {
      expect(calculateSpecialCharacters('Der Hund, die Katze; und: der Vogel.').count).toBe(0);
    });

    test('returns 0 for empty string', () => {
      expect(calculateSpecialCharacters('').count).toBe(0);
    });

    test('returns matched characters', () => {
      const result = calculateSpecialCharacters('50% (gut)');
      expect(result.matches).toContain('%');
      expect(result.matches).toContain('(');
      expect(result.matches).toContain(')');
    });
  });

  describe('calculateProNIndex', () => {
    test('computes pronoun/noun ratio', () => {
      expect(calculateProNIndex(['PPER', 'VVFIN', 'NN'])).toBe(1);
    });

    test('returns 0 when no pronouns', () => {
      expect(calculateProNIndex(['NN', 'VVFIN', 'NN'])).toBe(0);
    });

    test('returns 0 when no nouns', () => {
      expect(calculateProNIndex(['PPER', 'VVFIN', 'ADV'])).toBe(0);
    });

    test('handles multiple pronoun types', () => {
      expect(calculateProNIndex(['PPER', 'NN', 'PRELS', 'VVFIN'])).toBe(2);
    });

    test('returns 0 for empty array', () => {
      expect(calculateProNIndex([])).toBe(0);
    });
  });

  describe('calculateSubordinateClauseRatio', () => {
    test('counts KOUS as subordinate clause', () => {
      expect(
        calculateSubordinateClauseRatio(
          ['ART', 'NN', 'KOUS', 'PPER', 'VVFIN'],
          ['Satz eins.', 'weil er geht.'],
        ),
      ).toBe(0.5);
    });

    test('counts KOUI as subordinate clause', () => {
      expect(calculateSubordinateClauseRatio(['KOUI', 'VVINF'], ['Um zu gehen.'])).toBe(1);
    });

    test('returns 0 when no subordinating conjunctions', () => {
      expect(calculateSubordinateClauseRatio(['ART', 'NN', 'VVFIN'], ['Der Hund läuft.'])).toBe(0);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateSubordinateClauseRatio([], [])).toBe(0);
    });
  });

  describe('calculatePassiveCount', () => {
    test('detects werden + VVPP as passive', () => {
      expect(
        calculatePassiveCount(['Der', 'Hund', 'wird', 'gefüttert'], ['ART', 'NN', 'VAFIN', 'VVPP']),
      ).toBe(1);
    });

    test('does not count haben + VVPP as passive', () => {
      expect(calculatePassiveCount(['Er', 'hat', 'gegessen'], ['PPER', 'VAFIN', 'VVPP'])).toBe(0);
    });

    test('detects wurde (past passive)', () => {
      expect(calculatePassiveCount(['Das', 'wurde', 'gemacht'], ['PDS', 'VAFIN', 'VVPP'])).toBe(1);
    });

    test('returns 0 when no VVPP', () => {
      expect(calculatePassiveCount(['Der', 'Hund', 'läuft'], ['ART', 'NN', 'VVFIN'])).toBe(0);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculatePassiveCount([], [])).toBe(0);
    });
  });

  describe('calculateNominalizations', () => {
    test('detects article + adjective without following noun', () => {
      expect(calculateNominalizations(['das', 'Leichte'], ['ART', 'ADJD'])).toBe(1);
    });

    test('does NOT count article + adjective + noun', () => {
      expect(calculateNominalizations(['das', 'große', 'Haus'], ['ART', 'ADJA', 'NN'])).toBe(0);
    });

    test('detects multiple nominalizations', () => {
      expect(
        calculateNominalizations(
          ['das', 'Gute', 'und', 'das', 'Böse'],
          ['ART', 'ADJD', 'KON', 'ART', 'ADJD'],
        ),
      ).toBe(2);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateNominalizations([], [])).toBe(0);
    });
  });

  describe('calculateRix', () => {
    test('computes RIX with all components', () => {
      const words = ['Der', 'Hund', 'wird', 'gefüttert', 'das', 'Leichtes'];
      const sentences = ['Der Hund wird gefüttert das Leichtes.'];
      const result = calculateRix(words, sentences, 1, 0.5, 1);
      expect(result).toBeGreaterThan(0);
    });

    test('returns simplified value when no passive/subordinate/nominalization', () => {
      const words = ['Der', 'Hund', 'ist', 'alt'];
      const sentences = ['Der Hund ist alt.'];
      expect(calculateRix(words, sentences, 0, 0, 0)).toBe(1.74);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateRix([], [], 0, 0, 0)).toBe(0);
    });
  });
});

describe('Coverage-Semantik (Issue #28 AC2): ein Wort zählt je Komponente höchstens einmal', () => {
  test('mehrgliedrige Grapheme: Wort mit mehreren Vorkommen zählt nur einmal', () => {
    // "Zeitung" enthält ei + ng (zwei Vorkommen) -> ein Wort
    expect(countWordsWithMultiMemberedGraphemes(['Zeitung'])).toBe(1);
    // "Entscheidung": sch + ei + ng (drei Vorkommen) -> ein Wort
    expect(countWordsWithMultiMemberedGraphemes(['Entscheidung'])).toBe(1);
    // "schickst": sch + ck (mehrere Vorkommen) -> ein Wort
    expect(countWordsWithMultiMemberedGraphemes(['schickst'])).toBe(1);
  });

  test('Konsonantenlauthäufung: Wort mit Onset- und Coda-Cluster zählt nur einmal', () => {
    // "Trumpf": tr (Onset) + mpf (Coda) -> ein Wort
    expect(countWordsWithConsonantClusters(['Trumpf'])).toBe(1);
  });

  test('Coverage ist nie größer als die Wortzahl', () => {
    const words = ['Zeitung', 'Entscheidung', 'Trumpf', 'schickst'];
    expect(countWordsWithMultiMemberedGraphemes(words)).toBeLessThanOrEqual(words.length);
    expect(countWordsWithConsonantClusters(words)).toBeLessThanOrEqual(words.length);
    expect(countWordsWithRareGraphemes(words)).toBeLessThanOrEqual(words.length);
    expect(countWordsWithComplexSyllables(words, [2, 3, 1, 1])).toBeLessThanOrEqual(words.length);
  });
});

describe('computeReadability syllable buckets', () => {
  const config = {
    alpha: { toNumber: () => 0.3 },
    weightComplexSyllables: { toNumber: () => 50 },
    weightMultiMemberedGraphemes: { toNumber: () => 25 },
    weightRareGraphemes: { toNumber: () => 12.5 },
    weightConsonantClusters: { toNumber: () => 12.5 },
    id: 'test-config',
  } satisfies ConfigWeights;

  test('counts a 7-syllable word in the 5+ bucket', () => {
    const text = 'Die Radioaktivität sinkt.';
    const analysis = {
      sentences: ['Die Radioaktivität sinkt.'],
      words: ['Die', 'Radioaktivität', 'sinkt'],
      syllablesPerWord: [1, 7, 1],
      posTags: ['ART', 'NN', 'VVFIN'],
    };

    const result = computeReadability(text, analysis, config);

    expect(result.wordsWithFiveSyllables).toContain('Radioaktivität');
    expect(result.countWordsWithFiveSyllable).toBe(1);
  });

  test('assigns every word to exactly one bucket', () => {
    const text = 'Der Esel mag Bananen, Marmelade, Universität und Radioaktivität.';
    const analysis = {
      sentences: ['Der Esel mag Bananen, Marmelade, Universität und Radioaktivität.'],
      words: ['Der', 'Esel', 'Bananen', 'Marmelade', 'Universität', 'Radioaktivität'],
      syllablesPerWord: [1, 2, 3, 4, 5, 7],
      posTags: ['ART', 'NN', 'NN', 'NN', 'NN', 'NN'],
    };

    const result = computeReadability(text, analysis, config);

    const bucketTotal =
      result.countWordsWithOneSyllable +
      result.countWordsWithTwoSyllable +
      result.countWordsWithThreeSyllable +
      result.countWordsWithFourSyllable +
      result.countWordsWithFiveSyllable;
    expect(bucketTotal).toBe(result.countWords);
  });

  test('keeps a word with exactly 5 syllables in the 5+ bucket', () => {
    const text = 'Die Universität öffnet.';
    const analysis = {
      sentences: ['Die Universität öffnet.'],
      words: ['Die', 'Universität', 'öffnet'],
      syllablesPerWord: [1, 5, 2],
      posTags: ['ART', 'NN', 'VVFIN'],
    };

    const result = computeReadability(text, analysis, config);

    expect(result.wordsWithFiveSyllables).toContain('Universität');
    expect(result.countWordsWithFiveSyllable).toBe(1);
  });
});

describe('computeReadability Aufschlagsmodell (Issue #28: WK, LÜ-LIX, Niveaustufe, Coverage)', () => {
  const config = {
    alpha: { toNumber: () => 0.3 },
    weightComplexSyllables: { toNumber: () => 50 },
    weightMultiMemberedGraphemes: { toNumber: () => 25 },
    weightRareGraphemes: { toNumber: () => 12.5 },
    weightConsonantClusters: { toNumber: () => 12.5 },
    id: 'test-config',
  } satisfies ConfigWeights;

  test('AC2: Komponenten-Anteile bleiben ≤ 1, auch bei Mehrfachvorkommen im Wort', () => {
    // "schickst": sch + ck (mehrgliedrige Grapheme) und ckst (Cluster) im selben Wort
    const text = 'schickst Tag.';
    const analysis = {
      sentences: ['schickst Tag.'],
      words: ['schickst', 'Tag'],
      syllablesPerWord: [1, 1],
      posTags: ['VVFIN', 'NN'],
    };

    const result = computeReadability(text, analysis, config);

    expect(result.proportionOfWordsWithMultiMemberedGraphemes).toBeLessThanOrEqual(1);
    expect(result.proportionOfWordsWithConsonantClusters).toBeLessThanOrEqual(1);
    expect(result.proportionOfWordsWithRareGraphemes).toBeLessThanOrEqual(1);
    expect(result.proportionOfWordsWithComplexSyllables).toBeLessThanOrEqual(1);
    // genau ein von zwei Wörtern trägt das Merkmal -> 0,5
    expect(result.proportionOfWordsWithMultiMemberedGraphemes).toBe(0.5);
    expect(result.countWordsWithMultiMemberedGraphemes).toBe(1);
  });

  test('AC3: WK ist der gewichtete Mittelwert der vier Coverage-Komponenten', () => {
    const text = 'schickst Tag.';
    const analysis = {
      sentences: ['schickst Tag.'],
      words: ['schickst', 'Tag'],
      syllablesPerWord: [1, 1],
      posTags: ['VVFIN', 'NN'],
    };

    const result = computeReadability(text, analysis, config);

    // 0·50 + 0,5·25 + 0,5·12,5 + 0,5·12,5 = 25 -> /100 ·100 = 25
    expect(result.wordComplexity).toBe(25);
  });

  test('AC1: LÜ-LIX = LIX + α·WK und ≥ LIX', () => {
    const text = 'schickst Tag.';
    const analysis = {
      sentences: ['schickst Tag.'],
      words: ['schickst', 'Tag'],
      syllablesPerWord: [1, 1],
      posTags: ['VVFIN', 'NN'],
    };

    const result = computeReadability(text, analysis, config);

    // LIX = 2/1 + (1·100)/2 = 52; LÜ-LIX = 52 + 0,3·25 = 59,5
    expect(result.lix).toBe(52);
    expect(result.lueLix).toBe(59.5);
    expect(result.lueLix).toBeGreaterThanOrEqual(result.lix);
  });

  test('Niveaustufe stammt aus dem Backend (Band 50–<60 -> Stufe 4)', () => {
    const text = 'schickst Tag.';
    const analysis = {
      sentences: ['schickst Tag.'],
      words: ['schickst', 'Tag'],
      syllablesPerWord: [1, 1],
      posTags: ['VVFIN', 'NN'],
    };

    const result = computeReadability(text, analysis, config);

    expect(result.level).toBe(4);
  });

  test('AC1: bei α = 0 gilt LÜ-LIX = LIX', () => {
    const zeroAlpha = {
      ...config,
      alpha: { toNumber: () => 0 },
    } satisfies ConfigWeights;
    const text = 'schickst Tag.';
    const analysis = {
      sentences: ['schickst Tag.'],
      words: ['schickst', 'Tag'],
      syllablesPerWord: [1, 1],
      posTags: ['VVFIN', 'NN'],
    };

    const result = computeReadability(text, analysis, zeroAlpha);

    expect(result.lueLix).toBe(result.lix);
  });
});

describe('computeReadability Texttyp & Leseeinheit (Issue #30, ADR 0002)', () => {
  const config = {
    alpha: { toNumber: () => 0.3 },
    weightComplexSyllables: { toNumber: () => 50 },
    weightMultiMemberedGraphemes: { toNumber: () => 25 },
    weightRareGraphemes: { toNumber: () => 12.5 },
    weightConsonantClusters: { toNumber: () => 12.5 },
    id: 'test-config',
  } satisfies ConfigWeights;

  describe('Wörterliste ohne Override (AC1): heuristisch als Liste erkannt, plausibler LIX', () => {
    const text =
      'Hund\nKatze\nVogel\nMaus\nFisch\nBär\nLöwe\nWolf\nTiger\nAdler\n' +
      'Hase\nIgel\nFrosch\nEule\nRabe\nElster\nMeise\nSpatz\nReh\nHirsch';
    // R-Sidecar sieht die ganze Liste als einen Riesensatz, weil keine Punkte vorkommen.
    const analysis = {
      sentences: [
        'Hund Katze Vogel Maus Fisch Bär Löwe Wolf Tiger Adler Hase Igel Frosch Eule Rabe Elster Meise Spatz Reh Hirsch',
      ],
      words: [
        'Hund', 'Katze', 'Vogel', 'Maus', 'Fisch', 'Bär', 'Löwe', 'Wolf', 'Tiger', 'Adler',
        'Hase', 'Igel', 'Frosch', 'Eule', 'Rabe', 'Elster', 'Meise', 'Spatz', 'Reh', 'Hirsch',
      ],
      syllablesPerWord: [1, 2, 2, 1, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2],
      posTags: Array(20).fill('NN'),
    };

    test('Texttyp wird automatisch als Liste erkannt', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.textType).toBe('list');
      expect(result.detectedTextType).toBe('list');
      expect(result.readingUnit).toBe('line');
    });

    test('Nenner satzbezogener Maße ist die Zeilenzahl (20), nicht die Satzzahl (1)', () => {
      const result = computeReadability(text, analysis, config);
      // averagePhraseLength als „durchschnittlich Wörter pro Leseeinheit": 20 / 20 = 1
      expect(result.averagePhraseLength).toBe(1);
      // Als Fließtext wären es 20 / 1 = 20 — der „Riesensatz" — und LIX > 20.
      expect(result.lix).toBeLessThan(20);
    });

    test('countReadingUnits ist die Zeilenzahl', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.countReadingUnits).toBe(20);
    });
  });

  describe('AC2: derselbe Inhalt als Fließtext vs. Liste — sätzbezogene Werte unterscheiden sich', () => {
    // Vier Zeilen, jede ohne Punkt — als Fließtext eine einzige „Satz"-Liste.
    const text = 'Hund Katze\nVogel Maus\nFisch Schaf\nLöwe Bär';
    const analysis = {
      sentences: ['Hund Katze Vogel Maus Fisch Schaf Löwe Bär'],
      words: ['Hund', 'Katze', 'Vogel', 'Maus', 'Fisch', 'Schaf', 'Löwe', 'Bär'],
      syllablesPerWord: [1, 2, 2, 1, 1, 1, 2, 1],
      posTags: ['NN', 'NN', 'NN', 'NN', 'NN', 'NN', 'NN', 'NN'],
    };

    test('Fließtext: averagePhraseLength = Wörter pro Satz (8/1 = 8)', () => {
      const result = computeReadability(text, analysis, config, { textTypeOverride: 'prose' });
      expect(result.textType).toBe('prose');
      expect(result.readingUnit).toBe('sentence');
      expect(result.averagePhraseLength).toBe(8);
      expect(result.countReadingUnits).toBe(1);
    });

    test('Liste: averagePhraseLength = Wörter pro Zeile (8/4 = 2)', () => {
      const result = computeReadability(text, analysis, config, { textTypeOverride: 'list' });
      expect(result.textType).toBe('list');
      expect(result.readingUnit).toBe('line');
      expect(result.averagePhraseLength).toBe(2);
      expect(result.countReadingUnits).toBe(4);
    });

    test('LIX als Fließtext > LIX als Liste (Riesensatz-Effekt entschärft)', () => {
      const prose = computeReadability(text, analysis, config, { textTypeOverride: 'prose' });
      const list = computeReadability(text, analysis, config, { textTypeOverride: 'list' });
      expect(prose.lix).toBeGreaterThan(list.lix);
    });

    test('gSmog, Flesch-Kincaid und WSTF nutzen ebenfalls die Zeile als Nenner', () => {
      const prose = computeReadability(text, analysis, config, { textTypeOverride: 'prose' });
      const list = computeReadability(text, analysis, config, { textTypeOverride: 'list' });
      expect(list.fleschKincaid).not.toBe(prose.fleschKincaid);
      expect(list.wst4).not.toBe(prose.wst4);
    });

    test('RIX nutzt ebenfalls die Zeile als Nenner', () => {
      const prose = computeReadability(text, analysis, config, { textTypeOverride: 'prose' });
      const list = computeReadability(text, analysis, config, { textTypeOverride: 'list' });
      expect(list.ratte).not.toBe(prose.ratte);
    });

    test('averageSyllablesPerPhrase nutzt die Zeile als Nenner', () => {
      const list = computeReadability(text, analysis, config, { textTypeOverride: 'list' });
      // Gesamt-Silben = 1+2+2+1+1+1+2+1 = 11; 11 / 4 Zeilen = 2,75
      expect(list.averageSyllablesPerPhrase).toBeCloseTo(11 / 4, 5);
    });
  });

  describe('Override schlägt die heuristische Erkennung (AC3)', () => {
    // Mehrere Sätze mit Punkten — wird als Fließtext erkannt; Override zwingt Liste.
    const text = 'Der Hund läuft.\nDie Katze schläft.';
    const analysis = {
      sentences: ['Der Hund läuft.', 'Die Katze schläft.'],
      words: ['Der', 'Hund', 'läuft', 'Die', 'Katze', 'schläft'],
      syllablesPerWord: [1, 1, 1, 1, 2, 2],
      posTags: ['ART', 'NN', 'VVFIN', 'ART', 'NN', 'VVFIN'],
    };

    test('ohne Override: heuristisch Fließtext', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.textType).toBe('prose');
      expect(result.detectedTextType).toBe('prose');
    });

    test('Override list: textType ist list, detectedTextType bleibt prose', () => {
      const result = computeReadability(text, analysis, config, { textTypeOverride: 'list' });
      expect(result.textType).toBe('list');
      expect(result.readingUnit).toBe('line');
      expect(result.detectedTextType).toBe('prose');
      expect(result.countReadingUnits).toBe(2);
    });
  });

  describe('Mischform "Sommer" (AC5: Wörter, Formulierungen, Sätze gemischt)', () => {
    const text = 'Sonne\nEis essen\nIm Garten spielen.\nSchwimmen';
    const analysis = {
      sentences: ['Sonne Eis essen Im Garten spielen.', 'Schwimmen'],
      words: ['Sonne', 'Eis', 'essen', 'Im', 'Garten', 'spielen', 'Schwimmen'],
      syllablesPerWord: [2, 1, 2, 1, 2, 2, 2],
      posTags: ['NN', 'NN', 'VVINF', 'APPR', 'NN', 'VVINF', 'VVINF'],
    };

    test('wird als Liste erkannt und über die Zeilenzählung (4) abgebildet', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.textType).toBe('list');
      expect(result.countReadingUnits).toBe(4);
    });
  });
});

describe('computeReadability Titel-Guard', () => {
  const config = {
    alpha: { toNumber: () => 0.3 },
    weightComplexSyllables: { toNumber: () => 50 },
    weightMultiMemberedGraphemes: { toNumber: () => 25 },
    weightRareGraphemes: { toNumber: () => 12.5 },
    weightConsonantClusters: { toNumber: () => 12.5 },
    id: 'test-config',
  } satisfies ConfigWeights;

  describe('Einzeiler: kein Titel, voller Text zählt (AC1)', () => {
    const text = 'Der Hund läuft über die Straße.';
    const analysis = {
      sentences: ['Der Hund läuft über die Straße.'],
      words: WORDS,
      syllablesPerWord: SYLLABLES,
      posTags: ['ART', 'NN', 'VVFIN', 'APPR', 'ART', 'NN'],
    };

    test('erkennt keinen Titel', () => {
      expect(computeReadability(text, analysis, config).title).toBe('');
    });

    test('zählt den einzigen Satz (Satzzahl >= 1)', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.countPhrases).toBe(1);
      expect(result.phrases).toEqual(['Der Hund läuft über die Straße.']);
    });

    test('alle Wörter zählen', () => {
      expect(computeReadability(text, analysis, config).countWords).toBe(6);
    });

    test('satzbasierte Indizes fallen nicht mehr auf 0', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.gsmog).toBeCloseTo(-2, 5);
      expect(result.fleschKincaid).not.toBe(0);
    });
  });

  describe('erste Zeile ist ganzer Satz: kein Titel (AC2)', () => {
    const text = 'Das ist ein Satz.\nWeiter geht es hier.';
    const analysis = {
      sentences: ['Das ist ein Satz.', 'Weiter geht es hier.'],
      words: ['Das', 'ist', 'ein', 'Satz', 'Weiter', 'geht', 'es', 'hier'],
      syllablesPerWord: [1, 1, 1, 1, 2, 1, 1, 1],
      posTags: ['PDS', 'VAFIN', 'ART', 'NN', 'ADV', 'VVFIN', 'PPER', 'ADV'],
    };

    test('erkennt keinen Titel', () => {
      expect(computeReadability(text, analysis, config).title).toBe('');
    });

    test('der erste Satz zählt vollständig', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.countPhrases).toBe(2);
      expect(result.countWords).toBe(8);
      expect(result.phrases).toEqual(['Das ist ein Satz.', 'Weiter geht es hier.']);
    });
  });

  describe('lange erste Zeile (> 50 Zeichen): kein Titel (AC2)', () => {
    const firstLine = 'Dieser allererste Satz ist wirklich außerordentlich lang';
    const text = `${firstLine}\nZweiter Satz.`;
    const analysis = {
      sentences: [firstLine, 'Zweiter Satz.'],
      words: [
        'Dieser',
        'allererste',
        'Satz',
        'ist',
        'wirklich',
        'außerordentlich',
        'lang',
        'Zweiter',
        'Satz',
      ],
      syllablesPerWord: [2, 4, 1, 1, 2, 5, 1, 2, 1],
      posTags: ['PDAT', 'ADJA', 'NN', 'VAFIN', 'ADJD', 'ADJD', 'ADJD', 'ADJA', 'NN'],
    };

    test('die erste Zeile ist länger als 50 Zeichen', () => {
      expect(firstLine.length).toBeGreaterThan(50);
    });

    test('erkennt keinen Titel und zählt beide Sätze', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.title).toBe('');
      expect(result.countPhrases).toBe(2);
      expect(result.countWords).toBe(9);
    });
  });

  describe('echte Überschrift: Titel in keiner Kennzahl (AC3)', () => {
    const fullText = 'Igel & Co\nIgel schlafen am Tag.';
    const bodyOnlyAnalysis = {
      sentences: ['Igel schlafen am Tag.'],
      words: ['Igel', 'schlafen', 'am', 'Tag'],
      syllablesPerWord: [2, 2, 1, 1],
      posTags: ['NN', 'VVFIN', 'APPR', 'NN'],
    };

    test('weist den Titel aus', () => {
      expect(computeReadability(fullText, bodyOnlyAnalysis, config).title).toBe('Igel & Co');
    });

    test('Wort-, Satz- und Silbenzahlen stammen nur aus dem Fließtext', () => {
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.countWords).toBe(4);
      expect(result.countPhrases).toBe(1);
      expect(result.countSyllables).toBe(6);
      expect(result.words).toEqual(['Igel', 'schlafen', 'am', 'Tag']);
      expect(result.phrases).toEqual(['Igel schlafen am Tag.']);
    });

    test('Silben-Buckets decken genau die Fließtext-Wörter ab', () => {
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.countWordsWithOneSyllable).toBe(2);
      expect(result.countWordsWithTwoSyllable).toBe(2);
      const bucketTotal =
        result.countWordsWithOneSyllable +
        result.countWordsWithTwoSyllable +
        result.countWordsWithThreeSyllable +
        result.countWordsWithFourSyllable +
        result.countWordsWithFiveSyllable;
      expect(bucketTotal).toBe(result.countWords);
    });

    test('Sonderzeichen im Titel zählen nicht zum Umfang', () => {
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.countSpecialCharacters).toBe(0);
    });

    test('Sonderzeichen im Fließtext zählen weiterhin', () => {
      const text = 'Der Igel\nIgel & Co schlafen.';
      const analysis = {
        sentences: ['Igel & Co schlafen.'],
        words: ['Igel', 'Co', 'schlafen'],
        syllablesPerWord: [2, 1, 2],
        posTags: ['NN', 'NN', 'VVFIN'],
      };
      const result = computeReadability(text, analysis, config);
      expect(result.title).toBe('Der Igel');
      expect(result.countSpecialCharacters).toBe(1);
    });

    test('text und hashText behalten den vollen Originaltext', () => {
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.text).toBe(fullText);
      expect(result.hashText).toBe(createHash('sha256').update(fullText, 'utf8').digest('hex'));
    });
  });
});
