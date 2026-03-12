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

  test("calculateSyllableComplexity counts words with 3+ syllables", () => {
    expect(calculateSyllableComplexity(WORDS, SYLLABLES)).toBe(0);
    expect(calculateSyllableComplexity(["Ananas"], [3])).toBe(1);
  });

  test("calculateMultiMemberedGraphemes counts sch, ch, ck, ng", () => {
    expect(calculateMultiMemberedGraphemes(["Schule", "Dach"])).toBe(2);
  });

  test("calculateRareGraphemes counts ä, ö, ü, ß, c, q, x, y", () => {
    expect(calculateRareGraphemes(["Straße", "über"])).toBe(2);
  });

  test("calculateConsonantClusters counts initial clusters", () => {
    expect(calculateConsonantClusters(["Straße", "Sprache"])).toBe(2);
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
  });
});
