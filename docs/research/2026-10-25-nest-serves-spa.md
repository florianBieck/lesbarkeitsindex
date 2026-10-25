# NestJS serves the built SPA (no frontend container)

Research for [#52](https://github.com/florianBieck/lesbarkeitsindex/issues/52) on the map [#46](https://github.com/florianBieck/lesbarkeitsindex/issues/46). It lists facts and trade-offs only. The decision belongs to #52, a grilling ticket.

**Question:** what does it take, and what breaks, if the frontend container goes away and the NestJS/Fastify backend serves the built Vue SPA (`apps/frontend/dist/`) itself, under the serving rules already decided in #52?

Status as of 2026-10-25. Behaviour marked **(lab)** was checked in a throwaway Nest app with the repo's versions (Nest 11.1.18, `@nestjs/platform-fastify` 11.1.18, Fastify 5.8.4 with `find-my-way` 9.5.0, `@fastify/static` 9.0.0 with `@fastify/send` 4.1.0) on an arm64 Mac (Node 22.23.4). Compression and `Via` were also probed through a `caddy:2-alpine` (v2.11.7) edge in Docker 29.9.2. The method is at the end. Companion research: [static file servers for the frontend image](https://github.com/florianBieck/lesbarkeitsindex/blob/research/static-file-server/docs/research/2026-10-24-static-file-server.md) (#49), which holds the edge-Caddy facts this doc reuses.

## The setup this has to fit

- **Serving rules (decided in #52):**
  - `/assets/*` (Vite-hashed) gets `Cache-Control: public, max-age=31536000, immutable`, and a missing file gets a plain 404 with no fallback.
  - Every other path serves the file if it exists (`index.html`, `favicon.ico`, `robots.txt`), else `index.html` with 200.
  - All non-asset responses get `Cache-Control: no-cache` and revalidate via ETag.
- **Routing (decided in #50, PR 1 not yet on `main`):** `app.setGlobalPrefix('api', { exclude: [{ path: '/', method: RequestMethod.GET }] })`. The health check stays at `GET /`. `AuthController` becomes `@Controller('auth')` with `@All('*')`, so Better-Auth sits at `/api/auth/*`.
- **Same-origin (decided in #51):** dev runs `vp dev` and CI e2e runs `vp preview`, both proxying `/api` to :3000. CORS leaves `configureApp` in PR 2. Neither depends on who serves `dist/` in prod.
- **Today on `main`:**
  - `main.ts` registers no static plugin, no `@fastify/compress` and no global prefix, and calls `app.listen(3000, '0.0.0.0')`.
  - `HealthController` answers `GET /` with `Hello World`.
  - The repo has no global guard, interceptor, filter or middleware. `AuthGuard` is applied per route (`POST /config`).
- **Prod:** an edge `caddy:2-alpine` with a mounted `Caddyfile` proxies to `frontend:3000` (Nuxt/Nitro) and `backend:3000`. The host is arm64. `build.yml` builds one image per changed service, natively on `ubuntu-24.04-arm`.

## Versions and what pulls in `@fastify/static`

- **`@fastify/static` 9.0.0 is in `pnpm-lock.yaml` only as the optional peer of `@nestjs/platform-fastify`.**
  - `platform-fastify` 11.1.18 declares `"@fastify/static": "^8.0.0 || ^9.0.0"` under `peerDependencies`, marked optional. The lock resolves it to 9.0.0 (`optional: true`), and nothing else depends on it.
  - It was a direct backend dependency (for Swagger UI) until `f319256` ("Removed Swagger…", 2026-06-24) dropped it from `apps/backend/package.json`. The peer resolution stayed in the lock.
  - **(lab, repo install)** `require.resolve('@fastify/static')` from `apps/backend` gives `MODULE_NOT_FOUND`. From `platform-fastify`'s directory it resolves to the 9.0.0 copy.
  - So `app.useStaticAssets()` would load today without a `package.json` change, because it requires the package from `platform-fastify`. Importing the plugin or its `reply.sendFile` types from backend code would not resolve.
- **Nest 12 is out.** `@nestjs/core` `latest` is 12.2.0 (12.0.0 shipped 2026-08-27), and `legacy` is 11.2.8 (npm registry).
  - `@nestjs/serve-static` 5.0.5 (2026-04-09) is the last release for Nest 11. It peers `@nestjs/common`/`core` `^11.0.2`, `fastify ^5.2.1` and `@fastify/static ^8.0.4 || ^9.0.0` (all optional except Nest).
  - `@nestjs/serve-static` 12.0.0 needs Nest 12 and `@fastify/static ^10`. `platform-fastify` 12.2.0 peers `@fastify/static ^10.1.2`.
  - `@fastify/static` latest is 10.1.7, and the newest 9.x is 9.3.0.
- **`@fastify/compress`:** latest 9.2.2 (2026-10-13), a `fastify-plugin` for `fastify: '5.x'`. Not in the repo today.

## Approaches

|                                                  | (a) `@nestjs/serve-static`                                                                                                                                             | (b1) `@fastify/static` ×2 + catch-all route                                                                                                                             | (b2) `@fastify/static` ×1 + Nest exception filter                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanism                                        | `ServeStaticModule.forRoot(...)` registers `@fastify/static` per entry (forced `wildcard: false`) plus a Fastify `GET` route on `renderPath` that streams `index.html` | One wildcard registration for `/assets/`, one non-wildcard registration for root files, and a Fastify `GET /*` that sends `index.html` (or `callNotFound()` for `/api`) | One wildcard registration for all of `dist/`. Missing files fall through to Nest's 404 handler, where a `@Catch(NotFoundException)` global filter sends `index.html` for page requests |
| Meets the #52 rules **(lab)**                    | **No**, not even with three entries (see below)                                                                                                                        | **Yes**                                                                                                                                                                 | **Yes**, once `dotfiles: 'ignore'` is set                                                                                                                                              |
| Code lines, excl. blanks and comments            | 28 after `vp fmt` (21 unwrapped), +1 in `AppModule.imports`                                                                                                            | 31 after `vp fmt` (26 unwrapped), +1 call in `main.ts`                                                                                                                  | 33 after `vp fmt` (28 unwrapped), +1 call in `main.ts`                                                                                                                                 |
| New dependencies                                 | `@nestjs/serve-static@5`, `@fastify/static@^9`                                                                                                                         | `@fastify/static@^9`                                                                                                                                                    | `@fastify/static@^9` (for the `sendFile` types; at runtime it already loads through `platform-fastify`)                                                                                |
| Validators on deep links                         | none: the fallback is a raw `fs.createReadStream`, so no ETag, no Last-Modified, no 304                                                                                | ETag + Last-Modified, 304                                                                                                                                               | ETag + Last-Modified, 304                                                                                                                                                              |
| 404 body for a missing asset or unknown `/api/*` | serve-static's `{"message":"Not Found","statusCode":404}`                                                                                                              | Nest's usual `{"message":"Cannot GET /assets/index-OLD.js","error":"Not Found","statusCode":404}`                                                                       | same as b1                                                                                                                                                                             |

All three are JSON 404s (`application/json`). None sends `text/plain` unless the route or filter is changed to.

### Probe results (lab)

Same app for every column: `HealthController` at `/api/health`, a config controller (`GET`, plus `POST` behind a fake guard), and an `AuthController` copied from the repo (`@Controller('auth')`, `@All('*')`, Web `Response` → `reply.send`), all under `setGlobalPrefix('api')`. Fake Vite `dist/`: `index.html`, `assets/index-B7xQ2kLm.js` (60 KB), `assets/index-Cd9fR3aZ.css` (13 KB), `favicon.ico`, `robots.txt`, plus a dotfile `.secret`. "a, 1 entry" is serve-static with `fallthrough: true`, `cacheControl: false`, `setHeaders` and `exclude: ['/api/{*any}']`. "a, 3 entries" is the sketch below.

| Request                                            | Rule                                  | a, docs default          | a, 1 entry                                | a, 3 entries                              | b1                  | b2                                                                            |
| -------------------------------------------------- | ------------------------------------- | ------------------------ | ----------------------------------------- | ----------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `GET /`                                            | index, `no-cache`, ETag               | 200, `public, max-age=0` | 200 `no-cache` ETag                       | 200 `no-cache` ETag                       | 200 `no-cache` ETag | 200 `no-cache` ETag                                                           |
| `GET /results`, `/admin`, `/login?x=1`             | index, 200, `no-cache`, ETag          | **404 JSON**             | 200 `text/html` (no charset), **no ETag** | 200 `text/html` (no charset), **no ETag** | 200, ETag           | 200, ETag                                                                     |
| `If-None-Match` on `/results`                      | 304                                   | n/a                      | **200, full body**                        | **200, full body**                        | 304                 | 304                                                                           |
| `GET /assets/index-<hash>.js` / `.css`             | `public, max-age=31536000, immutable` | `public, max-age=0`      | as rule                                   | as rule                                   | as rule             | as rule                                                                       |
| `GET /assets/index-OLD.js`                         | 404, no fallback                      | 404 JSON                 | **200 `index.html`**                      | 404 JSON                                  | 404 JSON            | 404 JSON                                                                      |
| `GET /favicon.ico`, `/robots.txt`                  | file, `no-cache`                      | file, `max-age=0`        | as rule                                   | as rule                                   | as rule             | as rule                                                                       |
| `GET /.secret` (dotfile in `dist/`)                | (not in rules)                        | 404                      | `index.html`                              | `index.html`                              | `index.html`        | **served** with the default `dotfiles: 'allow'`; `index.html` with `'ignore'` |
| `HEAD /`, `HEAD /results`                          | 200, no body                          | 200 / 404                | 200 / 200                                 | 200 / 200                                 | 200 / 200           | 200 / 200                                                                     |
| `POST /foo`                                        | Nest 404                              | Nest 404                 | Nest 404                                  | Nest 404                                  | Nest 404            | Nest 404                                                                      |
| `GET /api/nope`                                    | Nest JSON 404, never `index.html`     | 404 (serve-static JSON)  | **200 `index.html`**                      | 404 (serve-static JSON)                   | Nest 404            | Nest 404                                                                      |
| `GET /api`                                         | 404                                   | 404                      | **200 `index.html`**                      | **200 `index.html`**                      | Nest 404            | Nest 404                                                                      |
| `GET /api/config`, `POST /api/config` (no session) | controller                            | 200 / 401                | 200 / 401                                 | 200 / 401                                 | 200 / 401           | 200 / 401                                                                     |
| `GET` and `POST /api/auth/*`                       | Better-Auth controller                | 200                      | 200                                       | 200                                       | 200                 | 200                                                                           |
| `Range: bytes=0-9` on the js                       | (not in rules)                        | 206                      | 206                                       | 206                                       | 206                 | 206                                                                           |

ETags are weak, `W/"<size hex>-<mtime hex>"`, from `@fastify/send`. Files under `dist/` therefore get new ETags whenever a rebuild changes their mtime.

### (a) `@nestjs/serve-static`

How the Fastify loader works (`lib/loaders/fastify.loader.ts` at [5.0.5](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts)):

- **Registration:** for each options entry it calls `app.register(fastifyStatic, { root: rootPath, ...serveStaticOptions, wildcard: false, prefix: serveRoot })`. `wildcard: false` is forced ([L71](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts#L71), [L85](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts#L85)). It then adds a Fastify `GET` route at `serveRoot + renderPath` ([L80](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts#L80), [L87](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts#L87)). The default `renderPath` is `'*'` ([constants L5](https://github.com/nestjs/serve-static/blob/5.0.5/lib/serve-static.constants.ts#L5)).
- **`rootPath`** (default `"client"`) is the `@fastify/static` root, and the fallback file is `join(rootPath, 'index.html')`. **`serveRoot`** becomes the `@fastify/static` `prefix`. **`useGlobalPrefix: true`** prepends the Nest global prefix to `serveRoot`.
- **`serveStaticOptions`** is spread into the `@fastify/static` options, so options missing from its TypeScript type, such as `globIgnore`, still work at runtime with a cast.
- **The fallback route (`renderFn`)** answers 404 unless `serveStaticOptions.fallthrough` is true ([L44](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts#L44)). With `fallthrough`, it calls `setHeaders(res, indexFilePath, stat)` with **the Fastify reply** ([L60](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts#L60)) and sends `fs.createReadStream(index.html)` as `text/html` ([L63](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/fastify.loader.ts#L63)). The Nest docs say the same: "With the Fastify adapter, set `serveStaticOptions.fallthrough` to `true`… to send `index.html` instead of a 404" ([serve-static recipe](https://github.com/nestjs/docs.nestjs.com/blob/master/content/recipes/serve-static.md)).
- **`exclude` is ignored on Fastify.** Only the Express loader calls `isRouteExcluded` ([express.loader.ts L33](https://github.com/nestjs/serve-static/blob/5.0.5/lib/loaders/express.loader.ts#L33)).
  - The [README](https://github.com/nestjs/serve-static/blob/5.0.5/README.md) says `exclude` is "Not supported by `fastify`… you can exclude routes using regexp (set the `renderPath` to a regular expression) instead". The same table says of `renderPath`: "`RegExp` is not supported by the `@nestjs/platform-fastify`".
  - **(lab)** With `exclude: ['/api/{*any}']`, `GET /api/nope` returns `index.html` with 200.
- 12.0.0's Fastify loader has the same `fallthrough`, `setHeaders(res, …)` and `wildcard: false` code (checked at tag [12.0.0](https://github.com/nestjs/serve-static/blob/12.0.0/lib/loaders/fastify.loader.ts)).

Findings **(lab)**:

- **The docs' minimal setup** (`ServeStaticModule.forRoot({ rootPath })`) returns 404 JSON for every deep link and `public, max-age=0` everywhere.
- **A Node-style `setHeaders` crashes the process.** `@fastify/static` calls `setHeaders` with the raw `ServerResponse`, so a callback written as `res.setHeader(...)` works on file routes. On the fallback path, `renderFn` passes the Fastify reply instead, which has no `setHeader`. serve-static types the argument as `any`.
  - The first deep link (`GET /results`) threw `TypeError: res.setHeader is not a function` inside the `fs.stat` callback.
  - Nothing catches it, so Node exited. Every later request got a connection error.
  - The sketch's `noCache` helper handles both object shapes.
- **One entry can't scope the fallback.** The single `*` route also catches missing assets and unknown `GET /api/*`.
- **Three entries come closest** (sketch). `/assets` gets its own entry, whose `serveRoot + '*'` route 404s because that entry has no `fallthrough`. A dummy `/api` entry does the same for `/api/*`. What still misses the rules:
  - The deep-link fallback has no ETag or Last-Modified, so it never answers 304.
  - Deep links get `Content-Type: text/html` without a charset (files get `text/html; charset=utf-8`).
  - `GET /api` (no trailing slash) returns `index.html`.
  - Its 404s use serve-static's body, not Nest's.
  - It needs `as object` casts for `globIgnore`, and `decorateReply: false` on two entries. Otherwise Fastify throws `FST_ERR_DEC_ALREADY_PRESENT`.
- **Boot order:** the module registers in `onModuleInit`, after Nest has mapped the controllers.

Sketch (lab-tested; `vp fmt` only re-wrapped lines):

```ts
// apps/backend/src/spa.module.ts (location TBD), then imports: [spaModule] in AppModule
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';

const SPA_ROOT = process.env.SPA_ROOT ?? join(__dirname, '..', '..', 'frontend', 'dist');
// The fallback hands setHeaders the Fastify reply, the file routes the raw ServerResponse.
const noCache = (res: { setHeader?: Function; header?: Function }) =>
  res.setHeader
    ? res.setHeader('Cache-Control', 'no-cache')
    : res.header?.('Cache-Control', 'no-cache');

export const spaModule = ServeStaticModule.forRoot(
  {
    rootPath: join(SPA_ROOT, 'assets'),
    serveRoot: '/assets',
    serveStaticOptions: { maxAge: 31536000000, immutable: true, decorateReply: false },
  },
  {
    // only here to keep GET /api/* out of the fallback
    rootPath: SPA_ROOT,
    serveRoot: '/api',
    serveStaticOptions: { decorateReply: false, globIgnore: ['**'] } as object,
  },
  {
    rootPath: SPA_ROOT,
    serveStaticOptions: {
      fallthrough: true,
      cacheControl: false,
      setHeaders: noCache,
      globIgnore: ['assets/**'],
    } as object,
  },
);
```

### (b) `@fastify/static` registered directly

Facts:

- **`useStaticAssets` is a thin wrapper.** Nest's `app.useStaticAssets(options)` is `this.register(loadPackage('@fastify/static'), options)` with no defaults of its own ([fastify-adapter.ts L558 at v11.1.18](https://github.com/nestjs/nest/blob/v11.1.18/packages/platform-fastify/adapters/fastify-adapter.ts#L558)). Its options type is Nest's own copy of `FastifyStaticOptions`, which lacks `globIgnore`. **(lab)** `tsc` rejects it there. `app.register(fastifyStatic, …)` uses the plugin's own types, which include it.
- **`wildcard`** ([README](https://github.com/fastify/fastify-static/blob/v9.0.0/README.md)):
  - The default `true` adds one `HEAD`+`GET` route `prefix + '*'` ([index.js L119-L123](https://github.com/fastify/fastify-static/blob/v9.0.0/index.js#L119-L123)).
  - `false` globs `root` at startup, creates one route per file, "but will not serve newly added files". The glob skips dotfiles (`dot: opts.serveDotFiles`, default `false`) and honours `globIgnore` ([L143](https://github.com/fastify/fastify-static/blob/v9.0.0/index.js#L143)).
- **A missing file calls `reply.callNotFound()`** ([L355](https://github.com/fastify/fastify-static/blob/v9.0.0/index.js#L355)). That is Nest's 404 handler, which Nest registers on the root instance in `app.init()` ([routes-resolver.ts L146-L156](https://github.com/nestjs/nest/blob/v11.1.18/packages/core/router/routes-resolver.ts#L146)). Nest's global exception filters therefore see it.
- **Fastify allows one not-found handler per prefix** ([four-oh-four.js L94](https://github.com/fastify/fastify/blob/v5.8.4/lib/four-oh-four.js#L94)). **(lab)** A `fastify.setNotFoundHandler(...)` next to Nest fails the boot with `Not found handler already set for Fastify instance with prefix: '/'`. That is why b1 uses a route and b2 a filter.
- **`decorateReply`:** the first registration decorates `reply.sendFile`. "If `@fastify/static` is registered to multiple prefixes in the same route, only one can initialize reply decorators" (README). **(lab)** A second registration without `decorateReply: false` fails the boot with `FST_ERR_DEC_ALREADY_PRESENT`.
- **`setHeaders` and `Cache-Control`:** `setHeaders` receives `reply.raw` before `send`'s own headers are applied ([L377](https://github.com/fastify/fastify-static/blob/v9.0.0/index.js#L377)). With the default `cacheControl: true`, `send`'s `Cache-Control` wins. The sketches therefore pass `cacheControl: false` wherever `setHeaders` sets `Cache-Control`.
- **`maxAge: '1y'`** parses to 365.25 days and yields `max-age=31557600`. **(lab)** `'365d'` or `31536000000` yields the exact `31536000`.
- **Dotfiles:** `@fastify/static` defaults `dotfiles` to `'allow'` ([L41](https://github.com/fastify/fastify-static/blob/v9.0.0/index.js#L41)). With wildcard routing, any dotfile in `dist/` is served. **(lab)** `/.secret` came back as 200 `application/octet-stream` in b2 until `dotfiles: 'ignore'`.
- **Overlapping registrations:** a `wildcard: false` registration on the root also creates routes for `assets/*` files. Fastify's static routes beat the `/assets/*` wildcard, so those assets got the root's `no-cache` **(lab)**. b1 needs `globIgnore: ['assets/**']`.
- **Routing:** `find-my-way` prefers static over parametric over wildcard routes. **(lab)** Nest's `/api/config` and the deeper wildcard `/api/auth/*` both win over a root `/*`, for GET and POST.

**b1 sketch** (lab-tested; `vp fmt` only re-wrapped lines; called as `await serveSpa(app)` in `main.ts` before `listen`):

```ts
// apps/backend/src/spa.ts (location TBD)
import fastifyStatic from '@fastify/static';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { join } from 'node:path';

const SPA_ROOT = process.env.SPA_ROOT ?? join(__dirname, '..', '..', 'frontend', 'dist');
const isApi = (url: string) => /^\/api(\/|\?|$)/.test(url);

export async function serveSpa(app: NestFastifyApplication): Promise<void> {
  await app.register(fastifyStatic, {
    root: join(SPA_ROOT, 'assets'),
    prefix: '/assets/',
    maxAge: 31536000000, // 365 days; '1y' gives max-age=31557600
    immutable: true,
  });
  await app.register(fastifyStatic, {
    root: SPA_ROOT,
    wildcard: false, // one route per file found at boot
    globIgnore: ['assets/**'], // else these file routes beat /assets/*
    decorateReply: false, // sendFile comes from the first registration
    cacheControl: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  });
  app
    .getHttpAdapter()
    .getInstance()
    .get('/*', (req, reply) =>
      isApi(req.url)
        ? reply.callNotFound() // Nest's JSON 404
        : reply
            .header('Cache-Control', 'no-cache')
            .sendFile('index.html', SPA_ROOT, { cacheControl: false }),
    );
}
```

**b2 sketch** (lab-tested; `vp fmt` only re-wrapped lines; called as `serveSpa(app)` in `main.ts`):

```ts
import type {} from '@fastify/static'; // reply.sendFile typings
import { ArgumentsHost, Catch, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { join } from 'node:path';

const SPA_ROOT = process.env.SPA_ROOT ?? join(__dirname, '..', '..', 'frontend', 'dist');
const ASSETS_DIR = join(SPA_ROOT, 'assets') + '/';

@Catch(NotFoundException)
class SpaFallbackFilter extends BaseExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<FastifyRequest>();
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const isPage = /^(GET|HEAD)$/.test(req.method) && !/^\/(api|assets)(\/|\?|$)/.test(req.url);
    if (!isPage) return super.catch(exception, host);
    return reply
      .header('Cache-Control', 'no-cache')
      .sendFile('index.html', { cacheControl: false });
  }
}

export function serveSpa(app: NestFastifyApplication): void {
  app.useStaticAssets({
    root: SPA_ROOT,
    dotfiles: 'ignore', // the default 'allow' serves /.anything
    cacheControl: false,
    setHeaders: (res, path) =>
      res.setHeader(
        'Cache-Control',
        path.startsWith(ASSETS_DIR) ? 'public, max-age=31536000, immutable' : 'no-cache',
      ),
  });
  app.useGlobalFilters(new SpaFallbackFilter(app.getHttpAdapter()));
}
```

How b1 and b2 differ, as tested:

- **Files on disk:** b1 serves the files that existed at boot (`wildcard: false` for the root, wildcard for `/assets/`). b2 serves whatever is on disk.
- **Who builds the 404:** b2 sends every miss through Nest's exception layer. A future global `NotFoundException` filter would interact with it. b1 keeps the fallback in one Fastify route.

### Other ways looked at

- **A Nest controller catch-all** (`@Controller() … @Get('*')` that `sendFile`s `index.html`), with `@fastify/static` for the real files. The route has to leave the global prefix. **(lab)** Excluding it with `{ path: '{*path}', method: RequestMethod.GET }` (or `'*'`) strips the prefix from **every** GET controller route. The log showed `Mapped {/health, GET}` and `Mapped {/config, GET}`, while `POST /api/config` kept its prefix. Nest's [global-prefix FAQ](https://github.com/nestjs/docs.nestjs.com/blob/master/content/faq/global-prefix.md) documents that exclude paths are path-to-regexp patterns. Listing every SPA route in `exclude` instead would couple the backend to the router table (not tested). Unlike a and b, this route runs through Nest's interceptors **(lab)**.
- **Fastify `setNotFoundHandler`:** clashes with Nest's (above).

## Health check at `GET /`

- **(lab)** With #50's `exclude` keeping `GET /` as a Nest route:
  - serve-static fails the boot with `Method 'HEAD' already declared for route '/'`, because the non-wildcard `@fastify/static` registers `GET`+`HEAD /` for `index.html`.
  - b1 fails with `FST_ERR_DUPLICATED_ROUTE … 'GET' … '/'`.
  - b2 boots, but `GET /` returns `Hello World` instead of `index.html`, because the static Nest route beats the wildcard.
- So with Nest serving the SPA, the health check has to leave `/`. One shape: `HealthController` becomes `@Controller('health')` → `/api/health`, and the `exclude` goes away (lab-tested in every column above). The other: drop the separate health route and treat `GET /` (= `index.html`) as the check. That only passes when `dist/` exists (see "missing `dist/`" below).
- **What references `GET /` today** (`git grep` on `main`):
  - `.github/workflows/build.yml:168`, "Start backend": `curl -fsS --retry 30 … http://localhost:3000/`.
  - `apps/backend/src/health.controller.ts` (the route itself).
  - `CLAUDE.md:122`: "`GET /` — health check".
  - **#50's PR 1 plan:** the `exclude` itself, the backend e2e specs asserting `GET /` → 200 through the shared `configureApp`, and ADR 0004. None of it is on `main` yet.
- **What doesn't reference it:**
  - The frontend Playwright specs' `page.goto('/')` hits `baseURL` (`:3001`), not the backend.
  - There is no backend `healthcheck` in either compose file and no `HEALTHCHECK` in `Dockerfile.backend`. `caddy` uses short-form `depends_on`.
  - The edge never routes `/` to the backend today.
  - Monitors outside the repo weren't checked.

## Compression

|             | `@fastify/compress` 9.2.2 in Nest                                                                                                                                                                                                                                                                                                                               | One `encode` line in the edge `Caddyfile`                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup       | `await app.register(compress)` before the static plugin and before `listen`. It hooks `onRoute` ([index.js L63](https://github.com/fastify/fastify-compress/blob/v9.2.2/index.js#L63)), and its README says it "must be registered… **before** registering `@fastify/static`" ([README L79](https://github.com/fastify/fastify-compress/blob/v9.2.2/README.md)) | `encode` inside the site block ([encode docs](https://caddyserver.com/docs/caddyfile/directives/encode))                                                                                                                                                                                                                                                                                                 |
| Encodings   | `zstd` (when `zlib` has it, [L192](https://github.com/fastify/fastify-compress/blob/v9.2.2/index.js#L192)), `br`, `gzip`, `deflate`. Brotli quality defaults to 4 ([Nest docs](https://github.com/nestjs/docs.nestjs.com/blob/master/content/http/compression.md))                                                                                              | `zstd`, `gzip` by default                                                                                                                                                                                                                                                                                                                                                                                |
| Size floor  | `threshold` 1024 B, but only for buffered payloads ([L141](https://github.com/fastify/fastify-compress/blob/v9.2.2/index.js#L141), [L380-L383](https://github.com/fastify/fastify-compress/blob/v9.2.2/index.js#L380-L383)). **(lab)** Static files are streams and are always compressed: `robots.txt` went from 24 B to 33 B as zstd                          | `minimum_length` 512 B ([encode.go L655](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/encode/encode.go#L655)). **(lab)** `robots.txt` stayed uncompressed                                                                                                                                                                                                                         |
| Types       | regex for text, json, xml and octet-stream, plus mime-db's `compressible` flag. **(lab)** `favicon.ico` (`image/vnd.microsoft.icon`) was compressed                                                                                                                                                                                                             | built-in list ([encode.go L86-L127](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/encode/encode.go#L86-L127))                                                                                                                                                                                                                                                                      |
| Range / 206 | skips 206 and `Content-Range` ([L349](https://github.com/fastify/fastify-compress/blob/v9.2.2/index.js#L349)) **(lab)**                                                                                                                                                                                                                                         | drops `Accept-Ranges` on encoded responses ([L525](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/encode/encode.go#L525))                                                                                                                                                                                                                                                           |
| ETag        | left as is. `@fastify/send` ETags are weak (`W/…`), which RFC 9110 allows across content codings                                                                                                                                                                                                                                                                | appends `-zstd`/`-gzip` to **strong** ETags only, and strips the suffix from `If-None-Match` on the way up ([L173-L184](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/encode/encode.go#L173-L184), [L534-L536](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/encode/encode.go#L534-L536)). **(lab)** The weak ETags passed through unchanged and 304s worked |
| Scope       | every Fastify route registered after it: SPA files, API JSON over 1 KB, Better-Auth responses                                                                                                                                                                                                                                                                   | every response the site proxies                                                                                                                                                                                                                                                                                                                                                                          |

Lab numbers (fake 60,779-byte JS chunk):

| Encoding                            | Size    |
| ----------------------------------- | ------- |
| zstd (`@fastify/compress`)          | 3,143 B |
| zstd (Caddy `encode`)               | 3,148 B |
| br (`@fastify/compress`, quality 4) | 2,538 B |
| gzip (`@fastify/compress`)          | 7,584 B |

`index.html` (1,702 B) became 335 B (Nest) or 332 B (Caddy) as zstd.

Other facts **(lab)**:

- **`Via` doesn't matter here.** `@fastify/compress` has no check for proxied requests. A request carrying `Via: 1.1 Caddy` was still compressed, directly and through the real edge. That is unlike nginx's `gzip_proxied` (#49 research).
- **Both at once doesn't double-compress.** Caddy only encodes when `Content-Encoding` is empty ([L516](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/encode/encode.go#L516)), and the edge passed Nest's zstd through.
- **Quirks with `@fastify/compress`:**
  - 304 responses carry a `Content-Encoding` header with an empty body.
  - On b1, `HEAD /results` comes back without `Content-Encoding` while `GET /results` has it.
- **Nest's own guidance:** "For high-traffic websites in production, we strongly recommend offloading compression from the application server, typically to a reverse proxy" ([compression docs](https://github.com/nestjs/docs.nestjs.com/blob/master/content/http/compression.md)). Compression CPU cost on the arm64 host wasn't measured.
- **Baseline:** the edge compresses nothing today (#49 research, checked live).

## Image, CI and deploy impact

### `Dockerfile.backend`

Today it has four stages:

1. `base`: `node:22-alpine`, corepack, `openssl`.
2. `deps`: root manifests plus the backend and api-client `package.json`, the Prisma schema and config, then `pnpm install --frozen-lockfile`.
3. `build`: `COPY . .`, `prisma generate`, `nest build`.
4. `runner`: copies the root `node_modules`, `apps/backend/{dist,node_modules,package.json,prisma,prisma.config.ts}`. CMD: `cd apps/backend && pnpm exec prisma migrate deploy && node dist/main.js`.

The repo has no `.dockerignore`.

What the merge needs (sketch, **not** lab-tested; the Vue SPA doesn't exist yet):

```dockerfile
# ---------- SPA build (today's Dockerfile.frontend builder stage) ----------
FROM base AS spa
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @lesbarkeitsindex/frontend run build    # vue-tsc -b && vp build -> apps/frontend/dist

# ---------- Runtime image (existing stage, one line added) ----------
FROM base AS runner
# ... unchanged lines ...
COPY --from=spa /app/apps/frontend/dist ./apps/frontend/dist
```

- **Where `dist/` sits:** at `/app/apps/frontend/dist`, next to `/app/apps/backend/dist/main.js`. From `main.js`, `resolve(__dirname, '..', '..', 'frontend', 'dist')` points there. The same expression also works from `apps/backend/src` (dev, Vitest) and `apps/backend/dist` (local build). This is the arithmetic `main.ts` already uses for the root `.env` (`resolve(__dirname, '..', '..', '..', '.env')`). The sketches read an optional `SPA_ROOT` env var first.
- **Why a separate stage:** installing the frontend workspace in the existing `deps` stage would put its toolchain (vite-plus, vue-tsc, PrimeVue…) into the root `node_modules` that `runner` copies wholesale. vite-plus's Docker guide warns about the same thing for `--prod` installs ([docker.md at v1.4.0](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/docker.md)). In the sketch the runtime image grows only by `dist/`.
- **Parallel stages:** BuildKit "parallelize[s] building independent build stages" ([BuildKit docs](https://docs.docker.com/build/buildkit/)). `spa` and `deps`/`build` don't depend on each other.
- **The build command:** the frontend build would be `vue-tsc -b && vp build` (vite-plus scaffold, per the #47 research). `vp` comes from the workspace's `vite-plus` devDependency, so `pnpm --filter … run build` works without a global `vp`.

### `.github/workflows/build.yml`

- **`changes` filter:** `backend` must also match `apps/frontend/**` and `packages/api-client/**`. `packages/api-client/**` isn't in the backend filter today, even though `Dockerfile.backend` copies its `package.json`.
- **The `frontend` key has to go.** `services` is paths-filter's `changes` output, "all matching filter names", and the build matrix turns each name into `file: ./Dockerfile.${{ matrix.service }}`. A leftover `frontend` key would schedule a job for a missing `Dockerfile.frontend`.
- **`e2e-frontend`'s `if:`** reads `needs.changes.outputs.frontend`. After the change, the backend filter covers those paths.
- **Build matrix:** it shrinks to `backend` and `r-sidecar`. The `frontend` gha cache scope stops being used, and the `backend` scope also holds the SPA stage's layers.
- **CI e2e** keeps `vp preview` + proxy (#51). In CI the "Build frontend" step runs before "Start backend", so with the default path the backend would also serve `apps/frontend/dist` on :3000. Playwright doesn't use it.
- **The "Start backend" curl** changes only if the health route leaves `/`.

### `docker-compose-prod.yml`, `Caddyfile`, Renovate

- **`docker-compose-prod.yml`:** the `frontend` service is removed, and `caddy.depends_on` becomes `[backend]`. The backend's environment doesn't change. `NUXT_PUBLIC_API_BASE` leaves with #51 either way.
- **`Caddyfile`:** the site block becomes `tls info@florianbieck.com` plus `reverse_proxy backend:3000`, and `encode` if compression goes to the edge. #50's `/api/*` split isn't needed any more. As with #50, the edge has to be restarted after the `Caddyfile` changes (single-file bind mount).
- **Renovate:** the "Node.js" major rule ("both Dockerfiles") is left with one Node Dockerfile. The "Docker image digests" group is unchanged.

### Deploy rule and coupling

- **Images:** three become two. The SPA and the API can no longer run at different SHAs: they ship in one image and restart together. The "deploy only when all `:latest` tags match" rule then covers `backend` and `r-sidecar`. The old `ghcr.io/florianbieck/lesbarkeitsindex/frontend:latest` stays in the registry until someone deletes it.
- **A frontend-only change rebuilds and restarts the backend.** The new image runs `prisma migrate deploy` at start (a no-op without new migrations, but it needs Postgres), then the seed (two `createUser` attempts plus a config check). Today a frontend-only deploy restarts only the Nitro container.
- **During a backend restart the SPA is down too.** Caddy answers 502 for every path until Nest listens. Any startup failure takes the SPA down with the API, such as a failing migration, Postgres not ready, or a missing `BETTER_AUTH_SECRET` (`AuthService` throws). Better-Auth sessions live in Postgres and survive restarts.
- **Cold build time (qualitative):**
  - Today a frontend-only change builds only the frontend image, and a lockfile change builds both images in parallel on two runners.
  - Merged, a frontend-only change also reruns `prisma generate` and `nest build`. With no `.dockerignore`, `COPY . .` busts the `build` stage on any repo change, so cached layers don't help. The same holds the other way: the sketch's `spa` stage also starts with `COPY . .`, so a backend-only change reruns the SPA build.
  - A lockfile change runs both installs and builds in one job on one runner. BuildKit overlaps the stages, but they share that runner's CPUs.
  - Estimate, not measured: a cold merged build takes longer than the slower of today's two builds and less than both run back to back.

## Things that bite (summary)

- **serve-static on Fastify:**
  - `exclude` is ignored.
  - The fallback needs `fallthrough: true`.
  - The fallback streams `index.html` without validators or a charset.
  - A Node-style `setHeaders` crashes the process on the first deep link **(lab)**.
  - `wildcard: false` is forced.
- **Nest pipeline:** guards, pipes and interceptors only run for controller routes. **(lab)** A global interceptor's marker header was absent on every static and fallback response in a and b. Global exception filters do see `callNotFound()` misses, which b2 relies on.
- **CORS:** `enableCors` (still in `main.ts` until PR 2) also applies to static responses: `Vary: Origin`, plus a reflected `Access-Control-Allow-Origin` when an `Origin` header is sent **(lab)**.
- **Better-Auth wildcard controller:** unaffected **(lab)**. `/api/auth/*` beats `/*` for GET and POST, and Nest 11 on Fastify maps `@All('*')` as `/api/auth/*` with no deprecation warning in the log.
- **`exclude` syntax:** a GET wildcard (`{*path}` or `*`) in `setGlobalPrefix`'s `exclude` unprefixes every GET route **(lab)**.
- **Double registration:** `FST_ERR_DEC_ALREADY_PRESENT` unless all but one registration set `decorateReply: false` **(lab)**. Overlapping roots need `globIgnore` **(lab)**.
- **HEAD:** works everywhere **(lab)**. `@fastify/static` registers `HEAD` itself, and Fastify adds `HEAD` for plain `GET` routes (`exposeHeadRoutes`, default `true`, [Server docs](https://fastify.dev/docs/latest/Reference/Server/#exposeheadroutes)).
- **Range:** files answer `Range: bytes=0-9` with 206 in every approach **(lab)**.
- **Dotfiles:** `@fastify/static`'s default `dotfiles: 'allow'` serves them under wildcard routing **(lab)**.
- **Missing `dist/`:** every approach boots, the API works, and SPA paths 404 **(lab)**. `@fastify/static` only `log.warn`s about a missing root, and Nest's Fastify instance has logging off, so nothing appears in the log. This is what dev (`nest start --watch` without a built SPA) and any environment without `dist/` see. If the static setup lands in the shared `configureApp`, the backend e2e specs get it too.
- **knip:** if `@fastify/static` is listed but only loaded through `useStaticAssets` or serve-static, knip may report it as unused. Not tested.

## Open uncertainties

- The Vue SPA and its real `dist/` don't exist yet. The lab used a fake Vite layout, so asset sizes, chunk counts and the `vue-tsc -b && vp build` step inside Docker are untested.
- The `Dockerfile.backend` and `build.yml` changes are sketches from reading the files. Neither was built or run in CI.
- Compression CPU cost and latency on the arm64 CAX host weren't measured. Neither was the cold build time of a merged image.
- The lab ran HTTP/1.1 on macOS with Node 22.23.4. The image runs `node:22-alpine`, whose exact 22.x minor decides whether `zlib` has zstd (Node ≥ 22.15).
- `@fastify/static` 9.0.0 is the version in the lock. Adding it as a direct dependency may resolve 9.3.0. Nest 12 moves everything to `@fastify/static` 10, which wasn't tested.
- Whether knip flags `@fastify/static` for the `useStaticAssets` and serve-static variants wasn't tested.
- Monitors or scripts outside the repo that might call `GET /` on the backend weren't checked.

## Method

The lab files are in the session scratchpad, not in the repo. The steps:

- A standalone pnpm project pinned the repo's versions: `@nestjs/common`/`core`/`platform-fastify` 11.1.18, `fastify` 5.8.4, `@fastify/static` 9.0.0, plus `@nestjs/serve-static` 5.0.5 and `@fastify/compress` 9.2.2. Overrides held `find-my-way` 9.5.0, `@fastify/send` 4.1.0 and `light-my-request` 6.6.0 at the repo's lock versions. It was compiled with `tsc` 5.9.3 (`experimentalDecorators`, `emitDecoratorMetadata`).
- One Nest app had the controllers described above and `setGlobalPrefix('api')`. A global interceptor added a marker header, and `enableCors` was set as in `main.ts`. Each approach was its own module, picked by an env var.
- The fake Vite `dist/` is described above. `curl` recorded status, `Content-Type`, `Cache-Control`, `ETag`, `Last-Modified`, `Content-Encoding`, `Vary`, `Content-Length` and the body prefix for each request.
- Each approach was probed as-is, with `@fastify/compress`, with health at `GET /` (the #50 `exclude`), with a non-existent `dist/`, and in the failing shapes: the second `decorateReply`, `setNotFoundHandler`, and the Node-style `setHeaders`.
- Edge: `caddy:2-alpine` v2.11.7 in Docker with three sites. Nest compressing, the edge `encode`-ing, and both. Each was probed with `Accept-Encoding: gzip, deflate, br, zstd`, `Range` and `If-None-Match`.
- Sources:
  - npm registry metadata, read 2026-10-25.
  - Upstream source at the tags linked above.
  - Nest docs source (`nestjs/docs.nestjs.com`, `master`).
  - This repo at `63de88e`: `apps/backend/**`, `Dockerfile.*`, `docker-compose*.yml`, `Caddyfile`, `.github/workflows/build.yml`, `pnpm-lock.yaml`, `knip.config.ts`, `renovate.json` and `git log -S'@fastify/static'`.
