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

/** Fehlerkennung des Backends für eine vorhandene, aber fehlerhafte `config.json` (ADR 0008). */
const CONFIG_INVALID_CODE = 'CONFIG_INVALID';

/** A non-2xx answer: the status, and the `error` code of the JSON body when it has one. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** True when the backend refused because its `config.json` is invalid. */
export const isConfigInvalid = (error: unknown): boolean =>
  error instanceof ApiError && error.code === CONFIG_INVALID_CODE;

/** HTTP-Status, mit dem das Backend eine Anfrage über der Obergrenze von `POST /api/calculate` ablehnt. */
const TOO_MANY_REQUESTS = 429;

/** True when the backend refused because this visitor sent too many requests. */
export const isRateLimited = (error: unknown): boolean =>
  error instanceof ApiError && error.status === TOO_MANY_REQUESTS;

async function errorCodeOf(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      return typeof body.error === 'string' ? body.error : undefined;
    }
    return undefined;
  } catch {
    // Kein JSON (etwa eine Fehlerseite der Edge): Der Status allein muss reichen.
    return undefined;
  }
}

/**
 * The API client's fetcher on native `fetch`. Paths stay relative: the browser
 * only ever talks to its own origin (ADR 0007).
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
    throw new ApiError(
      `${method} ${path} failed with status ${response.status}`,
      response.status,
      await errorCodeOf(response),
    );
  }
  return (await response.json()) as T;
};
