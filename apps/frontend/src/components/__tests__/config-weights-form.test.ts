import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ConfigWeightsForm from '@/components/config-weights-form.vue';
import type { useApiClient } from '@/composables/useApiClient';

/**
 * Unit-Test für die gemeinsame Gewichtungs-Eingabemaske (Aufschlag α + vier
 * WK-Gewichte) der Startseite („Erweiterte Einstellungen“).
 *
 * Die Maske besitzt keinen eigenen Zustand und lädt nichts: Die Seite bindet
 * per v-model und holt die Standardwerte selbst.
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
    calculate: vi.fn(),
  }),
}));

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

  it('zeigt die gebundenen Werte und lädt selbst keine Konfiguration', async () => {
    const wrapper = mount(ConfigWeightsForm, {
      props: { ...MODEL_PROPS, alpha: 0.45, weightRareGraphemes: 20 },
    });
    await flushPromises();

    expect(wrapper.find<HTMLInputElement>('#param-alpha input').element.value).toBe('0.45');
    expect(wrapper.find<HTMLInputElement>('#weight-rare-graphemes input').element.value).toBe('20');
    expect(getConfigMock).not.toHaveBeenCalled();
  });
});
