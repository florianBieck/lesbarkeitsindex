import { describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ResultView from '~/components/result-view.vue';
import type { ResultData } from '~/composables/useApiClient';

// The score chart loads chart.js lazily; happy-dom has no canvas support,
// so the chart modules are replaced with inert stand-ins. `__esModule: true`
// makes Vue's defineAsyncComponent unwrap `.default` from the mocked module.
vi.mock('primevue/chart', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    __esModule: true,
    default: defineComponent({
      name: 'Chart',
      setup: () => () => h('div', { 'data-testid': 'chart-stub' }),
    }),
  };
});

vi.mock('chart.js', () => ({
  Chart: { register: (): void => undefined },
}));

vi.mock('chartjs-plugin-annotation', () => ({
  default: {},
}));

const makeResult = (overrides: Partial<ResultData> = {}): ResultData => ({
  id: 'result-1',
  createdAt: '2026-06-12T08:00:00.000Z',
  countWords: '8',
  countPhrases: '2',
  countSyllables: '13',
  countMultipleWords: '0',
  countWordsWithComplexSyllables: '1',
  countWordsWithConsonantClusters: '1',
  countWordsWithMultiMemberedGraphemes: '2',
  countWordsWithRareGraphemes: '1',
  countWordsWithOneSyllable: '4',
  countWordsWithTwoSyllable: '3',
  countWordsWithThreeSyllable: '0',
  countWordsWithFourSyllable: '1',
  countWordsWithFiveSyllable: '0',
  averageWordLength: '4.6',
  averagePhraseLength: '4',
  averageCharsPerSyllable: '2.8',
  averageSyllablesPerWord: '1.6',
  averageSyllablesPerPhrase: '6.5',
  proportionOfLongWords: '0.25',
  proportionOfWordsWithComplexSyllables: '0.125',
  proportionOfWordsWithConsonantClusters: '0.125',
  proportionOfWordsWithMultiMemberedGraphemes: '0.25',
  proportionOfWordsWithRareGraphemes: '0.125',
  lix: '29.5',
  ratte: '2.4',
  ratteLevel: '1',
  gsmog: '4.2',
  wst4: '3.1',
  fleschKincaid: '68.4',
  ttr: '0.95',
  countAbbreviations: '0',
  countNumbers: '0',
  countNumbersTwoDigit: '0',
  countNumbersThreeDigit: '0',
  countNumbersFourDigit: '0',
  countNumbersFivePlusDigit: '0',
  countSpecialCharacters: '0',
  proNIndex: '0.5',
  subordinateClauseRatio: '0',
  passiveCount: '0',
  nominalizationCount: '0',
  score: '28.5',
  scoreLevel: '2',
  text: 'Igel sind nachtaktive Tiere. Sie schlafen am Tag.',
  title: '',
  words: ['Igel', 'sind', 'nachtaktive', 'Tiere', 'Sie', 'schlafen', 'am', 'Tag'],
  wordsWithOneSyllable: ['sind', 'Sie', 'am', 'Tag'],
  wordsWithTwoSyllables: ['Igel', 'Tiere', 'schlafen'],
  wordsWithThreeSyllables: [],
  wordsWithFourSyllables: ['nachtaktive'],
  wordsWithFiveSyllables: [],
  phrases: ['Igel sind nachtaktive Tiere.', 'Sie schlafen am Tag.'],
  syllables: ['I', 'gel', 'sind', 'nacht', 'ak', 'ti', 've'],
  hashText: 'abc123',
  config: {
    id: 'config-1',
    createdAt: '2026-06-12T08:00:00.000Z',
    parameterLix: '0.6',
    parameterProportionOfWordsWithComplexSyllables: '0.2',
    parameterProportionOfWordsWithConsonantClusters: '0.05',
    parameterProportionOfWordsWithMultiMemberedGraphemes: '0.1',
    parameterProportionOfWordsWithRareGraphemes: '0.05',
  },
  configId: 'config-1',
  ...overrides,
});

describe('result-view', () => {
  it('zeigt den erkannten Titel mit der Beschriftung "Titel" an', async () => {
    const wrapper = await mountSuspended(ResultView, {
      props: { result: makeResult({ title: 'Der Igel' }) },
    });

    expect(wrapper.text()).toContain('Der Igel');
    expect(wrapper.text()).toContain('Titel');
    expect(wrapper.text()).toContain('fließt in keine Kennzahl ein');
  });

  it('rendert nichts Titelbezogenes, wenn kein Titel erkannt wurde', async () => {
    const wrapper = await mountSuspended(ResultView, {
      props: { result: makeResult({ title: '' }) },
    });

    expect(wrapper.html()).not.toContain('Titel');
  });

  it('ordnet in der Gewichtungsanzeige jeder WK-Komponente ihren eigenen Gewichtswert zu', async () => {
    // Bewusst unterschiedliche Gewichte, damit eine vertauschte Label-Wert-
    // Zuordnung auffällt. PrimeVue MeterGroup rendert je Eintrag "<Label> (<%>)".
    const wrapper = await mountSuspended(ResultView, {
      props: {
        result: makeResult({
          config: {
            id: 'config-1',
            createdAt: '2026-06-12T08:00:00.000Z',
            parameterLix: '0.6',
            parameterProportionOfWordsWithComplexSyllables: '0.2',
            parameterProportionOfWordsWithConsonantClusters: '0.05',
            parameterProportionOfWordsWithMultiMemberedGraphemes: '0.1',
            parameterProportionOfWordsWithRareGraphemes: '0.15',
          },
        }),
      },
    });

    const text = wrapper.text();
    expect(text).toContain('Lesbarkeitsindex (LIX) (60%)');
    expect(text).toContain('Drei- und Mehrsilber (20%)');
    expect(text).toContain('Konsonantenlauthäufung (5%)');
    expect(text).toContain('Mehrgliedrige Grapheme (10%)');
    expect(text).toContain('Seltene Grapheme (15%)');
  });

  it('verwendet die verbindlichen Glossar-Begriffe statt der alten Begriffe', async () => {
    const wrapper = await mountSuspended(ResultView, {
      props: { result: makeResult() },
    });

    const text = wrapper.text();
    expect(text).toContain('Drei- und Mehrsilber');
    expect(text).toContain('Konsonantenlauthäufung');
    expect(text).toContain('Mehrgliedrige Grapheme');
    expect(text).toContain('Seltene Grapheme');

    expect(text).not.toContain('Komplexe Silben');
    expect(text).not.toContain('Schwierige Buchstabenfolgen');
    expect(text).not.toContain('Mehrteilige Buchstabengruppen');
    expect(text).not.toContain('Seltene Buchstaben');
  });
});
