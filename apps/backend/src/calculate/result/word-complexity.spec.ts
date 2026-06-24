import { describe, test, expect } from 'vitest';
import {
  calculateWordComplexity,
  computeWordComplexity,
  type WordComplexityValues,
} from './word-complexity.js';

/** BL-Startgewichte: Drei-/Mehrsilber 50, mehrgliedrige Grapheme 25, seltene 12,5, Cluster 12,5. */
const START_WEIGHTS: WordComplexityValues = {
  complexSyllables: 50,
  multiMemberedGraphemes: 25,
  rareGraphemes: 12.5,
  consonantClusters: 12.5,
};

const ZERO: WordComplexityValues = {
  complexSyllables: 0,
  multiMemberedGraphemes: 0,
  rareGraphemes: 0,
  consonantClusters: 0,
};

describe('calculateWordComplexity (WK 0–100, gewichteter Mittelwert)', () => {
  test('ist 0, wenn keine Komponente vorkommt', () => {
    expect(calculateWordComplexity(ZERO, START_WEIGHTS)).toBe(0);
  });

  test('ist 100, wenn jede Komponente bei 100 % Coverage liegt', () => {
    const all: WordComplexityValues = {
      complexSyllables: 1,
      multiMemberedGraphemes: 1,
      rareGraphemes: 1,
      consonantClusters: 1,
    };
    expect(calculateWordComplexity(all, START_WEIGHTS)).toBe(100);
  });

  test('gewichtet jede Komponente gemäß den Startgewichten', () => {
    expect(calculateWordComplexity({ ...ZERO, complexSyllables: 1 }, START_WEIGHTS)).toBe(50);
    expect(calculateWordComplexity({ ...ZERO, multiMemberedGraphemes: 1 }, START_WEIGHTS)).toBe(25);
    expect(calculateWordComplexity({ ...ZERO, rareGraphemes: 1 }, START_WEIGHTS)).toBe(12.5);
    expect(calculateWordComplexity({ ...ZERO, consonantClusters: 1 }, START_WEIGHTS)).toBe(12.5);
  });

  test('ist der gewichtete Mittelwert gemischter Coverage-Anteile', () => {
    // 0,5·50 + 0,4·25 + 0,2·12,5 + 0,1·12,5 = 25 + 10 + 2,5 + 1,25 = 38,75
    const components: WordComplexityValues = {
      complexSyllables: 0.5,
      multiMemberedGraphemes: 0.4,
      rareGraphemes: 0.2,
      consonantClusters: 0.1,
    };
    expect(calculateWordComplexity(components, START_WEIGHTS)).toBe(38.75);
  });

  test('normiert auf die Summe der Gewichte (beliebige Gewichte)', () => {
    // Gleichgewichtet 1/1/1/1: nur eine Komponente bei 100 % -> 25
    const equal: WordComplexityValues = {
      complexSyllables: 1,
      multiMemberedGraphemes: 1,
      rareGraphemes: 1,
      consonantClusters: 1,
    };
    expect(calculateWordComplexity({ ...ZERO, complexSyllables: 1 }, equal)).toBe(25);
  });

  test('liefert 0 bei Gesamtgewicht 0 (kein Division-durch-Null)', () => {
    const zeroWeights: WordComplexityValues = {
      complexSyllables: 0,
      multiMemberedGraphemes: 0,
      rareGraphemes: 0,
      consonantClusters: 0,
    };
    expect(calculateWordComplexity({ ...ZERO, complexSyllables: 1 }, zeroWeights)).toBe(0);
  });

  test('bleibt im Bereich 0–100 für Coverage-Anteile in [0,1]', () => {
    for (const p of [0, 0.13, 0.5, 0.99, 1]) {
      const wk = calculateWordComplexity(
        {
          complexSyllables: p,
          multiMemberedGraphemes: p,
          rareGraphemes: p,
          consonantClusters: p,
        },
        START_WEIGHTS,
      );
      expect(wk).toBeGreaterThanOrEqual(0);
      expect(wk).toBeLessThanOrEqual(100);
    }
  });
});

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
      [components.countWordsWithConsonantClusters, components.proportionOfWordsWithConsonantClusters],
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
});
