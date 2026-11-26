import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { useApiClient } from '@/composables/useApiClient';
import DocumentationPage from '@/pages/documentation.vue';
import { router } from '@/router';
import { makeConfig } from '@/test-fixtures';

/**
 * Dokumentationsseite: erklärt die Berechnung des LÜ-LIX und wie sie sich
 * anpassen lässt. Die aktuellen Standardwerte kommen aus GET /api/config.
 */

type ApiClient = ReturnType<typeof useApiClient>;

const { getConfigMock } = vi.hoisted(() => ({
  getConfigMock: vi.fn<ApiClient['getConfig']>(),
}));

vi.mock(import('@/composables/useApiClient'), () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    calculate: vi.fn(),
  }),
}));

async function mountPage() {
  const wrapper = mount(DocumentationPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('DocumentationPage', () => {
  beforeEach(() => {
    getConfigMock.mockReset();
    getConfigMock.mockResolvedValue(makeConfig());
  });

  it('trägt die Überschrift und die Formel des LÜ-LIX', async () => {
    const page = await mountPage();

    expect(page.get('h2').text()).toBe('So wird der LÜ-LIX berechnet');
    expect(page.text()).toContain('LÜ-LIX = LIX + α · WK');
  });

  it('nennt die Formel des LIX', async () => {
    const page = await mountPage();

    expect(page.text()).toContain('LIX = Wörter ÷ Leseeinheiten + lange Wörter × 100 ÷ Wörter');
  });

  it('erklärt die vier WK-Komponenten in der Sprache des Glossars', async () => {
    const text = (await mountPage()).text();

    for (const component of [
      'Drei- und Mehrsilber',
      'Mehrgliedrige Grapheme',
      'Seltene Grapheme',
      'Konsonantenlauthäufung',
    ]) {
      expect(text).toContain(component);
    }
  });

  it('listet die fünf Niveaustufen mit ihren Bändern', async () => {
    const rows = (await mountPage()).findAll('[data-testid="level-row"]').map((row) =>
      row
        .findAll('td')
        .map((cell) => cell.text())
        .join(' '),
    );

    expect(rows).toEqual([
      'unter 30 1 Sehr leicht lesbar',
      '30 bis unter 40 2 Leicht lesbar',
      '40 bis unter 50 3 Mittelschwer',
      '50 bis unter 60 4 Eher schwer lesbar',
      'ab 60 5 Schwer lesbar',
    ]);
  });

  it('rechnet das Beispiel vor', async () => {
    const text = (await mountPage()).text();

    expect(text).toContain('Igel sind nachtaktive Tiere. Sie schlafen am Tag.');
    expect(text).toContain('LIX = 8 ÷ 2 + 2 × 100 ÷ 8 = 29');
    expect(text).toContain('LÜ-LIX = 29 + 0,3 × 23,44 = 36,03');
  });

  it('erklärt beide Wege der Anpassung', async () => {
    const text = (await mountPage()).text();

    expect(text).toContain('Erweiterte Einstellungen');
    expect(text).toContain('Zurücksetzen auf Standard');
    expect(text).toContain('config.json');
  });

  it('führt zurück zur Startseite', async () => {
    const page = await mountPage();

    const links = page.findAll('a[href="/"]');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]!.text()).toContain('Zur Textanalyse');
  });

  describe('aktuelle Standardwerte', () => {
    const defaults = (page: Awaited<ReturnType<typeof mountPage>>) =>
      page
        .findAll('[data-testid="default-value"]')
        .map((entry) => entry.text().replace(/\s+/g, ' '));

    it('zeigt die Werte aus GET /api/config, mit Dezimalkomma', async () => {
      // Bewusst andere Werte als die eingebauten Standardwerte des Backends.
      getConfigMock.mockResolvedValue(
        makeConfig({
          alpha: 0.45,
          weightComplexSyllables: 40,
          weightMultiMemberedGraphemes: 30,
          weightRareGraphemes: 17.5,
          weightConsonantClusters: 12.5,
        }),
      );

      const page = await mountPage();

      expect(defaults(page)).toEqual([
        'Aufschlag α0,45',
        'Drei- und Mehrsilber40',
        'Mehrgliedrige Grapheme30',
        'Seltene Grapheme17,5',
        'Konsonantenlauthäufung12,5',
      ]);
    });

    it('sagt es, wenn die Werte nicht geladen werden können, und erklärt trotzdem', async () => {
      getConfigMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const page = await mountPage();

      expect(defaults(page)).toEqual([]);
      expect(page.text()).toContain('Die Standardwerte konnten gerade nicht geladen werden.');
      expect(page.text()).toContain('LÜ-LIX = LIX + α · WK');
      consoleError.mockRestore();
    });
  });
});
