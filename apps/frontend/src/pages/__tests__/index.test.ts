import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { Config } from '@lesbarkeitsindex/api-client';
import ConfigWeightsForm from '@/components/config-weights-form.vue';
import { ApiError } from '@/composables/api-fetch';
import type { ResultData, useApiClient } from '@/composables/useApiClient';
import IndexPage from '@/pages/index.vue';

/**
 * Frontend-Unit-Test für die Texttyp-/Listen-Erkennung der Startseite
 * (Issue #30, ADR 0002 — AC3).
 *
 * Prüft, dass der Schalter automatisch den heuristischen Texttyp anzeigt und
 * ihn beim Absenden als Override an die API weitergibt.
 */

type ApiClient = ReturnType<typeof useApiClient>;

const { calculateMock, getConfigMock } = vi.hoisted(() => ({
  calculateMock: vi.fn<ApiClient['calculate']>(),
  getConfigMock: vi.fn<ApiClient['getConfig']>(),
}));

// Die Seite importiert useApiClient explizit, daher wird das Modul gemockt.
// `import()` statt Pfad-String: die Factory wird gegen die echten Exporte typgeprüft.
vi.mock(import('@/composables/useApiClient'), () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    calculate: calculateMock,
  }),
}));

// Bewusst andere Werte als die eingebauten Standardwerte des Backends: So zeigt
// sich, dass die Seite ihre Standardwerte nur aus GET /api/config hat.
const DEFAULT_CONFIG: Config = {
  alpha: 0.45,
  weightComplexSyllables: 40,
  weightMultiMemberedGraphemes: 30,
  weightRareGraphemes: 20,
  weightConsonantClusters: 10,
};

// Minimaler Stub für die ResultData-Felder, damit das Result-View nicht
// während des Tests in eine Null-Dereferenzierung läuft. Die Werte selbst
// sind für die Texttyp-Tests irrelevant.
const STUB_RESULT: ResultData = {
  countWords: 4,
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
  config: DEFAULT_CONFIG,
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
    getConfigMock.mockResolvedValue(DEFAULT_CONFIG);
    calculateMock.mockResolvedValue(STUB_RESULT);
  });

  it('erkennt eine Wörterliste heuristisch als Liste', async () => {
    const wrapper = mount(IndexPage);
    await flushPromises();
    const vm = wrapper.vm as unknown as IndexVm;

    vm.text = 'Hund\nKatze\nVogel\nMaus';
    await flushPromises();

    expect(vm.detectedTextType).toBe('list');
    expect(vm.textType).toBe('list');
  });

  it('erkennt Fließtext heuristisch als prose', async () => {
    const wrapper = mount(IndexPage);
    await flushPromises();
    const vm = wrapper.vm as unknown as IndexVm;

    vm.text = 'Der Hund läuft. Die Katze schläft.';
    await flushPromises();

    expect(vm.detectedTextType).toBe('prose');
    expect(vm.textType).toBe('prose');
  });

  it('schickt den effektiven Texttyp als Override an die API mit', async () => {
    const wrapper = mount(IndexPage);
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
    const wrapper = mount(IndexPage);
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

  it('bindet die Texteingabe als einfaches Textfeld (kein Rich-Text-Editor)', async () => {
    const wrapper = mount(IndexPage);
    await flushPromises();

    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);

    await textarea.setValue('Hund\nKatze\nVogel\nMaus');
    const vm = wrapper.vm as unknown as IndexVm;
    expect(vm.text).toBe('Hund\nKatze\nVogel\nMaus');
  });
});

const CONFIG_INVALID_MESSAGE =
  'Die Konfiguration ist fehlerhaft, bitte wenden Sie sich an die Betreuung';
const DEVIATION_HINT = 'Abweichende Einstellungen';

const configInvalidError = () =>
  new ApiError('GET /api/config failed with status 500', 500, 'CONFIG_INVALID');

/**
 * „Erweiterte Einstellungen" (Issue #94, ADR 0008): Standardwerte nur aus
 * GET /api/config, Zurücksetzen auf Standard, Hinweis auf abweichende
 * Einstellungen am Ergebnis, Meldung bei fehlerhafter Konfiguration.
 */
