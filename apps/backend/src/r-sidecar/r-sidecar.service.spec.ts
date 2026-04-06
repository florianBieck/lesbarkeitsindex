import { test, expect, describe, vi, afterEach } from 'vitest';
import { RSidecarService } from './r-sidecar.service.js';

describe('RSidecarService.analyzeText', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createService(): RSidecarService {
    process.env['R_SIDECAR_URL'] = 'http://localhost:8787';
    return new RSidecarService();
  }

  test('returns parsed response on success', async () => {
    const mockResponse = {
      sentences: ['Der Hund läuft.'],
      words: ['Der', 'Hund', 'läuft'],
      syllablesPerWord: [1, 1, 1],
      posTags: ['ART', 'NN', 'VVFIN'],
    };

    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 })),
    ) as typeof fetch;

    const service = createService();
    const result = await service.analyzeText('Der Hund läuft.');

    expect(result.sentences).toEqual(['Der Hund läuft.']);
    expect(result.words).toEqual(['Der', 'Hund', 'läuft']);
    expect(result.syllablesPerWord).toEqual([1, 1, 1]);
    expect(result.posTags).toEqual(['ART', 'NN', 'VVFIN']);
  });

  test('throws on mismatched array lengths', async () => {
    const badResponse = {
      sentences: ['Test.'],
      words: ['Test'],
      syllablesPerWord: [1, 2],
      posTags: ['NN'],
    };

    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(badResponse), { status: 200 })),
    ) as typeof fetch;

    const service = createService();
    await expect(service.analyzeText('Test.')).rejects.toThrow();
  });

  test('throws on sidecar unreachable', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('Connection refused'))) as typeof fetch;

    const service = createService();
    await expect(service.analyzeText('Test.')).rejects.toThrow();
  });

  test('throws on non-200 response', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500 })),
    ) as typeof fetch;

    const service = createService();
    await expect(service.analyzeText('Test.')).rejects.toThrow();
  });

  test('throws on missing fields in response', async () => {
    const incomplete = { sentences: ['Test.'], words: ['Test'] };

    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(incomplete), { status: 200 })),
    ) as typeof fetch;

    const service = createService();
    await expect(service.analyzeText('Test.')).rejects.toThrow();
  });
});
