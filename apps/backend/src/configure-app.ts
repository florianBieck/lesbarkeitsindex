import type { NestExpressApplication } from '@nestjs/platform-express';

/** Pfad-Präfix aller Backend-Routen (ADR 0004); alle übrigen Pfade gehören dem Frontend. */
const API_PREFIX = 'api';

/**
 * Obergrenze für JSON-Bodies, dieselbe wie zuvor unter Fastify (ADR 0005). Mit Express'
 * Vorgabe von 100 KB bekäme ein langer Text mit Umlauten (zwei Bytes in UTF-8) eine 413,
 * obwohl das Schema von `POST /api/calculate` ihn zulässt.
 */
const JSON_BODY_LIMIT = '1mb';

/**
 * App-weites HTTP-Setup für `main.ts` und die e2e-Specs. Die Specs bauen die App
 * über `Test.createTestingModule` und bekämen es sonst nicht mit.
 */
export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  // Express meldet sich sonst mit `X-Powered-By: Express`; Fastify schickte keinen solchen Header.
  app.disable('x-powered-by');
}
