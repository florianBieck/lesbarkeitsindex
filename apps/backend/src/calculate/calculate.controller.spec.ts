import { describe, test, expect } from 'vitest';
import { buildConfigData, toInMemoryConfig } from './calculate.controller.js';

describe('buildConfigData', () => {
  test('sets all non-weight fields to 0', () => {
    const data = buildConfigData({ parameterLix: 0.6 });
    expect(data.parameterCountWords).toBe(0);
    expect(data.parameterCountPhrases).toBe(0);
    expect(data.parameterAverageWordLength).toBe(0);
    expect(data.parameterProportionOfLongWords).toBe(0);
  });

  test('applies provided weight overrides', () => {
    const data = buildConfigData({
      parameterLix: 0.5,
      parameterProportionOfWordsWithComplexSyllables: 0.2,
      parameterProportionOfWordsWithConsonantClusters: 0.1,
      parameterProportionOfWordsWithMultiMemberedGraphemes: 0.15,
      parameterProportionOfWordsWithRareGraphemes: 0.05,
    });
    expect(data.parameterLix).toBe(0.5);
    expect(data.parameterProportionOfWordsWithComplexSyllables).toBe(0.2);
    expect(data.parameterProportionOfWordsWithConsonantClusters).toBe(0.1);
    expect(data.parameterProportionOfWordsWithMultiMemberedGraphemes).toBe(0.15);
    expect(data.parameterProportionOfWordsWithRareGraphemes).toBe(0.05);
  });

  test('defaults omitted weights to 0', () => {
    const data = buildConfigData({ parameterLix: 0.6 });
    expect(data.parameterProportionOfWordsWithComplexSyllables).toBe(0);
    expect(data.parameterProportionOfWordsWithConsonantClusters).toBe(0);
    expect(data.parameterProportionOfWordsWithMultiMemberedGraphemes).toBe(0);
    expect(data.parameterProportionOfWordsWithRareGraphemes).toBe(0);
  });
});

describe('toInMemoryConfig', () => {
  test('returns a Config-shaped object with Decimal values', () => {
    const data = buildConfigData({
      parameterLix: 0.6,
      parameterProportionOfWordsWithComplexSyllables: 0.2,
    });
    const config = toInMemoryConfig(data);

    expect(config.id).toBe('');
    expect(config.parameterLix.toNumber()).toBe(0.6);
    expect(config.parameterProportionOfWordsWithComplexSyllables.toNumber()).toBe(0.2);
    expect(config.parameterProportionOfWordsWithConsonantClusters.toNumber()).toBe(0);
    expect(config.parameterCountWords.toNumber()).toBe(0);
  });

  test('does not have a database-generated id', () => {
    const data = buildConfigData({ parameterLix: 1 });
    const config = toInMemoryConfig(data);
    expect(config.id).toBe('');
  });
});
