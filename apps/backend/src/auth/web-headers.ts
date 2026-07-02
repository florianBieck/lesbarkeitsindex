import type { FastifyRequest } from 'fastify';

/**
 * Wandelt Fastifys eingehende Header in ein Web-API-`Headers`-Objekt um, wie es
 * Better-Auths Web-`Request`/`getSession` erwartet. Mehrfach gesetzte Header
 * bleiben über `append` erhalten.
 */
export function toWebHeaders(raw: FastifyRequest['headers']): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, String(value));
    }
  }
  return headers;
}
