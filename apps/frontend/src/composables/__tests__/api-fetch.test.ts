import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, isConfigInvalid } from '@/composables/api-fetch';

/**
 * Der `ApiFetch` des API-Clients auf nativem `fetch`: relative URLs zum eigenen
 * Origin, Query-String, JSON-Body und ein Fehler bei jeder Nicht-2xx-Antwort.
 */

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('apiFetch', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holt per GET den relativen Pfad und liefert das geparste JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ alpha: 0.3 }));

    await expect(apiFetch('/api/config')).resolves.toEqual({ alpha: 0.3 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/config');
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
  });

  it('hängt die Query an und lässt undefinierte Werte weg', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await apiFetch('/api/config', { query: { page: 2, limit: 10, filter: undefined } });

    expect(fetchMock.mock.calls[0]![0]).toBe('/api/config?page=2&limit=10');
  });

  it('lässt den Query-String ganz weg, wenn nichts übrig bleibt', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await apiFetch('/api/config', { query: { page: undefined } });

    expect(fetchMock.mock.calls[0]![0]).toBe('/api/config');
  });

  it('schickt einen Body als JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'r1' }));

    await apiFetch('/api/calculate', { method: 'POST', body: { text: 'Der Igel schläft.' } });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify({ text: 'Der Igel schläft.' }));
  });

  it('wirft bei einer Nicht-2xx-Antwort einen Fehler mit Methode, Pfad und Status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401));

    await expect(apiFetch('/api/config', { method: 'POST', body: { alpha: 0.3 } })).rejects.toThrow(
      'POST /api/config failed with status 401',
    );
  });

  it('der Fehler trägt Status und Fehlerkennung der Antwort', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 500, error: 'CONFIG_INVALID', message: 'fehlerhaft' }, 500),
    );

    const error = await apiFetch('/api/config').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, code: 'CONFIG_INVALID' });
    expect(isConfigInvalid(error)).toBe(true);
  });

  it('eine Fehlerantwort ohne JSON-Body ergibt einen Fehler ohne Kennung', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    const error = await apiFetch('/api/config').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, code: undefined });
    expect(isConfigInvalid(error)).toBe(false);
  });

  it('ein Netzwerkfehler ist keine fehlerhafte Konfiguration', () => {
    expect(isConfigInvalid(new TypeError('Failed to fetch'))).toBe(false);
  });
});
