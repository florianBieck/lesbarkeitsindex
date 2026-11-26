import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import App from '@/app.vue';
import type { useApiClient } from '@/composables/useApiClient';
import { router } from '@/router';

type ApiClient = ReturnType<typeof useApiClient>;

vi.mock(import('@/composables/useApiClient'), () => ({
  useApiClient: () => ({
    getConfig: vi.fn<ApiClient['getConfig']>().mockResolvedValue({
      alpha: 0.3,
      weightComplexSyllables: 50,
      weightMultiMemberedGraphemes: 25,
      weightRareGraphemes: 12.5,
      weightConsonantClusters: 12.5,
    }),
    calculate: vi.fn(),
  }),
}));

async function mountAt(path: string) {
  await router.push(path);
  const wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('App shell', () => {
  it('shows the app name and the link to the website, and no menu', async () => {
    const wrapper = await mountAt('/');

    expect(wrapper.get('h1').text()).toBe('Lübecker Lesbarkeitsindex (LÜ-LIX)');
    expect(wrapper.get('a[href="https://www.beate-lessmann.de"]').text()).toContain('Zur Website');
    expect(wrapper.find('[aria-haspopup]').exists()).toBe(false);
    expect(wrapper.find('nav').exists()).toBe(false);
  });

  it('shows the documentation page at /dokumentation', async () => {
    const wrapper = await mountAt('/dokumentation');

    expect(wrapper.get('h2').text()).toBe('So wird der LÜ-LIX berechnet');
  });

  it('links from the start page to the documentation', async () => {
    const wrapper = await mountAt('/');

    await wrapper.get('a[href="/dokumentation"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/dokumentation');
    expect(wrapper.get('h2').text()).toBe('So wird der LÜ-LIX berechnet');
  });

  it.each(['/login', '/logout', '/admin'])(
    'shows the not-found page at the former account address %s',
    async (path) => {
      const wrapper = await mountAt(path);

      expect(wrapper.text()).toContain('Seite nicht gefunden');
    },
  );
});
