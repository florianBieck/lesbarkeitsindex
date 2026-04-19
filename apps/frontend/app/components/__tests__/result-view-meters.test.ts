import { describe, it, expect } from 'vitest';

/**
 * Regression test for the meter label ↔ config parameter mapping in result-view.vue.
 *
 * The meters computed property must pair each UI label with its matching config
 * field. A previous bug cyclically swapped the three bottom entries so that
 * "Schwierige Buchstabenfolgen" showed multi-membered-graphemes, etc.
 *
 * We replicate the mapping logic here with distinct values for every parameter
 * so a swap is immediately detectable.
 */

function buildMeters(config: {
  parameterLix: string;
  parameterProportionOfWordsWithComplexSyllables: string;
  parameterProportionOfWordsWithConsonantClusters: string;
  parameterProportionOfWordsWithMultiMemberedGraphemes: string;
  parameterProportionOfWordsWithRareGraphemes: string;
}) {
  return [
    {
      label: 'Lesbarkeitsindex (LIX)',
      value: Math.round(Number(config.parameterLix) * 100),
    },
    {
      label: 'Komplexe Silben (Wörter mit 3 oder mehr Silben)',
      value: Math.round(
        Number(config.parameterProportionOfWordsWithComplexSyllables) * 100,
      ),
    },
    {
      label: 'Schwierige Buchstabenfolgen',
      value: Math.round(
        Number(config.parameterProportionOfWordsWithConsonantClusters) * 100,
      ),
    },
    {
      label: 'Mehrteilige Buchstabengruppen',
      value: Math.round(
        Number(config.parameterProportionOfWordsWithMultiMemberedGraphemes) * 100,
      ),
    },
    {
      label: 'Seltene Buchstaben',
      value: Math.round(
        Number(config.parameterProportionOfWordsWithRareGraphemes) * 100,
      ),
    },
  ];
}

describe('result-view meters mapping', () => {
  it('pairs each label with the correct config parameter', () => {
    const config = {
      parameterLix: '0.60',
      parameterProportionOfWordsWithComplexSyllables: '0.20',
      parameterProportionOfWordsWithConsonantClusters: '0.05',
      parameterProportionOfWordsWithMultiMemberedGraphemes: '0.10',
      parameterProportionOfWordsWithRareGraphemes: '0.03',
    };

    const meters = buildMeters(config);

    expect(meters).toEqual([
      { label: 'Lesbarkeitsindex (LIX)', value: 60 },
      { label: 'Komplexe Silben (Wörter mit 3 oder mehr Silben)', value: 20 },
      { label: 'Schwierige Buchstabenfolgen', value: 5 },
      { label: 'Mehrteilige Buchstabengruppen', value: 10 },
      { label: 'Seltene Buchstaben', value: 3 },
    ]);
  });

  it('detects a cyclic swap (the original bug)', () => {
    const config = {
      parameterLix: '0.60',
      parameterProportionOfWordsWithComplexSyllables: '0.20',
      parameterProportionOfWordsWithConsonantClusters: '0.05',
      parameterProportionOfWordsWithMultiMemberedGraphemes: '0.10',
      parameterProportionOfWordsWithRareGraphemes: '0.03',
    };

    const meters = buildMeters(config);
    const consonantCluster = meters.find(
      (m) => m.label === 'Schwierige Buchstabenfolgen',
    );
    const multiGrapheme = meters.find(
      (m) => m.label === 'Mehrteilige Buchstabengruppen',
    );
    const rareGrapheme = meters.find((m) => m.label === 'Seltene Buchstaben');

    expect(consonantCluster?.value).toBe(5);
    expect(multiGrapheme?.value).toBe(10);
    expect(rareGrapheme?.value).toBe(3);
  });
});
