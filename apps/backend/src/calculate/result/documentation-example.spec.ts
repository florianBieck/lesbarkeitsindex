import { describe, test, expect } from 'vitest';
import { computeReadability, type ConfigWeights } from './index.js';

/**
 * Das Rechenbeispiel der Dokumentationsseite (apps/frontend/src/pages/documentation.vue).
 * Die Seite nennt genau diese Zahlen; ändert sich die Berechnung, muss auch die Seite
 * angepasst werden.
 */
describe('Rechenbeispiel der Dokumentationsseite', () => {
  const config = {
    alpha: 0.3,
    weightComplexSyllables: 50,
    weightMultiMemberedGraphemes: 25,
    weightRareGraphemes: 12.5,
    weightConsonantClusters: 12.5,
  } satisfies ConfigWeights;

  const text = 'Igel sind nachtaktive Tiere. Sie schlafen am Tag.';
  const analysis = {
    sentences: ['Igel sind nachtaktive Tiere.', 'Sie schlafen am Tag.'],
    words: ['Igel', 'sind', 'nachtaktive', 'Tiere', 'Sie', 'schlafen', 'am', 'Tag'],
    syllablesPerWord: [2, 1, 4, 2, 1, 2, 1, 1],
    posTags: ['NN', 'VAFIN', 'ADJA', 'NN', 'PPER', 'VVFIN', 'APPRART', 'NN'],
  };

  const result = computeReadability(text, analysis, config);

  test('LIX = 8 / 2 + 2 · 100 / 8 = 29', () => {
    expect(result.countWords).toBe(8);
    expect(result.countReadingUnits).toBe(2);
    expect(result.lix).toBe(29);
  });

  test('die vier Anteile: 12,5 % / 50 % / 25 % / 12,5 %', () => {
    expect(result.countWordsWithComplexSyllables).toBe(1);
    expect(result.countWordsWithMultiMemberedGraphemes).toBe(4);
    expect(result.countWordsWithRareGraphemes).toBe(2);
    expect(result.countWordsWithConsonantClusters).toBe(1);
  });

  test('WK = 23,44, LÜ-LIX = 36,03, Niveaustufe 2', () => {
    expect(result.wordComplexity).toBe(23.44);
    expect(result.lueLix).toBe(36.03);
    expect(result.level).toBe(2);
  });
});
