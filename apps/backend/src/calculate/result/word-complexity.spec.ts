import { describe, test, expect } from 'vite-plus/test';
import { computeWordComplexity } from './word-complexity.js';

/** BL-Startgewichte: Drei-/Mehrsilber 50, mehrgliedrige Grapheme 25, seltene 12,5, Cluster 12,5. */
const START_WEIGHTS = {
  complexSyllables: 50,
  multiMemberedGraphemes: 25,
  rareGraphemes: 12.5,
  consonantClusters: 12.5,
};

describe('computeWordComplexity (Zähler → Anteile → WK, acht Komponentenfelder)', () => {
  test('leere Wortliste: WK 0, alle acht Komponenten 0', () => {
    const { wordComplexity, components } = computeWordComplexity([], [], START_WEIGHTS);
    expect(wordComplexity).toBe(0);
    expect(components).toEqual({
      countWordsWithComplexSyllables: 0,
      countWordsWithConsonantClusters: 0,
      countWordsWithMultiMemberedGraphemes: 0,
      countWordsWithRareGraphemes: 0,
      proportionOfWordsWithComplexSyllables: 0,
      proportionOfWordsWithConsonantClusters: 0,
      proportionOfWordsWithMultiMemberedGraphemes: 0,
      proportionOfWordsWithRareGraphemes: 0,
    });
  });

  test('merkmalloses Wort ("Tag"): WK 0, keine Komponente trifft', () => {
    const { wordComplexity, components } = computeWordComplexity(['Tag'], [1], START_WEIGHTS);
    expect(wordComplexity).toBe(0);
    expect(components.countWordsWithComplexSyllables).toBe(0);
    expect(components.countWordsWithMultiMemberedGraphemes).toBe(0);
    expect(components.countWordsWithRareGraphemes).toBe(0);
    expect(components.countWordsWithConsonantClusters).toBe(0);
  });

  test('gewichtet eine einzelne Komponente gemäß Startgewicht (Dreisilber → 50)', () => {
    // "Banane" (3 Silben) trifft nur die Komponente Drei-/Mehrsilber: 1·50 / 100 · 100 = 50.
    const { wordComplexity } = computeWordComplexity(['Banane'], [3], START_WEIGHTS);
    expect(wordComplexity).toBe(50);
  });

  test('normiert auf die Summe der Gewichte (gleichgewichtet → 25)', () => {
    // Nur Drei-/Mehrsilber trifft; bei Gewichten 1/1/1/1 ergibt das 1/4 → 25.
    const equal = {
      complexSyllables: 1,
      multiMemberedGraphemes: 1,
      rareGraphemes: 1,
      consonantClusters: 1,
    };
    const { wordComplexity } = computeWordComplexity(['Banane'], [3], equal);
    expect(wordComplexity).toBe(25);
  });

  test('liefert 0 bei Gesamtgewicht 0 (kein Division-durch-Null)', () => {
    const zeroWeights = {
      complexSyllables: 0,
      multiMemberedGraphemes: 0,
      rareGraphemes: 0,
      consonantClusters: 0,
    };
    const { wordComplexity } = computeWordComplexity(['Banane'], [3], zeroWeights);
    expect(wordComplexity).toBe(0);
  });

  test('seltenes Graphem (ß) wird als Coverage-Anteil ausgewiesen', () => {
    // 'Strauß' enthält 'ß' (seltenes Graphem); 'Tag' nicht → Anteil 1/2.
    const { components } = computeWordComplexity(['Strauß', 'Tag'], [1, 1], START_WEIGHTS);
    expect(components.countWordsWithRareGraphemes).toBe(1);
    expect(components.proportionOfWordsWithRareGraphemes).toBe(0.5);
  });

  test('Anteil ist Zähler / Wortzahl (Coverage in [0,1])', () => {
    const { components } = computeWordComplexity(['Strauß', 'Tag'], [1, 1], START_WEIGHTS);
    for (const [count, proportion] of [
      [components.countWordsWithComplexSyllables, components.proportionOfWordsWithComplexSyllables],
      [
        components.countWordsWithConsonantClusters,
        components.proportionOfWordsWithConsonantClusters,
      ],
      [
        components.countWordsWithMultiMemberedGraphemes,
        components.proportionOfWordsWithMultiMemberedGraphemes,
      ],
      [components.countWordsWithRareGraphemes, components.proportionOfWordsWithRareGraphemes],
    ] as const) {
      expect(count).toBeLessThanOrEqual(2);
      expect(proportion).toBe(count / 2);
      expect(proportion).toBeLessThanOrEqual(1);
    }
  });

  test('WK bleibt im Bereich 0–100', () => {
    // "schickst": mehrgliedrige Grapheme + Cluster + kein Dreisilber → gewichteter Mix.
    const { wordComplexity } = computeWordComplexity(['schickst', 'Tag'], [1, 1], START_WEIGHTS);
    expect(wordComplexity).toBeGreaterThanOrEqual(0);
    expect(wordComplexity).toBeLessThanOrEqual(100);
  });
});
