# Nest 11 on Express 5: serve-static, helmet and Better-Auth

Research for [How do serve-static, helmet and Better-Auth behave on Nest 11 with Express 5?](https://github.com/florianBieck/lesbarkeitsindex/issues/66) on the map [Map: refactor the frontend from Nuxt 4 to a plain Vue 3 SPA](https://github.com/florianBieck/lesbarkeitsindex/issues/46). It lists facts and trade-offs only. The plan belongs to [How does the backend move from Fastify to Express?](https://github.com/florianBieck/lesbarkeitsindex/issues/67), a grilling ticket.

**Question:** on Nest 11 with `@nestjs/platform-express` (Express 5), at the versions the repo would resolve today, how do `@nestjs/serve-static`, `helmet` and the Better-Auth bridge behave, what do the e2e specs need, and what else in the backend depends on Fastify?

Status as of 2026-10-26. Behaviour marked **(lab)** was checked in throwaway Nest apps outside the repo. Everything else was read from the packages' source at the linked tags, or from the docs named. Lab versions:

- **Express lab:** `@nestjs/common`/`core`/`platform-express`/`testing` 11.2.8, `express` 5.2.1 (Nest's pinned copy) and 5.3.0 (a direct dependency), `router` 2.2.0, `path-to-regexp` 8.4.2, `body-parser` 2.4.0, `serve-static` 2.2.1, `send` 1.2.1, `@nestjs/serve-static` 5.0.5, `helmet` 8.3.0, `supertest` 7.3.1, `@types/express` 5.0.6, `@types/supertest` 7.2.1.
- **Better-Auth:** 1.5.6 (the repo's lock, with `better-call` 1.3.2) and 1.7.12 (with `better-call` 1.4.4), both on Better-Auth's **memory adapter**. No Postgres, no Prisma adapter.
- **Fastify reference** at the repo's lock versions: Nest 11.1.18, `fastify` 5.8.4, Better-Auth 1.5.6. Today's `AuthController` was copied verbatim.
- **Toolchain:** TypeScript 5.9.3 (`NodeNext`, CommonJS output, like the repo), Node 22.23.4 on an arm64 Mac, HTTP/1.1. The e2e check ran under `vite-plus` 1.4.0 (Vitest 5.0.5) with `unplugin-swc` 1.5.9 and `@swc/core` 1.15.24, the repo's lock versions. Installs used pnpm 12.15.0 with its default one-day `minimumReleaseAge` (the repo pins pnpm 11.9.0).
- **Cross-check:** the deterministic probe sets were re-run on `@nestjs/core` 11.1.18 + `platform-express` 11.2.8 (what adding the adapter to today's lock gives) and on everything at 11.1.18. The results were identical **(lab)**.

The method is at the end. Companion research: [NestJS serves the built SPA](https://github.com/florianBieck/lesbarkeitsindex/blob/research/nest-serves-spa/docs/research/2026-10-25-nest-serves-spa.md), the same lab on Fastify.

## The setup this has to fit

- **Serving rules** (decision 2 of [What serves the built SPA in the frontend image?](https://github.com/florianBieck/lesbarkeitsindex/issues/52)):
  - `/assets/*` gets `Cache-Control: public, max-age=31536000, immutable`. A missing asset gets Nest's JSON 404, with no fallback.
  - Every other GET path gets the file if it exists, otherwise `index.html` with 200. Both get `Cache-Control: no-cache` and an ETag, and `If-None-Match` gets a 304.
  - An unknown `/api/*` stays Nest's JSON 404, for HEAD too.
  - A missing `index.html` fails the boot under `NODE_ENV=production`. Otherwise it warns once and skips SPA serving.
- **Headers** (decided in [Which security headers does the site send, and where are they set?](https://github.com/florianBieck/lesbarkeitsindex/issues/62)):
  - `app.use(helmet({...}))` in `configureApp`.
  - The CSP is spelled out with `useDefaults: false`.
  - `hsts: false`, `referrerPolicy: strict-origin-when-cross-origin`, `xFrameOptions: deny`.
  - helmet's other defaults stay.
- **Today on `main` (`7aee54c`):**
  - `main.ts` creates the app with `new FastifyAdapter()`, calls `configureApp(app)`, then `app.listen(3000, '0.0.0.0')`.
  - `configureApp` sets `setGlobalPrefix('api')` and `enableCors({ origin: true, credentials: true })` (ADR 0004).
  - `HealthController` answers `GET /api/health`.
  - `AuthController` is `@Controller('auth')` with `@All('*')` and bridges to a Web `Request`.
  - The three e2e specs that build a Nest app (`api-prefix`, `calculate`, `config`) use `FastifyAdapter` and `app.inject`. `syllables.e2e-spec.ts` calls the R sidecar with `fetch` and doesn't touch Nest.

## Versions the repo would resolve

- **Nest 11 is the `legacy` dist-tag.** `@nestjs/*` `legacy` is 11.2.8 (2026-10-23), and `latest` is 12.2.0 (npm registry).
  - The backend's ranges (`^11.1.0`) resolve 11.2.8. A bare `pnpm add @nestjs/platform-express` would take `latest`, which is Nest 12.
  - The lock has `@nestjs/common`/`core` 11.1.18. Adding `platform-express@^11.1.0` without touching them gives core 11.1.18 next to adapter 11.2.8. That mix behaved like all-11.2.8 **(lab)**.
- **Nest pins its own Express.** `platform-express` 11.2.8 depends on `express` **5.2.1** exactly, plus `cors` 2.8.6, `multer` 2.4.0 and `path-to-regexp` 8.4.2. 11.1.18 pins `express` 5.2.1 too **(lab, `pnpm why`)**. `express` `latest` is 5.3.0 (2026-10-09).
  - **With a direct `express` dependency**, the backend gets 5.3.0, and serve-static's optional `express` peer binds to it. Nest keeps 5.2.1, so there are two copies. Both share `body-parser` 2.4.0, `serve-static` 2.2.1, `send` 1.2.1, `router` 2.2.0 and `path-to-regexp` 8.4.2 **(lab)**.
  - **Without one**, there is one copy (5.2.1), and serve-static's `require('express')` resolves to it through pnpm's hoisted `.pnpm/node_modules` **(lab)**. Backend code then can't `require('express')` (`MODULE_NOT_FOUND`, **lab**). `app.useStaticAssets()` exposes Nest's `express.static` without it (sketch b below).
- **Types:** `NestExpressApplication`'s typings import from `express`, and `platform-express` has no `@types/*` dependency. `import type { Request, Response } from 'express'` therefore needs `@types/express` (5.0.6) as a devDependency. That's types only, and no runtime `express` is needed for it. Nest's TypeScript starter lists `@types/express`, `supertest` and `@types/supertest` as devDependencies ([`nestjs/typescript-starter` `package.json`](https://github.com/nestjs/typescript-starter/blob/master/package.json), now on Nest 12).
- **`@nestjs/serve-static` 5.0.5** (2026-04-09) is the last release for Nest 11 (12.0.0 needs Nest 12). It peers `express ^5.0.1` and depends on `path-to-regexp` 8.4.2.
- **`helmet` 8.3.0** (2026-07-12). **`supertest` 7.3.1** (2026-10-02).
- **Better-Auth:** the lock has 1.5.6. 1.7.13 was published 2026-10-25T15:35Z, under a day before the lab. pnpm's release-age gate therefore resolved `^1.7` to 1.7.12 **(lab)**.

## 1. `@nestjs/serve-static` against the serving rules

### How the Express loader works

From [`lib/loaders/express.loader.ts` at 5.0.5](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/express.loader.ts):

- **Per options entry**, it registers three things on the Express app:
  - `app.use(serveRoot?, express.static(rootPath, serveStaticOptions))` ([L58-L69](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/express.loader.ts#L58-L69)).
  - `app.get(renderPath, renderFn)`. The default `renderPath` is `'{*any}'` ([constants L4](https://github.com/nestjs/serve-static/blob/5.0.5/lib/serve-static.constants.ts#L4)).
  - An error middleware ([L73-L88](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/express.loader.ts#L73-L88)).
- **`renderFn`** ([L32-L45](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/express.loader.ts#L32-L45)):
  - If the request is excluded, it calls `next()`.
  - Otherwise, if there's a `setHeaders`, it calls `setHeaders(res, indexFilePath, fs.statSync(indexFilePath))`.
  - Then `res.sendFile(indexFilePath, null, cb)`. An error in `cb` becomes `new NotFoundException(err.message)` as the body.
- **`exclude` works on Express** (it is ignored on Fastify):
  - `isRouteExcluded` builds `pathToRegexp(path)` with path-to-regexp v8 and tests it against the `originalUrl` pathname plus a trailing `/` ([is-route-excluded.util.ts L5-L11](https://github.com/nestjs/serve-static/blob/5.0.5/lib/utils/is-route-excluded.util.ts#L5-L11)).
- **The error middleware rewrites errors on excluded paths.** If the request is excluded, any error is replaced by `NotFoundException('Cannot <METHOD> <url>')` ([L74-L77](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/express.loader.ts#L74-L77)). See "What bites".
- **`serveStaticOptions`** goes straight to `express.static`, which is `serve-static` 2.2.1. The options that matter here:
  - `maxAge`, `immutable`, `cacheControl`, `etag`, `lastModified`, `setHeaders`, `dotfiles`, `index`, `redirect`, `fallthrough`.
  - `preCompressed` and `decorateReply` in serve-static's options interface are Fastify-only.
  - **`fallthrough` must stay at its default `true` on Express.** With `false`, a missing file becomes `next(err)` instead of reaching `renderFn`, and every non-GET/HEAD gets 405 ([serve-static `index.js` L50, L72-L82](https://github.com/expressjs/serve-static/blob/v2.2.1/index.js#L50)). The Nest recipe's `fallthrough` note is about Fastify only ([serve-static recipe L46](https://github.com/nestjs/docs.nestjs.com/blob/bdefe854568c2f679c45d1d6cea0ac76797a3553/content/recipes/serve-static.md?plain=1#L46)).
- **`setHeaders` gets the Express response on both paths.** That holds for file responses (via `send`'s `headers` event, [serve-static L102](https://github.com/expressjs/serve-static/blob/v2.2.1/index.js#L102)) and for the `index.html` fallback. So the Fastify crash from the companion lab can't happen.
  - `send` emits `headers` before setting its own, and only sets `Cache-Control`, `ETag` and `Last-Modified` when they're still unset ([send `index.js` L739-L766](https://github.com/pillarjs/send/blob/1.2.1/index.js#L739-L766)).
  - So a `Cache-Control` from `setHeaders` wins without `cacheControl: false` **(lab)**.
- **When it registers:** `ServeStaticModule` registers in `onModuleInit` ([serve-static.module.ts L92](https://github.com/nestjs/serve-static/blob/5.0.5/lib/serve-static.module.ts#L92)).
  - `NestApplication.init()` runs the body parsers first, then the routes (`registerRouter`), then `onModuleInit` (`callInitHook`), then the 404 and error handlers (`registerRouterHooks`) ([nest-application.ts L179-L194](https://github.com/nestjs/nest/blob/v11.2.8/packages/core/nest-application.ts#L179-L194)).
  - The Express stack after init **(lab)**: Nest's request-hook middleware, `helmetMiddleware`, `corsMiddleware`, `jsonParser`, `urlencodedParser`, the controller routes, `serveStatic`, the `{*any}` route, serve-static's error middleware, Nest's 404 handler, Nest's error handler.

### Probe results (lab)

The same app was used for every column:

- **Controllers:** `HealthController` at `/api/health`, and a config controller with `GET` (`@Res()`, a `Date` in the body) and `POST` behind a Better-Auth guard.
- **Other routes:** `POST /api/calculate` and `GET /api/boom` (throws).
- **Auth:** an `AuthController` bridge at `/api/auth/*path`.
- **App-wide:** all under `setGlobalPrefix('api')`, with `enableCors` as today and the #62 helmet config first in `configureApp`.
- **Fake Vite `dist/`:** `index.html`, `assets/index-B7xQ2kLm.js` (60 KB), `assets/index-Cd9fR3aZ.css` (13 KB), `favicon.ico`, `robots.txt` and a dotfile `.secret` (the companion lab's layout).

Columns:

- **a0:** the docs' `ServeStaticModule.forRoot({ rootPath })`.
- **a1:** one serve-static entry with `exclude` and `setHeaders` (sketch a).
- **b:** two `express.static` mounts plus a catch-all middleware in `configureApp` (sketch b).

| Request                                                      | Rule                                  | a0, docs default                       | a1, one entry                    | b, static ×2 + catch-all |
| ------------------------------------------------------------ | ------------------------------------- | -------------------------------------- | -------------------------------- | ------------------------ |
| `GET /`                                                      | index, `no-cache`, ETag               | 200, `public, max-age=0`, ETag         | 200 `no-cache`, ETag             | 200 `no-cache`, ETag     |
| `If-None-Match` on `/`                                       | 304                                   | 304                                    | 304                              | 304                      |
| `GET /results`, `/admin`, `/login?x=1`                       | index, 200, `no-cache`, ETag          | 200, `public, max-age=0`, ETag         | 200 `no-cache`, ETag             | 200 `no-cache`, ETag     |
| `If-None-Match` on `/results`                                | 304                                   | 304                                    | 304                              | 304                      |
| `GET /assets/index-<hash>.js` / `.css`                       | `public, max-age=31536000, immutable` | `public, max-age=0`                    | as rule                          | as rule                  |
| `GET /assets/index-OLD.js`                                   | Nest 404, no fallback                 | **200 `index.html`**                   | Nest 404                         | Nest 404                 |
| `GET /favicon.ico`, `/robots.txt`                            | file, `no-cache`                      | file, `max-age=0`                      | as rule                          | as rule                  |
| `GET /.secret` (dotfile in `dist/`)                          | (not in rules)                        | `index.html`                           | `index.html`                     | `index.html`             |
| `GET /assets` (the directory)                                | (not in rules)                        | 301 to `/assets/`                      | 301 to `/assets/`, which 404s    | same as a1               |
| `HEAD /`, `HEAD /results`                                    | 200, no body                          | 200 / 200                              | 200 / 200                        | 200 / 200                |
| `HEAD /assets/index-OLD.js`, `HEAD /api/nope`                | 404                                   | **200** (index)                        | 404 / 404                        | 404 / 404                |
| `POST /foo`                                                  | Nest 404                              | Nest 404                               | Nest 404                         | Nest 404                 |
| `GET /api/nope`, `/api/nope/deeper?x=1`                      | Nest JSON 404                         | **200 `index.html`**                   | Nest 404                         | Nest 404                 |
| `GET /api`, `GET /api/`                                      | Nest 404                              | **200 `index.html`**                   | Nest 404                         | Nest 404                 |
| `GET /API/nope`                                              | Nest 404                              | **200 `index.html`**                   | Nest 404                         | Nest 404                 |
| `GET /apiary`                                                | index                                 | index                                  | index                            | index                    |
| `GET /api/health`, `GET /api/config`, `GET /api/auth/ok`     | controller                            | 200                                    | 200                              | 200                      |
| `POST /api/config` (no session), `GET /api/boom`             | controller                            | 401 / 500                              | 401 / 500                        | 401 / 500                |
| `POST /api/calculate`, malformed JSON                        | 400                                   | (not probed)                           | **404 `Cannot POST …`**          | 400                      |
| `POST /api/calculate`, 200 KB JSON (default 100 KB limit)    | 413                                   | (not probed)                           | **404 `Cannot POST …`**          | 413                      |
| `Range: bytes=0-9` on the js                                 | (not in rules)                        | 206                                    | 206                              | 206                      |

- **Deep links now have validators.** On Express the fallback goes through `res.sendFile`, which is `send`. Deep links get `text/html; charset=utf-8`, `ETag`, `Last-Modified` and 304s in a0, a1 and b. On Fastify, serve-static's fallback streamed the file with none of them (companion lab).
- **The 404 body** for a missing asset or an unknown `/api/*` is Nest's usual `{"message":"Cannot GET /api/nope","error":"Not Found","statusCode":404}` in a1 and b.
- **helmet:** all eleven helmet headers were present on every row, and `X-Powered-By` was absent (section 2).

### `exclude` under path-to-regexp v8 (lab)

| `exclude` entries                                   | `/api/nope`       | `/api`               | `/api/` | `/results` and other fallback paths                |
| --------------------------------------------------- | ----------------- | -------------------- | ------- | -------------------------------------------------- |
| `'/api/{*any}'`, `'/assets/{*any}'`                 | 404               | 404                  | 404     | `index.html`                                       |
| `'/api{/*any}'`, `'/assets{/*any}'`                 | 404               | 404                  | 404     | `index.html`                                       |
| `'/api/*any'`, `'/assets/*any'`                     | 404               | **200 `index.html`** | 404     | `index.html`                                       |
| `'/api/*'`, `'/api*'` or `'/api/(.*)'` (v4/v6 forms) | **500**           | **500**              | **500** | **500** (`PathError [TypeError]: Missing parameter name…` / `Unexpected (…`) |

- **The old spellings boot cleanly and then fail on every request.** `isRouteExcluded` compiles the pattern on each request, inside `renderFn` and the error middleware. With a v4/v6 pattern, every path that reaches the fallback answers 500, `/apiary` included. `/` and real files still work, because `express.static` answers them first.
- **`{*any}` vs `*any`:** in v8, `*name` needs at least one character and `{…}` makes a group optional ([Nest 11 migration guide, Express v5 section](https://github.com/nestjs/docs.nestjs.com/blob/bdefe854568c2f679c45d1d6cea0ac76797a3553/content/migration.md?plain=1#L9-L57)). So only the braced forms exclude `/api` itself.
- **Matching ignores case.** path-to-regexp's default isn't case-sensitive, so `/API/nope` is excluded too.

### What bites with serve-static on Express

- **It rewrites body-parser errors on excluded paths.** Malformed JSON (400) and an oversized body (413) on `POST /api/calculate` both came back as `404 {"message":"Cannot POST /api/calculate"}` **(lab)**.
  - The body parsers run as middleware, so their errors go down the Express error chain.
  - serve-static's error middleware sits before Nest's error handler, and for an excluded path it swaps any error for a `NotFoundException` ([L74-L77](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/express.loader.ts#L74-L77)).
  - Errors thrown inside controllers aren't affected (`GET /api/boom` stayed 500). Nest handles those inside the route.
- **A dot-directory above `rootPath` breaks every deep link.** With `rootPath` under `fixture/.hidden/dist`, `/` and the assets still worked. `/results` returned `404 {"message":"Not Found"}` in a0 and a1 **(lab)**.
  - Cause: `renderFn` calls `res.sendFile(absolutePath, null)` with no `root`. `send` then checks every segment of the absolute path against `dotfiles`, which defaults to `'ignore'` in send 1.x ([send L114, L451, L458](https://github.com/pillarjs/send/blob/1.2.1/index.js#L451-L458); [Express `res.sendFile` L378-L408](https://github.com/expressjs/express/blob/v5.2.1/lib/response.js#L378-L408)).
  - `renderFn` passes `null` options, so serve-static has no setting that fixes this.
  - **This repo's agent worktrees live under `.claude/worktrees/`.** A spec that serves a fixture `dist/` from inside the checkout would fail there and pass in CI (`/home/runner/work/…`) and in Docker (`/app/…`).
  - `res.sendFile('index.html', { root })` only checks the path below `root`, and works there (b, **lab**). `res.sendFile(absolutePath)` in b fails the same way **(lab)**.
- **A missing `index.html` boots silently.** With an empty or non-existent `rootPath`, every SPA path returned `404 {"message":"ENOENT: no such file or directory, stat '<absolute path>/index.html'",…}`, which puts the absolute path in the response body. a0 does it even for `/api/nope` **(lab)**. Nothing was logged at boot. The missing-build rule needs code around `forRoot` (sketch a, **lab**).
- **Module placement.** serve-static is a module in `AppModule.imports`. The e2e specs build their own `Test.createTestingModule({ controllers: [...] })` and wouldn't get SPA serving unless they import the SPA module. b lives in `configureApp`, which every spec already calls.

### b: two static mounts plus a catch-all

- **The catch-all is plain middleware.** It's an `app.use((req, res, next) => …)`, so no path pattern is involved.
  - It skips non-GET/HEAD requests and `/api` and `/assets`, matched case-insensitively.
  - Otherwise it calls `res.sendFile('index.html', { root: SPA_ROOT })`, which brings `ETag`, `Last-Modified` and 304.
  - The skip check ignores case on purpose, because Express routing does too (section 5). With a case-sensitive check, `/API/nope` would get `index.html`, while `/API/config` reaches the controller.
- **Order:** registered in `configureApp` before `init()`, the mounts sit before the body parsers and the controller routes in the stack **(lab)**. Every `GET /api/…` therefore passes two `express.static` lookups (a `stat` each) before reaching Nest. Non-GET/HEAD requests skip them.
  - **After `init()` it wouldn't work.** Mounted after `app.init()`, the middleware lands behind Nest's 404 handler, which ends the response. This was read from the stack order and not probed for b. helmet registered after `init()` shows the effect (section 2).
- **`app.useStaticAssets(path, options)`** is `this.use(options.prefix, express.static(path, options))` with Nest's own Express ([express-adapter.ts L250](https://github.com/nestjs/nest/blob/v11.2.8/packages/platform-express/adapters/express-adapter.ts#L250)). Written with it, b needs no direct `express` dependency. It behaved the same as `express.static` from a direct dependency **(lab)**.
- **`maxAge: '365d'`** yields `max-age=31536000`, while `'1y'` would give 31557600 (companion lab, same `ms` parsing).

### Sketches (lab-tested)

Both were type-checked against the lab's packages and formatted with `vp fmt` under the repo's `singleQuote` setting. They produce the same probe results as columns a1 and b, meet the missing-build rule, and b serves deep links under a dot-directory **(lab)**.

**a: serve-static**, 28 code lines (excluding blanks and comments). It is used as `imports: [..., ...spaImports()]` in `AppModule`:

```ts
// apps/backend/src/spa.module.ts (location TBD)
import { Logger, type DynamicModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { join, sep } from 'node:path';

const SPA_ROOT = process.env.SPA_ROOT ?? join(__dirname, '..', '..', 'frontend', 'dist');
const ASSETS_DIR = join(SPA_ROOT, 'assets') + sep;

/** For AppModule's imports: SPA serving, or nothing when there is no build. */
export function spaImports(): DynamicModule[] {
  const index = join(SPA_ROOT, 'index.html');
  if (!existsSync(index)) {
    if (process.env.NODE_ENV === 'production') throw new Error(`SPA build missing: ${index}`);
    new Logger('Spa').warn(`No SPA build at ${SPA_ROOT}; SPA serving is off`);
    return [];
  }
  return [
    ServeStaticModule.forRoot({
      rootPath: SPA_ROOT,
      // path-to-regexp v8: the braces make the wildcard optional, so /api itself is excluded too
      exclude: ['/api/{*any}', '/assets/{*any}'],
      serveStaticOptions: {
        // called for files and for the index.html fallback, before send sets its own headers
        setHeaders: (res: Response, path: string) =>
          res.setHeader(
            'Cache-Control',
            path.startsWith(ASSETS_DIR) ? 'public, max-age=31536000, immutable' : 'no-cache',
          ),
      },
    }),
  ];
}
```

The check runs when `AppModule`'s decorator is evaluated, so at `import`, before `NestFactory.create`. Under `NODE_ENV=production` the process exits with the thrown error **(lab)**. a still carries the error rewrite and the dot-directory problem above.

**b: `useStaticAssets` ×2 plus a catch-all**, 28 code lines. It is called as `serveSpa(app)` at the end of `configureApp`:

```ts
// apps/backend/src/serve-spa.ts (location TBD)
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const SPA_ROOT = process.env.SPA_ROOT ?? join(__dirname, '..', '..', 'frontend', 'dist');
// Express matches routes case-insensitively (/API/config reaches Nest), so this check does too.
const isApiOrAsset = (path: string) => /^\/(api|assets)(\/|$)/i.test(path);

/** SPA serving; call from configureApp() before app.init(). */
export function serveSpa(app: NestExpressApplication): void {
  const index = join(SPA_ROOT, 'index.html');
  if (!existsSync(index)) {
    if (process.env.NODE_ENV === 'production') throw new Error(`SPA build missing: ${index}`);
    new Logger('Spa').warn(`No SPA build at ${SPA_ROOT}; SPA serving is off`);
    return;
  }
  // useStaticAssets() is Nest's own express.static: no direct "express" dependency needed
  app.useStaticAssets(join(SPA_ROOT, 'assets'), {
    prefix: '/assets',
    immutable: true,
    maxAge: '365d', // '1y' would give max-age=31557600
  });
  app.useStaticAssets(SPA_ROOT, {
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || isApiOrAsset(req.path)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    // "root" keeps send's dotfile check off the parent directories (.claude/worktrees/...)
    res.sendFile('index.html', { root: SPA_ROOT }, (err) => err && next(err));
  });
}
```

Without a build, b logs one warning and every SPA path gets Nest's `Cannot GET /results` 404. Under `NODE_ENV=production` the boot fails **(lab)**. Because it runs inside `configureApp`, each e2e spec without a fixture `dist/` logs that warning once.

| | a: serve-static | b: `useStaticAssets` ×2 + catch-all |
| --- | --- | --- |
| Meets the serving rules **(lab)** | yes, with braced `exclude` | yes |
| Missing-build rule | needs the guard in the sketch | needs the guard in the sketch |
| Body-parser 400/413 on `/api/*` | **rewritten to 404** | kept |
| Deep links below a dot-directory | **404** | work (`root` option) |
| Lives in | `AppModule.imports` | `configureApp` (every spec gets it) |
| New dependencies | `@nestjs/serve-static@^5` | none |

## 2. helmet

- **Registered first in `configureApp`, before `init()`, helmet covers every response type tried** **(lab)**:
  - static files and the `index.html` fallback, for both a and b;
  - 304s;
  - Nest's 404 and 500 JSON, and body-parser's 400 and 413;
  - both Better-Auth bridges, and `toNodeHandler` whether called in the controller or mounted on the Express instance;
  - the CORS preflight (204).
  - Each of these carried all eleven headers below and no `X-Powered-By`.
  - **Why it works:** `app.use()` before `init()` goes straight to the Express app ([nest-application.ts L266](https://github.com/nestjs/nest/blob/v11.2.8/packages/core/nest-application.ts#L266)). helmet sets its headers with `res.setHeader` and calls `next()`, so anything later on that response keeps them unless it removes them. Nothing in these paths removes them.
- **It removes `X-Powered-By`.** Express sets `X-Powered-By: Express` in `app.handle`, before any middleware runs ([application.js L94, L160-L162](https://github.com/expressjs/express/blob/v5.2.1/lib/application.js#L160-L162)). helmet's `xPoweredBy` middleware, on by default, calls `res.removeHeader('X-Powered-By')` ([x-powered-by/index.ts L9](https://github.com/helmetjs/helmet/blob/v8.3.0/middlewares/x-powered-by/index.ts#L9)).
  - Without helmet, every response carries `X-Powered-By: Express` **(lab)**. Today, on Fastify, none does.
  - `app.disable('x-powered-by')` is the alternative (Express source, not tested).
- **Order matters.** helmet registered after `app.init()` sits behind Nest's 404 and error handlers. Every response came back with **0 of 11** headers and `X-Powered-By: Express`, including the SPA files, the controllers and the 404s **(lab)**.
  - Nest's helmet page says the same: helmet "must come before other calls to `app.use()` or setup functions that may call `app.use()`" ([security/helmet.md L5](https://github.com/nestjs/docs.nestjs.com/blob/bdefe854568c2f679c45d1d6cea0ac76797a3553/content/security/helmet.md?plain=1#L5)).
  - In `main.ts` and the specs, `configureApp` runs before `listen()`/`init()`, so helmet first in `configureApp` holds there.
  - A raw handler mounted on the Express instance has to be registered after helmet in the code.
- **The #62 config works as written on helmet 8.3.0** **(lab)**:
  - `hsts: false` is the legacy alias of `strictTransportSecurity`, and passing both throws ([index.ts L187-L193](https://github.com/helmetjs/helmet/blob/v8.3.0/index.ts#L187-L193)).
  - `xFrameOptions` has the alias `frameguard`, which also throws if combined.
  - The CSP header comes out as `default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline';img-src 'self' data:;font-src 'self';connect-src 'self';object-src 'none';base-uri 'none';form-action 'self';frame-ancestors 'none'`. helmet joins directives with `;` and no space.
  - The full set on `/` **(lab)**:
    - the CSP above;
    - `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster: ?1`;
    - `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: off`;
    - `X-Download-Options: noopen`, `X-Frame-Options: DENY`, `X-Permitted-Cross-Domain-Policies: none`, `X-XSS-Protection: 0`.
    - No `Strict-Transport-Security`.
- **`configureApp` stays synchronous:** `helmet()` is plain Express middleware, and nothing in the sketch awaits.

## 3. The Better-Auth bridge

### Variants (lab)

Five shapes, each probed on Better-Auth 1.5.6 and 1.7.12 with a 4-second timeout per request:

- **A, literal port:** today's code with Express types. `reply.header(k, v)` becomes `res.header(k, v)` per header, and the body is still `JSON.stringify(req.body)`.
- **B, cookie-safe port:** like A, but `Set-Cookie` comes from `response.headers.getSetCookie()` and goes out in one `res.setHeader('set-cookie', array)` (sketch below).
- **C:** B, plus `NestFactory.create(..., { rawBody: true })`, passing `req.rawBody` as the body.
- **D:** `return toNodeHandler(auth)(req, res)` inside the `@All` controller, with Nest's body parser on.
- **E:** `app.getHttpAdapter().getInstance().all('/api/auth/*splat', toNodeHandler(auth))` in `configureApp`, before Nest's parsers. This is the layout of Better-Auth's Express docs.

| Check | Fastify today | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- | --- |
| Sign-up / sign-in, JSON (1 `Set-Cookie`) | 200 | 200 | 200 | 200 | 200 | 200 |
| Sign-out: `Set-Cookie` headers sent | 3 | **1** (`dont_remember=` only) | 3 | 3 | 3 | 3 |
| Sign-in, `application/x-www-form-urlencoded` | 400 | 400 | 400 | **200** | 400 on 1.5.6, **200** on 1.7.12 | **200** |
| `get-session` with cookie | 200 | 200 | 200 | 200 | 200 | 200 |
| `get-session` with its own `If-None-Match` | 200 | 304 | 304 | 304 | 200 | 200 |
| `POST /api/config` through the guard, with / without session | 200 / 401 | 200 / 401 | 200 / 401 | 200 / 401 | 200 / 401 | 200 / 401 |
| Any request hung | no | no | no | no | no | no |
| `Content-Type` on Better-Auth JSON | `…; charset=utf-8` | `…; charset=utf-8` | same | same | `application/json` | `application/json` |
| helmet headers | (no helmet) | 11/11 | 11/11 | 11/11 | 11/11 | 11/11 |

- **The literal port drops cookies.**
  - Sign-out answers with three `Set-Cookie` headers: `session_token`, `session_data` and `dont_remember`. Fastify's `reply.header` appends repeated `set-cookie` values, so today all three arrive **(lab)**.
  - Express's `res.header()`/`res.set()` call `setHeader`, which replaces ([response.js L672-L686](https://github.com/expressjs/express/blob/v5.2.1/lib/response.js#L672-L686)). A one-call-per-cookie loop keeps only the last one. The browser would keep `better-auth.session_token` after sign-out. The server-side session is gone, so the cookie no longer authenticates.
  - Responses with one cookie (sign-in, sign-up) are unaffected. `res.append()` ([L636](https://github.com/expressjs/express/blob/v5.2.1/lib/response.js#L636)) or one `setHeader` with an array both keep all three.
- **Nest's body parser and Better-Auth.** Nest registers `express.json()` and `express.urlencoded({ extended: true })` globally in `init()` ([express-adapter.ts L337-L350](https://github.com/nestjs/nest/blob/v11.2.8/packages/platform-express/adapters/express-adapter.ts#L337-L350)), so `req.body` is parsed before any controller.
  - **A and B** re-serialise it as JSON. That's right for JSON bodies and wrong for form bodies, the same as today on Fastify.
  - **`toNodeHandler` inside the controller (D) doesn't hang.**
    - `better-call` 1.3.2 (Better-Auth 1.5.6) uses `req.body` whenever it's set, and always as JSON ([request.ts L136-L151](https://github.com/better-auth/better-call/blob/v1.3.2/packages/better-call/src/adapters/node/request.ts#L136-L151)).
    - 1.4.4 (Better-Auth 1.7.12) reads the raw stream if it's still readable. Otherwise it re-serialises `req.body` as form data for form content types and as JSON for the rest ([request.ts L76-L92, L224-L236](https://github.com/better-auth/better-call/blob/v1.4.4/packages/better-call/src/adapters/node/request.ts#L224-L236)).
  - **Better-Auth's docs:**
    - The Express guide says to mount the handler before body parsers ("Body parsers consume the incoming request stream", 1.7.12; "the client API will get stuck on 'pending'", 1.5.6), and to use `/api/auth/*splat` on Express 5 ([express.mdx L16-L35 at v1.5.6](https://github.com/better-auth/better-auth/blob/v1.5.6/docs/content/docs/integrations/express.mdx?plain=1#L16-L35)).
    - The NestJS guide is "community maintained" (`@thallesp/nestjs-better-auth`) and says `bodyParser: false` ([nestjs.mdx L11, L38 at v1.5.6](https://github.com/better-auth/better-auth/blob/v1.5.6/docs/content/docs/integrations/nestjs.mdx?plain=1#L38)).
    - The lab hit no hang in any shape. JSON is all the frontend's Better-Auth client sends, so the form-body column only matters for clients that post forms.
- **`rawBody: true` (C)** keeps the exact bytes for JSON and urlencoded bodies (`verify` callback, [get-body-parser-options.util.ts](https://github.com/nestjs/nest/blob/v11.2.8/packages/platform-express/adapters/utils/get-body-parser-options.util.ts)). It applies app-wide, so every parsed request also holds a `Buffer`.
- **E bypasses Nest.** Guards, interceptors and filters don't run on `/api/auth/*`, and the handler needs the Better-Auth instance in `configureApp` (`app.get(AuthService)`). The `api-prefix` spec provides `AuthService` as a mock to a controller list, so it would have to change shape.
- **ETags on auth responses.**
  - A, B and C answer through `res.send`, which adds a weak ETag. `get-session` then answers its own `If-None-Match` with 304, even when 1.7.12 sends `Cache-Control: no-store` with it **(lab)**. With `no-store` a browser keeps nothing to revalidate.
  - D and E write with `writeHead`/`write` and send no ETag.
- **The guard** needs only a type change. `getRequest<FastifyRequest>()` becomes `getRequest<Request>()` from `express`, and `request.headers` is the same Node object **(lab: 200 with a session, 401 without)**.
- **Module format.** Better-Auth's Express doc says "CommonJS (cjs) isn't supported". The repo and the lab compile to CommonJS, and both Better-Auth versions loaded through Node 22's `require(esm)` **(lab)**. The adapter move doesn't change this.

### Does `@All('*')` still match? (lab)

| `@All(…)` | Boot log | `/api/auth/ok`, `/api/auth/a/b/c` | `/api/auth/` | `/api/auth` |
| --- | --- | --- | --- | --- |
| `'*'` (today) | **`WARN [LegacyRouteConverter] Unsupported route path: "/api/auth/*"…`**, then `Mapped {/api/auth/*, ALL}` | reaches Better-Auth | reaches Better-Auth | Nest 404 |
| `'*path'` / `'*splat'` | `Mapped {/api/auth/*path, ALL}` (or `*splat`), no warning | reaches Better-Auth | Nest 404 | Nest 404 |
| `'{*path}'` | `Mapped {/api/auth/{*path}, ALL}`, no warning | reaches Better-Auth | reaches Better-Auth | Nest 404 |

- **`'*'` still matches, through Nest's converter.** `LegacyRouteConverter.tryConvert` rewrites a trailing `/*` to `/{*path}` and logs the warning on every boot, and in every spec that maps the controller ([legacy-route-converter.ts L43-L47](https://github.com/nestjs/nest/blob/v11.2.8/packages/core/router/legacy-route-converter.ts#L43-L47)).
  - The Nest 11 migration guide calls it "automatically converted… no longer advisable" and shows `*splat` ([migration.md L15-L41](https://github.com/nestjs/docs.nestjs.com/blob/bdefe854568c2f679c45d1d6cea0ac76797a3553/content/migration.md?plain=1#L15-L41)).
  - The same warning showed on core 11.1.18 **(lab)**.
- **The controller sees the full URL.** Inside a Nest route, `req.url` is still `/api/auth/get-session` (routes, unlike `app.use` mounts, don't strip a prefix). The ported `api-prefix` spec checks this **(lab)**.
- **`/api/authx`** was a Nest 404 for every spelling.

### Bridge sketch (B, lab-tested)

25 code lines. It gave the same probe results as variant B **(lab)**:

```ts
// apps/backend/src/auth/auth.controller.ts
import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    const url = new URL(req.url, `http://${req.hostname}`);
    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers: fromNodeHeaders(req.headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const response = await this.authService.auth.handler(webRequest);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie') res.setHeader(key, value);
    });
    // res.header()/res.set() replace: one call per cookie would keep only the last one
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) res.setHeader('set-cookie', cookies);
    res.send(await response.text());
  }
}
```

The type-only `Request` import from `express` shadows the global `Request` for types only. `new Request(...)` still constructs the Web `Request`, which `tsc` accepts **(lab)**.

## 4. e2e transport

- **What the Nest docs use:** on Express, `request(app.getHttpServer())` from supertest after `app.init()`. The Fastify hint uses `app.inject` ([fundamentals/unit-testing.md L208-L235, L285-L301](https://github.com/nestjs/docs.nestjs.com/blob/bdefe854568c2f679c45d1d6cea0ac76797a3553/content/fundamentals/unit-testing.md?plain=1#L208-L235)). `NestExpressApplication` has no `inject`.
- **The `api-prefix` spec was ported both ways and run under the repo's runner.** That's `vp test run --config vitest.e2e.config.ts` with the repo's config file copied verbatim. **All 8 tests passed (4 with supertest, 4 with `fetch`)**, plus one `getUrl()` check **(lab)**.
  - **supertest:** `app.init()` only, and supertest starts its own ephemeral listener.
    - `res.body` is parsed JSON, and `res.headers['set-cookie']` is an array.
    - `.set('Origin', 'http://localhost:3001')` works for the CORS test.
    - It needs `supertest` and `@types/supertest` as devDependencies.
  - **Native `fetch`:** `await app.listen(0, '127.0.0.1')` plus `await app.getUrl()` gave `http://127.0.0.1:<port>`. `listen(0)` with no host gave `http://[::1]:<port>`, which `fetch` also reached.
    - Node's `fetch` lets the spec set `Origin`, and `res.headers.getSetCookie()` returned both cookies.
    - `app.close()` returned without waiting on the keep-alive sockets (0 ms). The Express adapter's `close()` calls `httpServer.close()` ([express-adapter.ts](https://github.com/nestjs/nest/blob/v11.2.8/packages/platform-express/adapters/express-adapter.ts)), and Node 19+ closes idle connections on `server.close()` ([Node 22 `http` docs](https://nodejs.org/docs/latest-v22.x/api/http.html#serverclosecallback)).
    - No new dependencies. Each suite binds a real loopback port.
- **What changes in the three specs** (from reading them):
  - `new FastifyAdapter()` and `NestFastifyApplication` become `createNestApplication<NestExpressApplication>()`.
  - `app.getHttpAdapter().getInstance().ready()` is Fastify-only and goes away.
  - `app.inject({ method, url, payload })` becomes either `request(server).post(url).send(payload)` or `fetch(url, { method, headers, body: JSON.stringify(payload) })`.
  - `res.statusCode` becomes `res.status`, and `res.json<T>()` becomes `res.body` (supertest) or `await res.json()` (`fetch`).

## 5. What else types against Fastify or relies on it

### Code that names Fastify (`git grep -i fastify` on `main`)

- `apps/backend/package.json`: `@nestjs/platform-fastify`, `fastify`.
- `src/main.ts` (`FastifyAdapter`, `NestFastifyApplication`, `seedData`'s parameter type) and `src/configure-app.ts` (`NestFastifyApplication`).
- The `@Res()` controllers: `src/auth/auth.controller.ts` (`FastifyRequest`/`FastifyReply`), `src/config/config.controller.ts` and `src/calculate/calculate.controller.ts` (`FastifyReply`).
  - Their calls `reply.status(...).send(...)` and `reply.send(...)` exist with the same meaning on Express's `Response`, so only the types change **(lab)**.
  - `reply.status(404).send()` becomes `res.status(404).send()`: 404, `Content-Length: 0`, on both **(lab)**.
  - `@HttpCode(200)` with `@Res()` still gives 200 on POST, because Nest sets the status before the handler runs **(lab)**.
- `src/auth/auth.guard.ts` (`FastifyRequest`, type only).
- `src/serialize.ts`: its comment says Fastify serialises `Date` to ISO strings. Express's `res.send(object)` is `JSON.stringify` too: `createdAt` came out as `"2026-01-01T00:00:00.000Z"` and a `toJSON()` Decimal stand-in as `"12.5"` on both **(lab)**. So `toJsonNumbers` is still needed, and only the comment mentions Fastify.
- The three e2e specs (section 4).
- Docs: `CLAUDE.md` (lines 3, 14, 33 and the "wildcard Fastify controller" gotcha at 177) and `README.md` (lines 7, 51). Nothing in `Dockerfile.backend`, the `Caddyfile`, `.github/`, `knip.config.ts` or `docs/adr/` names Fastify or Express.

### Behaviour that changes with the adapter (lab, same app on both)

| Request | Fastify today (11.1.18 / 5.8.4) | Express (11.2.8 / 5.2.1) |
| --- | --- | --- |
| `GET /api/health` (controller returns a string) | `text/plain; charset=utf-8` | **`text/html; charset=utf-8`**: Nest's Express `reply()` does `res.send(String(body))` ([L158](https://github.com/nestjs/nest/blob/v11.2.8/packages/platform-express/adapters/express-adapter.ts#L158)) |
| `GET /api/health/` (trailing slash) | 404 | **200**: the router isn't `strict` |
| `GET /API/HEALTH` | 404 | **200**: routing ignores case |
| ETag on JSON and text responses | none | **weak `ETag` on every `res.send`/`res.json`**, and `If-None-Match` gets **304** (`etag: 'weak'` default, [application.js L95](https://github.com/expressjs/express/blob/v5.2.1/lib/application.js#L95), [response.js L169-L199](https://github.com/expressjs/express/blob/v5.2.1/lib/response.js#L169-L199)) |
| `POST /api/calculate`, 100,000 `Ä` (200 KB JSON) | 200 | **413 `request entity too large`**: body-parser defaults to `'100kb'` ([README L105-L110](https://github.com/expressjs/body-parser/blob/v2.4.0/README.md?plain=1#L105-L110)), Fastify to 1 MiB ([Server.md L292-L295](https://github.com/fastify/fastify/blob/v5.8.4/docs/Reference/Server.md?plain=1#L292-L295)) |
| …same, with `app.useBodyParser('json', { limit: '1mb' })` in `configureApp` | | 200 |
| `POST` with no `Content-Type` | **415** | body `undefined`, handler runs (422 here) |
| `POST` with `text/plain` | parsed to a string (422 here) | body `undefined` (422 here) |
| `POST` with an empty JSON body | 400 `Body cannot be empty…` | body `{}`, handler runs (422 here) |
| `POST` with malformed JSON | 400 (`Body is not valid JSON…`) | 400 (`Unexpected end of JSON input`) |
| Form-urlencoded `POST` | parsed | parsed |
| Unknown route, thrown `Error` | same JSON 404 / 500 bodies | same |
| `X-Powered-By` without helmet | none | `Express` |

- **The body limit.**
  - The calculate schema allows `text` up to 100,000 characters, and the frontend sets no length cap of its own (a `git grep` for `maxlength`/`100000` in `apps/frontend/app` and `packages/api-client/src` found none). Umlauts and `ß` take 2 bytes in UTF-8, so a long German text can pass the schema and still exceed 100 KB on Express.
  - Nest documents `app.useBodyParser('json', { limit: '10mb' })` for this ([faq/raw-body.md L50-L56](https://github.com/nestjs/docs.nestjs.com/blob/bdefe854568c2f679c45d1d6cea0ac76797a3553/content/faq/raw-body.md?plain=1#L50-L56)).
  - Called in `configureApp` before `init()`, it registers a `jsonParser`. Nest's own registration then skips its default JSON parser (`isMiddlewareApplied('jsonParser')`, [express-adapter.ts L337-L350, L554](https://github.com/nestjs/nest/blob/v11.2.8/packages/platform-express/adapters/express-adapter.ts#L554)). The stack showed one `jsonParser` **(lab)**.
  - Under serve-static's `exclude`, a 413 still comes back as 404 (section 1).
- **Unsupported content types.** Fastify rejects them with `FST_ERR_CTP_INVALID_MEDIA_TYPE` (415, [ContentTypeParser.md L8](https://github.com/fastify/fastify/blob/v5.8.4/docs/Reference/ContentTypeParser.md?plain=1#L8)). Express hands the controller `undefined`. Both controllers run `safeParse` on `body: unknown` and answer 422.
- **Query strings:** Express 5 parses them with the `simple` parser, not `qs` ([application.js L97](https://github.com/expressjs/express/blob/v5.2.1/lib/application.js#L97); [migration.md L63-L81](https://github.com/nestjs/docs.nestjs.com/blob/bdefe854568c2f679c45d1d6cea0ac76797a3553/content/migration.md?plain=1#L63-L81)). `ResultsController` reads only `page` and `limit` as strings. Not probed.
- **Unchanged:** `app.listen(3000, '0.0.0.0')`, `enableCors` (the `cors` package; preflight 204 with helmet headers, **lab**), `getSession({ headers: fromNodeHeaders(req.headers) })`, and the 404/500 JSON shapes.

## Things that bite (summary)

- **serve-static on Express:**
  - The braced `exclude` forms (`/api/{*any}`) work. v4/v6 spellings boot and then answer 500 on every fallback path **(lab)**.
  - On excluded paths it rewrites body-parser 400/413 to 404 **(lab)**.
  - Deep links 404 when any directory above `rootPath` starts with a dot, as `.claude/worktrees/` does **(lab)**.
  - A missing `index.html` boots silently and puts the absolute path in 404 bodies **(lab)**.
- **helmet** has to be the first `app.use` before `init()`. After `init()` it covers nothing **(lab)**.
- **The literal Better-Auth port** loses two of the three sign-out cookies **(lab)**.
- **`@All('*')`** works, but logs a `LegacyRouteConverter` warning on every boot. `*path`/`*splat` don't **(lab)**.
- **Express defaults that differ from Fastify's:**
  - a 100 KB JSON limit (413);
  - weak ETags and 304s on API responses;
  - `text/html` for string returns;
  - case-insensitive, non-strict routing;
  - `undefined` bodies instead of 415/400 **(lab)**.
- **Two copies of `express`** come with a direct `express` dependency (5.3.0 next to Nest's pinned 5.2.1). `useStaticAssets` avoids needing one **(lab)**.

## Open uncertainties

- **Database:** Better-Auth ran on its memory adapter. The Prisma/Postgres adapter, the seed (`auth.api.createUser`) and real cookie attributes behind Caddy weren't exercised.
- **SPA build:** the Vue SPA and its real `dist/` don't exist yet. The fake layout is the companion lab's.
- **Platform:** the lab ran on macOS with Node 22.23.4 over HTTP/1.1. The `node:22-alpine` image and the Caddy edge weren't involved.
- **Compression:** not re-tested on Express. The edge compresses since `cc06dbe`.
- **Not probed:**
  - b mounted after `init()` (inferred from the stack order);
  - `app.disable('x-powered-by')`;
  - the `simple` query parser;
  - a0 for the body-parser rows.
- **Nest 12** (`@nestjs/serve-static` 12, Express-adapter changes) wasn't tested. Neither was Better-Auth 1.7.13, which was under a day old.
- **knip** wasn't run against either sketch.
- **Specs:** only `api-prefix` was ported and run. `calculate` and `config` were read, not ported.

## Method

The lab files are in the session scratchpad, not in the repo. The steps:

- **Express lab:** a standalone pnpm project added the packages with the repo's ranges (`@nestjs/*@^11.1.0`, `@nestjs/serve-static@^5`, `helmet@^8`, `express@^5`, `supertest@^7`, `@types/express@^5`, `@types/supertest@^7`). Better-Auth 1.5.6 sat next to an alias `better-auth-latest` → `^1.7` (resolved 1.7.12). pnpm's release-age gate chose the versions listed at the top. It was compiled with `tsc` 5.9.3 using the repo's `tsconfig` options (`NodeNext`, decorators, CommonJS output).
- **The app:** one Nest app whose variants were picked by environment variables:
  - SPA approach a0, a1 (with `SS_EXCLUDE` spellings), a1 with the missing-build guard, b with `express.static` from a direct dependency or with `useStaticAssets`;
  - Better-Auth bridge A–E and the `@All` spelling;
  - helmet before `init()`, after it, or absent;
  - the Better-Auth version;
  - `SPA_ROOT` (normal, below a `.hidden/` directory, empty, non-existent) and `NODE_ENV`.
- **The probe runner:** a Node script booted each variant, waited for its ready line, and sent raw `http.request` calls with no agent reuse. Per request it printed status, `Content-Type`, `Cache-Control`, `ETag`/`Last-Modified` presence, the count of the eleven helmet headers, `X-Powered-By`, `Strict-Transport-Security`, the `Set-Cookie` names and the body prefix.
  - Probe sets: SPA rules; headers by response type; Better-Auth (sign-up, sign-in as JSON and as a form, `get-session` with and without `If-None-Match`, the guarded POST, sign-out with and without a body, wildcard paths); backend behaviour (body sizes and content types, trailing slash, case, ETags, `@Res()` 404, thrown errors).
  - The Express stack was dumped from `app.getHttpAdapter().getInstance().router.stack` after `init()`.
- **Fastify reference:** a second project pinned the repo's lock versions and ran today's `AuthController` verbatim, under the same probe sets.
- **Version cross-check:** two more projects ran the compiled lab on core 11.1.18 + `platform-express` 11.2.8 and on all-11.1.18. A fourth had no direct `express` dependency. The deterministic probe outputs were `diff`ed against the 11.2.8 lab.
- **Sketches:** written repo-shaped, formatted with `vp fmt` (`singleQuote: true`), type-checked, and booted with the lab's other controllers. Their probe outputs were `diff`ed against a1 and b.
- **e2e:** the ported `api-prefix` spec ran with `vite-plus` 1.4.0, `unplugin-swc` 1.5.9 and `@swc/core` 1.15.24, using the repo's `vitest.e2e.config.ts` copied verbatim.
- **Sources:**
  - npm registry metadata, read 2026-10-25/26.
  - Upstream source at the linked tags: `nestjs/nest` v11.2.8, `nestjs/serve-static` 5.0.5, `expressjs/express` v5.2.1, `pillarjs/send` 1.2.1, `expressjs/serve-static` v2.2.1, `expressjs/body-parser` v2.4.0, `helmetjs/helmet` v8.3.0, `better-auth/better-call` v1.3.2 and v1.4.4, `better-auth/better-auth` v1.5.6 (docs diffed against v1.7.12), `fastify/fastify` v5.8.4 docs. The installed `dist/` files were read too.
  - Nest docs source at `nestjs/docs.nestjs.com@bdefe85`, the last commit of the Nest 11 migration guide. `master` now carries the Nest 12 guide.
  - This repo at `7aee54c`: `apps/backend/**`, `vite.config.ts`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `git grep -i fastify`.
