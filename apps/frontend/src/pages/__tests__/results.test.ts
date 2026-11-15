import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { ResultData, useApiClient } from '@/composables/useApiClient';
import ResultsPage from '@/pages/results.vue';
import { makeResult } from '@/test-fixtures';

/**
 * Die Tabelle „Bisherige Analysen" zeigt je Analyse den LÜ-LIX (Issue #83): Die Spalte las
 * ein Feld `score`, das es seit #28 nicht mehr gibt, und zeigte in jeder Zeile „NaN".
 */

type ApiClient = ReturnType<typeof useApiClient>;

const { getResultsMock } = vi.hoisted(() => ({
  getResultsMock: vi.fn<ApiClient['getResults']>(),
}));

vi.mock(import('@/composables/useApiClient'), () => ({
  useApiClient: () => ({
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    calculate: vi.fn(),
    getResults: getResultsMock,
  }),
}));

const resolveWith = (rows: ResultData[]) =>
  getResultsMock.mockResolvedValue({
    data: rows,
    meta: { total: rows.length, page: 0, limit: 10, totalPages: 1 },
  });

async function mountPage() {
  // Die Detailansicht unter der Tabelle ist hier nicht Gegenstand.
  const wrapper = mount(ResultsPage, {
    global: { stubs: { RouterLink: true, ResultView: true } },
  });
  await flushPromises();
  return wrapper;
}

/** Text der dritten Zelle jeder Datenzeile. */
const thirdCells = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.findAll('tbody tr').map((row) => row.findAll('td')[2]?.text());

describe('ResultsPage — LÜ-LIX-Spalte (Issue #83)', () => {
  beforeEach(() => {
    getResultsMock.mockReset();
  });

  it('beschriftet die dritte Spalte mit „LÜ-LIX"', async () => {
    resolveWith([makeResult()]);
    const wrapper = await mountPage();

    const headers = wrapper.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual(['Datum', 'Text', 'LÜ-LIX']);
  });

  it('zeigt den LÜ-LIX jeder Zeile, gerundet wie die Kopfzahl der Detailansicht', async () => {
    resolveWith([makeResult({ id: 'r1', lueLix: 37.456 }), makeResult({ id: 'r2', lueLix: 40 })]);
    const wrapper = await mountPage();

    expect(thirdCells(wrapper)).toEqual(['37.46', '40']);
  });
});
