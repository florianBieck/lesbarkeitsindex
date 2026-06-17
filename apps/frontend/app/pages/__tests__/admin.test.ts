import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import AdminPage from '~/pages/admin.vue';

/**
 * Frontend-Unit-Test für die Admin-Konfigurationsseite (Issue #29, AC2).
 *
 * Prüft, dass die Summe-100-Validierung clientseitig greift:
 * Bei ungültiger Summe ist Speichern blockiert und eine verständliche Meldung
 * sichtbar; bei gültiger Summe wird der API-Aufruf ausgelöst.
 */

const updateConfigMock = vi.fn();
const getConfigMock = vi.fn();

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    updateConfig: updateConfigMock,
    calculate: vi.fn(),
    getResults: vi.fn(),
  }),
}));

const DB_CONFIG = {
  id: 'cfg-1',
  createdAt: '2026-06-12T08:00:00.000Z',
  alpha: '0.3',
  weightComplexSyllables: '50',
  weightMultiMemberedGraphemes: '25',
  weightRareGraphemes: '12.5',
  weightConsonantClusters: '12.5',
};

describe('AdminPage — Summe-100-Validierung (Issue #29, AC2)', () => {
  beforeEach(() => {
    updateConfigMock.mockReset();
    getConfigMock.mockReset();
    getConfigMock.mockResolvedValue(DB_CONFIG);
    updateConfigMock.mockResolvedValue({ ...DB_CONFIG, id: 'cfg-2' });
  });

  it('lädt die aktuelle Konfiguration beim Mount und schreibt sie beim Speichern unverändert zurück', async () => {
    // Konfiguration, die sich von den Hardcoded-Defaults der Page unterscheidet —
    // so können wir verifizieren, dass die Werte aus der API in die Form gelangen.
    getConfigMock.mockResolvedValueOnce({
      ...DB_CONFIG,
      alpha: '0.45',
      weightComplexSyllables: '40',
      weightMultiMemberedGraphemes: '30',
      weightRareGraphemes: '20',
      weightConsonantClusters: '10',
    });

    const wrapper = await mountSuspended(AdminPage);
    await flushPromises();
    expect(getConfigMock).toHaveBeenCalled();

    const vm = wrapper.vm as unknown as { saveConfig: () => Promise<void> };
    await vm.saveConfig();
    await flushPromises();

    expect(updateConfigMock).toHaveBeenCalledWith({
      alpha: 0.45,
      weightComplexSyllables: 40,
      weightMultiMemberedGraphemes: 30,
      weightRareGraphemes: 20,
      weightConsonantClusters: 10,
    });
  });

  it('blockiert Speichern bei Summe ≠ 100 und zeigt eine verständliche Meldung', async () => {
    const wrapper = await mountSuspended(AdminPage);
    await flushPromises();

    // Setze ein Gewicht so, dass die Summe nicht 100 ergibt (50+25+12.5+0 = 87.5).
    const vm = wrapper.vm as unknown as {
      weightConsonantClusters: number;
      saveConfig: () => Promise<void>;
    };
    vm.weightConsonantClusters = 0;
    await flushPromises();

    await vm.saveConfig();
    await flushPromises();

    expect(updateConfigMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toMatch(/100/);
    expect(wrapper.text().toLowerCase()).toMatch(/summe/);
  });

  it('erlaubt Speichern bei Summe = 100 und ruft updateConfig auf', async () => {
    const wrapper = await mountSuspended(AdminPage);
    await flushPromises();

    const vm = wrapper.vm as unknown as { saveConfig: () => Promise<void> };
    await vm.saveConfig();
    await flushPromises();

    expect(updateConfigMock).toHaveBeenCalledTimes(1);
    expect(updateConfigMock).toHaveBeenCalledWith({
      alpha: 0.3,
      weightComplexSyllables: 50,
      weightMultiMemberedGraphemes: 25,
      weightRareGraphemes: 12.5,
      weightConsonantClusters: 12.5,
    });
  });
});
