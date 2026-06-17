import { describe, test, expect } from 'vitest';
import {
  calculateWordComplexity,
  calculateLueLix,
  calculateLevel,
  type WordComplexityComponents,
  type WordComplexityWeights,
} from './score-model.js';

/** BL-Startgewichte: Drei-/Mehrsilber 50, mehrgliedrige Grapheme 25, seltene 12,5, Cluster 12,5. */
const START_WEIGHTS: WordComplexityWeights = {
  complexSyllables: 50,
  multiMemberedGraphemes: 25,
  rareGraphemes: 12.5,
  consonantClusters: 12.5,
};

const ZERO: WordComplexityComponents = {
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
    const all: WordComplexityComponents = {
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
    const components: WordComplexityComponents = {
      complexSyllables: 0.5,
      multiMemberedGraphemes: 0.4,
      rareGraphemes: 0.2,
      consonantClusters: 0.1,
    };
    expect(calculateWordComplexity(components, START_WEIGHTS)).toBe(38.75);
  });

  test('normiert auf die Summe der Gewichte (beliebige Gewichte)', () => {
    // Gleichgewichtet 1/1/1/1: nur eine Komponente bei 100 % -> 25
    const equal: WordComplexityWeights = {
      complexSyllables: 1,
      multiMemberedGraphemes: 1,
      rareGraphemes: 1,
      consonantClusters: 1,
    };
    expect(calculateWordComplexity({ ...ZERO, complexSyllables: 1 }, equal)).toBe(25);
  });

  test('liefert 0 bei Gesamtgewicht 0 (kein Division-durch-Null)', () => {
    const zeroWeights: WordComplexityWeights = {
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

describe('calculateLueLix (Aufschlagsmodell: LIX + α·WK)', () => {
  test('ist gleich dem LIX, wenn α = 0 (AC1)', () => {
    expect(calculateLueLix(42.5, 38.75, 0)).toBe(42.5);
    expect(calculateLueLix(20, 100, 0)).toBe(20);
  });

  test('schlägt α·WK auf den LIX auf', () => {
    // 40 + 0,3·50 = 55
    expect(calculateLueLix(40, 50, 0.3)).toBe(55);
  });

  test('ist nie kleiner als der LIX (AC1, beliebige Eingaben)', () => {
    for (const lix of [0, 12.3, 30, 47.8, 70]) {
      for (const wk of [0, 1, 38.75, 100]) {
        for (const alpha of [0, 0.3, 1]) {
          expect(calculateLueLix(lix, wk, alpha)).toBeGreaterThanOrEqual(lix);
        }
      }
    }
  });
});

describe('calculateLevel (Niveaustufe 1–5 aus LÜ-LIX, Bänder 30/40/50/60 — AC3)', () => {
  test('Stufe 1 unter 30', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(29.99)).toBe(1);
  });

  test('Stufe 2 im Band 30–<40', () => {
    expect(calculateLevel(30)).toBe(2);
    expect(calculateLevel(39.99)).toBe(2);
  });

  test('Stufe 3 im Band 40–<50', () => {
    expect(calculateLevel(40)).toBe(3);
    expect(calculateLevel(49.99)).toBe(3);
  });

  test('Stufe 4 im Band 50–<60', () => {
    expect(calculateLevel(50)).toBe(4);
    expect(calculateLevel(59.99)).toBe(4);
  });

  test('Stufe 5 ab 60', () => {
    expect(calculateLevel(60)).toBe(5);
    expect(calculateLevel(120)).toBe(5);
  });
});
