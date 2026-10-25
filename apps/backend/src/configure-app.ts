import type { NestFastifyApplication } from '@nestjs/platform-fastify';

/** Pfad-Präfix aller Backend-Routen (ADR 0004); alle übrigen Pfade gehören dem Frontend. */
const API_PREFIX = 'api';

/**
 * App-weites HTTP-Setup für `main.ts` und die e2e-Specs. Die Specs bauen die App
 * über `Test.createTestingModule` und bekämen es sonst nicht mit.
 */
export function configureApp(app: NestFastifyApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: true,
    credentials: true,
  });
}
