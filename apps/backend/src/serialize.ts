import { Prisma } from './generated/prisma/client.js';

/**
 * Wandelt Prisma-`Decimal`-Werte rekursiv in `number` um — inklusive
 * verschachtelter Objekte (etwa die `config`-Relation). Datumswerte, Strings und
 * Arrays bleiben unverändert (Fastify serialisiert `Date` zu ISO-Strings). So
 * verlässt die API durchgängig Zahlen statt Decimal-Strings: ein einziger
 * Zahlenvertrag über das ganze Ergebnis (Architektur-Review, D+E).
 */
export function toJsonNumbers<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonNumbers(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = toJsonNumbers(item);
    }
    return out as T;
  }
  return value;
}
