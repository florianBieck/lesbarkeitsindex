import type { ApiFetch } from '@lesbarkeitsindex/api-client';

function toQueryString(query: Record<string, unknown> = {}): string {
  const params = new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * The API client's fetcher on native `fetch`. Paths stay relative: the browser
 * only ever talks to its own origin (ADR 0007), so cookies go along by default.
 */
export const apiFetch: ApiFetch = async <T>(
  path: string,
  { method = 'GET', body, query }: Parameters<ApiFetch>[1] = {},
): Promise<T> => {
  const response = await fetch(`${path}${toQueryString(query)}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};
