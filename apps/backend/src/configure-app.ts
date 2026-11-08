import type { NestExpressApplication } from '@nestjs/platform-express';

/** Pfad-Präfix aller Backend-Routen (ADR 0004); alle übrigen Pfade gehören dem Frontend. */
const API_PREFIX = 'api';

/**
 * Obergrenze für JSON-Bodies (ADR 0005). Das Schema von `POST /api/calculate` lässt
 * 100.000 Zeichen zu, mit Umlauten (zwei Bytes in UTF-8) also mehr als Express' Vorgabe
 * von 100 KB; 1 MiB fasst auch den längsten zulässigen Text.
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
  // Ohne diese Zeile nennt jede Antwort das Framework: `X-Powered-By: Express`.
  app.disable('x-powered-by');
}
