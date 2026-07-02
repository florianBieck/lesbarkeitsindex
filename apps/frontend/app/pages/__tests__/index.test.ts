import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import IndexPage from '~/pages/index.vue';

/**
 * Frontend-Unit-Test für die Texttyp-/Listen-Erkennung der Startseite
 * (Issue #30, ADR 0002 — AC3).
 *
 * Prüft, dass der Schalter automatisch den heuristischen Texttyp anzeigt und
 * ihn beim Absenden als Override an die API weitergibt.
 */

const calculateMock = vi.fn();
const getConfigMock = vi.fn();

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    updateConfig: vi.fn(),
    calculate: calculateMock,
    getResults: vi.fn(),
  }),
}));

const DB_CONFIG = {
  id: 'cfg-1',
  createdAt: '2026-06-12T08:00:00.000Z',
  alpha: 0.3,
  weightComplexSyllables: 50,
  weightMultiMemberedGraphemes: 25,
  weightRareGraphemes: 12.5,
  weightConsonantClusters: 12.5,
};

// Minimaler Stub für die ResultData-Felder, damit das Result-View nicht
// während des Tests in eine Null-Dereferenzierung läuft. Die Werte selbst
// sind für die Texttyp-Tests irrelevant.
const STUB_RESULT = {
  id: 'r1',
  createdAt: '2026-06-17T10:00:00.000Z',
  countWords: 4,
  countPhrases: 1,
  countSyllables: 4,
  countWordsWithComplexSyllables: 0,
  countWordsWithConsonantClusters: 0,
  countWordsWithMultiMemberedGraphemes: 0,
  countWordsWithRareGraphemes: 0,
  countWordsWithOneSyllable: 4,
  countWordsWithTwoSyllable: 0,
  countWordsWithThreeSyllable: 0,
  countWordsWithFourSyllable: 0,
  countWordsWithFiveSyllable: 0,
  averageWordLength: 4,
  averagePhraseLength: 4,
  averageCharsPerSyllable: 4,
  averageSyllablesPerWord: 1,
  averageSyllablesPerPhrase: 4,
  proportionOfLongWords: 0,
  proportionOfWordsWithComplexSyllables: 0,
  proportionOfWordsWithConsonantClusters: 0,
  proportionOfWordsWithMultiMemberedGraphemes: 0,
  proportionOfWordsWithRareGraphemes: 0,
  lix: 4,
  ratte: 0,
  gsmog: 0,
  wst4: 0,
  fleschKincaid: 0,
  ttr: 100,
  countAbbreviations: 0,
  countNumbers: 0,
  countNumbersTwoDigit: 0,
  countNumbersThreeDigit: 0,
  countNumbersFourDigit: 0,
  countNumbersFivePlusDigit: 0,
  countSpecialCharacters: 0,
  proNIndex: 0,
  subordinateClauseRatio: 0,
  passiveCount: 0,
  nominalizationCount: 0,
  wordComplexity: 0,
  lueLix: 4,
  level: 1,
  textType: 'list' as const,
  readingUnit: 'line' as const,
  detectedTextType: 'list' as const,
  countReadingUnits: 4,
  text: '',
  title: '',
  words: [],
  wordsWithOneSyllable: [],
  wordsWithTwoSyllables: [],
  wordsWithThreeSyllables: [],
  wordsWithFourSyllables: [],
  wordsWithFiveSyllables: [],
  phrases: [],
  hashText: 'h',
  config: DB_CONFIG,
  configId: 'cfg-1',
};

interface IndexVm {
  text: string;
  textType: 'prose' | 'list';
  detectedTextType: 'prose' | 'list';
  calculate: () => Promise<void>;
}

describe('IndexPage — Texttyp-Schalter (Issue #30, ADR 0002 AC3)', () => {
  beforeEach(() => {
    calculateMock.mockReset();
    getConfigMock.mockReset();
    getConfigMock.mockResolvedValue(DB_CONFIG);
    calculateMock.mockResolvedValue(STUB_RESULT);
  });

  it('erkennt eine Wörterliste heuristisch als Liste', async () => {
    const wrapper = await mountSuspended(IndexPage);
    await flushPromises();
    const vm = wrapper.vm as unknown as IndexVm;

    vm.text = 'Hund\nKatze\nVogel\nMaus';
    await flushPromises();

    expect(vm.detectedTextType).toBe('list');
    expect(vm.textType).toBe('list');
  });

  it('erkennt Fließtext heuristisch als prose', async () => {
    const wrapper = await mountSuspended(IndexPage);
    await flushPromises();
    const vm = wrapper.vm as unknown as IndexVm;

    vm.text = 'Der Hund läuft. Die Katze schläft.';
    await flushPromises();

    expect(vm.detectedTextType).toBe('prose');
    expect(vm.textType).toBe('prose');
  });

  it('schickt den effektiven Texttyp als Override an die API mit', async () => {
    const wrapper = await mountSuspended(IndexPage);
    await flushPromises();
    const vm = wrapper.vm as unknown as IndexVm;

    vm.text = 'Hund\nKatze\nVogel\nMaus';
    await flushPromises();
    await vm.calculate();

    expect(calculateMock).toHaveBeenCalledTimes(1);
    const body = calculateMock.mock.calls[0]![0];
    expect(body.textType).toBe('list');
  });

  it('Override schlägt die Heuristik und wird an die API geschickt', async () => {
    const wrapper = await mountSuspended(IndexPage);
    await flushPromises();
    const vm = wrapper.vm as unknown as IndexVm;

    vm.text = 'Hund\nKatze\nVogel\nMaus';
    await flushPromises();
    expect(vm.detectedTextType).toBe('list');

    vm.textType = 'prose';
    await flushPromises();
    await vm.calculate();

    const body = calculateMock.mock.calls[0]![0];
    expect(body.textType).toBe('prose');
    // Die heuristische Erkennung bleibt unverändert sichtbar.
    expect(vm.detectedTextType).toBe('list');
  });
});