describe('IndexPage — Erweiterte Einstellungen (Issue #94)', () => {
  beforeEach(() => {
    calculateMock.mockReset();
    getConfigMock.mockReset();
    getConfigMock.mockResolvedValue(DEFAULT_CONFIG);
    calculateMock.mockResolvedValue(STUB_RESULT);
  });

  async function mountPage() {
    const wrapper = mount(IndexPage);
    await flushPromises();
    return wrapper;
  }

  type Page = Awaited<ReturnType<typeof mountPage>>;

  const form = (page: Page) => page.findComponent(ConfigWeightsForm);

  const buttonLabelled = (page: Page, label: string) => {
    const button = page.findAll('button').find((candidate) => candidate.text().includes(label));
    if (!button) throw new Error(`Kein Button „${label}"`);
    return button;
  };

  async function analyze(page: Page) {
    await page.find('textarea').setValue('Der Hund läuft. Die Katze schläft.');
    await buttonLabelled(page, 'Text analysieren').trigger('click');
    await flushPromises();
  }

  const lastCalculateBody = () => calculateMock.mock.lastCall![0];

  it('füllt die Maske mit den Standardwerten aus GET /api/config', async () => {
    const page = await mountPage();

    expect(getConfigMock).toHaveBeenCalledTimes(1);
    expect(form(page).props()).toMatchObject(DEFAULT_CONFIG);
  });

  it('schickt bei unveränderten Einstellungen keine Werte mit: das Backend nimmt den Standard', async () => {
    const page = await mountPage();

    await analyze(page);

    expect(lastCalculateBody()).toEqual({
      text: 'Der Hund läuft. Die Katze schläft.',
      textType: 'prose',
    });
  });

  it('schickt nur die geänderten Werte mit, ohne Summenregel', async () => {
    const page = await mountPage();

    form(page).vm.$emit('update:alpha', 1);
    form(page).vm.$emit('update:weightComplexSyllables', 90);
    await analyze(page);

    expect(lastCalculateBody()).toEqual({
      text: 'Der Hund läuft. Die Katze schläft.',
      textType: 'prose',
      alpha: 1,
      weightComplexSyllables: 90,
    });
  });

  it('ein geleertes Feld gilt als Standardwert', async () => {
    const page = await mountPage();

    form(page).vm.$emit('update:alpha', null);
    await analyze(page);

    expect(lastCalculateBody()).not.toHaveProperty('alpha');
  });

  describe('Hinweis auf abweichende Einstellungen', () => {
    it('fehlt bei einem Ergebnis mit Standardwerten', async () => {
      const page = await mountPage();

      await analyze(page);

      expect(page.text()).toContain('Ergebnis');
      expect(page.text()).not.toContain(DEVIATION_HINT);
    });

    it('steht am Ergebnis, wenn mit geänderten Werten gerechnet wurde', async () => {
      const page = await mountPage();

      form(page).vm.$emit('update:alpha', 1);
      await analyze(page);

      expect(page.text()).toContain(DEVIATION_HINT);
    });

    it('fehlt, wenn ein Wert geändert und wieder auf den Standard gestellt wurde', async () => {
      const page = await mountPage();

      form(page).vm.$emit('update:alpha', 1);
      form(page).vm.$emit('update:alpha', DEFAULT_CONFIG.alpha);
      await analyze(page);

      expect(page.text()).not.toContain(DEVIATION_HINT);
    });

    it('bleibt am angezeigten Ergebnis, bis neu gerechnet wird', async () => {
      const page = await mountPage();
      form(page).vm.$emit('update:alpha', 1);
      await analyze(page);

      await buttonLabelled(page, 'Zurücksetzen auf Standard').trigger('click');
      // Das sichtbare Ergebnis wurde weiterhin mit α = 1 berechnet.
      expect(page.text()).toContain(DEVIATION_HINT);

      await analyze(page);
      expect(page.text()).not.toContain(DEVIATION_HINT);
    });
  });

  describe('Zurücksetzen auf Standard', () => {
    it('stellt alle fünf Werte auf die Standardwerte zurück', async () => {
      const page = await mountPage();
      form(page).vm.$emit('update:alpha', 1);
      form(page).vm.$emit('update:weightRareGraphemes', 0);
      await flushPromises();
      expect(form(page).props()).toMatchObject({ alpha: 1, weightRareGraphemes: 0 });

      await buttonLabelled(page, 'Zurücksetzen auf Standard').trigger('click');

      expect(form(page).props()).toMatchObject(DEFAULT_CONFIG);
    });

    it('danach rechnet die nächste Analyse wieder mit dem Standard', async () => {
      const page = await mountPage();
      form(page).vm.$emit('update:alpha', 1);

      await buttonLabelled(page, 'Zurücksetzen auf Standard').trigger('click');
      await analyze(page);

      expect(lastCalculateBody()).not.toHaveProperty('alpha');
    });
  });

  describe('fehlerhafte Konfiguration', () => {
    it('zeigt beim Laden die Meldung und rechnet nicht', async () => {
      getConfigMock.mockRejectedValue(configInvalidError());

      const page = await mountPage();
      await analyze(page);

      expect(page.find('[role="alert"]').text()).toContain(CONFIG_INVALID_MESSAGE);
      expect(form(page).exists()).toBe(false);
      expect(calculateMock).not.toHaveBeenCalled();
    });

    it('rechnet ohne Neuladen weiter, sobald die Konfiguration korrigiert ist', async () => {
      getConfigMock.mockRejectedValueOnce(configInvalidError());
      const page = await mountPage();

      // Ab jetzt liefert GET /api/config wieder die Standardwerte.
      await analyze(page);

      expect(calculateMock).toHaveBeenCalledTimes(1);
      expect(page.text()).not.toContain(CONFIG_INVALID_MESSAGE);
      expect(form(page).props()).toMatchObject(DEFAULT_CONFIG);
    });

    it('zeigt die Meldung, wenn die Berechnung an der Konfiguration scheitert', async () => {
      const page = await mountPage();
      calculateMock.mockRejectedValue(configInvalidError());

      await analyze(page);

      expect(page.find('[role="alert"]').text()).toContain(CONFIG_INVALID_MESSAGE);
    });
  });

  it('ohne erreichbare Konfiguration bleibt die Analyse mit dem Standard des Backends möglich', async () => {
    getConfigMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const page = await mountPage();

    expect(form(page).exists()).toBe(false);
    expect(page.text()).toContain('Die Einstellungen konnten nicht geladen werden');
    expect(page.text()).not.toContain(CONFIG_INVALID_MESSAGE);

    await analyze(page);

    expect(lastCalculateBody()).toEqual({
      text: 'Der Hund läuft. Die Katze schläft.',
      textType: 'prose',
    });
  });
});
