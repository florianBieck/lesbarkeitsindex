import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import LegalLinks from '@/components/legal-links.vue';
import type { useApiClient } from '@/composables/useApiClient';
import { makeConfig } from '@/test-fixtures';

/**
 * Fußzeile mit den Links zu Impressum und Datenschutz (Issue #94, ADR 0008):
 * Jeder Link erscheint nur, wenn die `config.json` seine Adresse nennt.
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

async function mountLinks() {
  const wrapper = mount(LegalLinks);
  await flushPromises();
  return wrapper;
}

describe('LegalLinks', () => {
  beforeEach(() => {
    getConfigMock.mockReset();
  });

  it('zeigt beide Links, wenn beide Adressen vorhanden sind', async () => {
    getConfigMock.mockResolvedValue(
      makeConfig({
        impressumUrl: 'https://example.org/impressum',
        datenschutzUrl: 'https://example.org/datenschutz',
      }),
    );

    const links = (await mountLinks()).findAll('a');

    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Impressum', 'https://example.org/impressum'],
      ['Datenschutz', 'https://example.org/datenschutz'],
    ]);
  });

  it('zeigt nur den Link, dessen Adresse vorhanden ist', async () => {
    getConfigMock.mockResolvedValue(
      makeConfig({ datenschutzUrl: 'https://example.org/datenschutz' }),
    );

    const links = (await mountLinks()).findAll('a');

    expect(links.map((link) => link.text())).toEqual(['Datenschutz']);
  });

  it('rendert ohne Adressen keine Fußzeile', async () => {
    getConfigMock.mockResolvedValue(makeConfig());

    const wrapper = await mountLinks();

    expect(wrapper.find('footer').exists()).toBe(false);
    expect(wrapper.findAll('a')).toHaveLength(0);
  });

  it('rendert keine Fußzeile, wenn die Konfiguration nicht geladen werden kann', async () => {
    getConfigMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const wrapper = await mountLinks();

    expect(wrapper.find('footer').exists()).toBe(false);
  });

  it('öffnet die Links in einem neuen Tab, ohne Zugriff auf die Seite', async () => {
    getConfigMock.mockResolvedValue(makeConfig({ impressumUrl: 'https://example.org/impressum' }));

    const link = (await mountLinks()).get('a');

    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
  });
});
