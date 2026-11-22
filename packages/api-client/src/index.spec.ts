import { expect, test, vi } from 'vitest';
import { createApiClient } from './index.ts';

test('requests every endpoint under /api/ (ADR 0004)', async () => {
  const fetcher = vi.fn(async () => undefined as never);
  const client = createApiClient(fetcher);

  await client.getConfig();
  await client.calculate({ text: 'Ein Satz.' });

  expect(fetcher.mock.calls).toEqual([
    ['/api/config'],
    ['/api/calculate', { method: 'POST', body: { text: 'Ein Satz.' } }],
  ]);
});

test('offers reading the default configuration and calculating, nothing else (ADR 0008)', () => {
  const client = createApiClient(vi.fn(async () => undefined as never));

  expect(Object.keys(client).sort()).toEqual(['calculate', 'getConfig']);
});
