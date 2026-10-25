import { expect, test, vi } from 'vite-plus/test';
import { createApiClient } from './index.ts';

test('requests every endpoint under /api/ (ADR 0004)', async () => {
  const fetcher = vi.fn(async () => undefined as never);
  const client = createApiClient(fetcher);
  const weights = {
    alpha: 0.3,
    weightComplexSyllables: 50,
    weightMultiMemberedGraphemes: 25,
    weightRareGraphemes: 12.5,
    weightConsonantClusters: 12.5,
  };

  await client.getConfig();
  await client.updateConfig(weights);
  await client.calculate({ text: 'Ein Satz.' });
  await client.getResults({ page: 0, limit: 10 });

  expect(fetcher.mock.calls).toEqual([
    ['/api/config'],
    ['/api/config', { method: 'POST', body: weights }],
    ['/api/calculate', { method: 'POST', body: { text: 'Ein Satz.' } }],
    ['/api/results', { query: { page: 0, limit: 10 } }],
  ]);
});
