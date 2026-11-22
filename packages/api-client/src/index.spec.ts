import { expect, test, vi } from 'vitest';
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

  expect(fetcher.mock.calls).toEqual([
    ['/api/config'],
    ['/api/config', { method: 'POST', body: weights }],
    ['/api/calculate', { method: 'POST', body: { text: 'Ein Satz.' } }],
  ]);
});
