import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

/** Pfad-Präfix aller Backend-Routen (ADR 0004); alle übrigen Pfade gehören dem Frontend. */
export const API_PREFIX = 'api';

/**
 * Obergrenze für JSON-Bodies (ADR 0005). Das Schema von `POST /api/calculate` lässt
 * 100.000 Zeichen zu, mit Umlauten (zwei Bytes in UTF-8) also mehr als Express' Vorgabe
 * von 100 KB; 1 MiB fasst auch den längsten zulässigen Text.
 */
const JSON_BODY_LIMIT = '1mb';

/**
 * Zahl der Reverse-Proxys vor dem Backend, deren `X-Forwarded-For` es glaubt: einer,
 * die Edge (Caddy). So ist `req.ip` die Adresse, die Caddy gesehen hat, und die
 * Obergrenze von `POST /api/calculate` zählt Besucher statt des Proxys. Caddy verwirft
 * ein vom Besucher mitgeschicktes `X-Forwarded-For`; was davon doch ankäme, stünde vor
 * Caddys Eintrag und bliebe unbeachtet. Steht ein weiterer Proxy davor, muss die Zahl
 * mitwachsen, sonst teilen sich alle Besucher eine Obergrenze.
 */
const TRUSTED_PROXY_HOPS = 1;

/**
 * Content-Security-Policy für SPA und API (ADR 0007), vollständig ausgeschrieben.
 * Alles kommt vom eigenen Origin. `style-src` braucht `'unsafe-inline'`, weil
 * PrimeVue sein Theme zur Laufzeit als `<style>`-Elemente einfügt. Eine neue
 * externe Quelle (Bild, Schrift, API) braucht hier einen Eintrag.
 */
const CONTENT_SECURITY_POLICY = {
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
};

/**
 * App-weites HTTP-Setup für `main.ts` und die e2e-Specs. Die Specs bauen die App
 * über `Test.createTestingModule` und bekämen es sonst nicht mit.
 */
export function configureApp(app: NestExpressApplication): void {
  // Als Erstes und vor `init()`: nur dann trägt jede Antwort die Header, auch die
  // statischen Dateien und Nests 404. helmet entfernt auch `X-Powered-By`.
  app.use(
    helmet({
      contentSecurityPolicy: CONTENT_SECURITY_POLICY,
      // HSTS setzt die Edge (Caddyfile) für alle Antworten, auch Caddys eigene Fehler.
      strictTransportSecurity: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xFrameOptions: { action: 'deny' },
    }),
  );
  app.set('trust proxy', TRUSTED_PROXY_HOPS);
  app.setGlobalPrefix(API_PREFIX);
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
}
