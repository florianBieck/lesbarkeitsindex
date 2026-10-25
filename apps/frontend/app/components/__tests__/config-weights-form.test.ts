import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { flushPromises, mount } from '@vue/test-utils';
import type { Config } from '@lesbarkeitsindex/api-client';
import ConfigWeightsForm from '@/components/config-weights-form.vue';
import type { useApiClient } from '@/composables/useApiClient';

// PROTOTYPE (wayfinder #55): this spec ported from @nuxt/test-utils to plain
// @vue/test-utils on vite-plus/test. Run: pnpm --filter frontend run test:prototype-vtu

/**
 * Unit-Test für die gemeinsame Gewichtungs-Eingabemaske (Aufschlag α + vier
 * WK-Gewichte), die von Startseite und Admin-Seite verwendet wird.
 *
 * Die Maske besitzt keinen eigenen Zustand: die Seiten binden per v-model.
 * Beim Mount hydriert sie die Modelle aus der gespeicherten Konfiguration.
 */

type ApiClient = ReturnType<typeof useApiClient>;

const { getConfigMock } = vi.hoisted(() => ({
  getConfigMock: vi.fn<ApiClient['getConfig']>(),
}));

// Die Komponente importiert useApiClient explizit, daher wird das Modul
// gemockt. `import()` statt Pfad-String: die Factory wird gegen die echten
// Exporte typgeprüft.
vi.mock(import('@/composables/useApiClient'), () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    updateConfig: vi.fn(),
    calculate: vi.fn(),
    getResults: vi.fn(),
  }),
}));

const DB_CONFIG: Config = {
  id: 'cfg-1',
  createdAt: '2026-06-12T08:00:00.000Z',
  alpha: 0.45,
  weightComplexSyllables: 40,
  weightMultiMemberedGraphemes: 30,
  weightRareGraphemes: 20,
  weightConsonantClusters: 10,
};

const MODEL_PROPS = {
  alpha: 0.3,
  weightComplexSyllables: 50,
  weightMultiMemberedGraphemes: 25,
  weightRareGraphemes: 12.5,
  weightConsonantClusters: 12.5,
};

describe('ConfigWeightsForm', () => {
  beforeEach(() => {
    getConfigMock.mockReset();
    getConfigMock.mockResolvedValue(DB_CONFIG);
  });

  it('rendert die fünf Eingabefelder mit den bekannten Ids und deutschen Labels', async () => {
    const wrapper = mount(ConfigWeightsForm, { props: MODEL_PROPS });
    await flushPromises();

    for (const id of [
      'param-alpha',
      'weight-complex-syllables',
      'weight-multi-graphemes',
      'weight-rare-graphemes',
      'weight-consonant-clusters',
    ]) {
      expect(wrapper.find(`#${id}`).exists()).toBe(true);
    }

    const text = wrapper.text();
    expect(text).toContain('Aufschlag');
    expect(text).toContain('Drei- und Mehrsilber');
    expect(text).toContain('Mehrgliedrige Grapheme');
    expect(text).toContain('Seltene Grapheme');
    expect(text).toContain('Konsonantenlauthäufung');
  });

  it('hydriert die Modelle beim Mount aus der gespeicherten Konfiguration', async () => {
    const onAlpha = vi.fn();
    const onComplex = vi.fn();
    const onMulti = vi.fn();
    const onRare = vi.fn();
    const onClusters = vi.fn();

    mount(ConfigWeightsForm, {
      props: {
        ...MODEL_PROPS,
        'onUpdate:alpha': onAlpha,
        'onUpdate:weightComplexSyllables': onComplex,
        'onUpdate:weightMultiMemberedGraphemes': onMulti,
        'onUpdate:weightRareGraphemes': onRare,
        'onUpdate:weightConsonantClusters': onClusters,
      },
    });
    await flushPromises();

    expect(getConfigMock).toHaveBeenCalledTimes(1);
    expect(onAlpha).toHaveBeenCalledWith(0.45);
    expect(onComplex).toHaveBeenCalledWith(40);
    expect(onMulti).toHaveBeenCalledWith(30);
    expect(onRare).toHaveBeenCalledWith(20);
    expect(onClusters).toHaveBeenCalledWith(10);
  });
});
