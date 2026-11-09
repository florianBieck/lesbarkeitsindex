# Frontend drops Nuxt for a plain Vue SPA

The frontend ran on Nuxt 4 in its own Nitro container, but used almost nothing Nuxt gives
beyond auto-imports: no server-side data loading, no route middleware, no server routes, and
a login-gated tool gains nothing from server-rendered first paint. Decision (2026-11-09):
`apps/frontend` becomes a plain Vue 3 SPA (vue-router 5, PrimeVue 4, Tailwind), built by
Vite and tested on the repo's one Vitest 5, and **the Nest backend serves the built SPA**.
The stack goes from three app images to two (`backend`, `r-sidecar`), the SPA and the API
always ship at the same commit, and the edge `Caddyfile` shrinks to one `reverse_proxy`.

## How the pieces fit

- **The backend serves `apps/frontend/dist`** through `@nestjs/serve-static`
  (`spaImports(root)` in `AppModule`). Files below `assets/` are hashed and cached for a
  year (`immutable`); every other GET path outside `/api/` gets its file or `index.html`,
  with `no-cache` and an ETag. A missing asset and an unknown `/api/*` path get Nest's JSON 404. Without a build the backend warns and serves no SPA, except under
  `NODE_ENV=production`, where the boot fails.
- **Same-origin in every environment.** Prod goes through Caddy to the backend; the Vite dev
  and preview servers (strict port 3001) proxy `/api` to :3000, the same rule as prod; CI
  runs Playwright against the backend on :3000, which serves the real build. The frontend
  has no API-base setting, the backend sends no CORS headers, and both clients call relative
  URLs, so the cookies go along by default. A ~15-line native-`fetch` wrapper replaces Nuxt's
  `$fetch`.
- **Routes are a hand-written table** (`src/router.ts`): typed routes don't check path
  strings, and file-based routing would cost plugin config and a generated `.d.ts`. Unknown
  paths render a German not-found page inside the app shell, with status 200, since the
  backend can't know the routes.

## Considered options

- **A static file server in a frontend container** (Caddy, nginx-unprivileged,
  static-web-server): all three fit, but keep a third image, a second deploy unit and a
  `Caddyfile` route split.
- **The edge Caddy serving `dist/`:** ties the SPA to the edge's deploy instead of the
  backend image, so the SPA and the API could drift apart.
- **Two `useStaticAssets` mounts plus a catch-all in `configureApp`:** meets the same rules
  without a dependency or the two drawbacks below, but is hand-written serving code. The
  module won.
- **A build-time `VITE_API_BASE` pointing dev and CI at :3000:** keeps CORS alive and gives
  dev a different request path from prod.

## Consequences

- **serve-static's error handler rewrites body-parser errors on `/api/*`:** malformed JSON
  (400) and a body over the 1 MiB limit (413) come back as 404. Accepted: the frontend sends
  neither, and a workaround would cover one parser and duplicate Nest's error shape.
- **Deep links 404 when a directory above the build starts with a dot**, as worktrees under
  `.claude/worktrees/` do. Specs write their fixture `dist/` into a temp dir; in such a
  worktree, run Playwright against `vite preview`.
- **A Nest testing module serves no SPA by itself:** serve-static picks its loader when
  `compile()` runs, before the app has an HTTP adapter. Specs build theirs through
  `spaTestingModule()`, which swaps in the Express loader.
- **Imports are explicit everywhere** (Vue APIs, composables, PrimeVue and own components),
  with no unplugins and no generated `.d.ts`. `@/` points at `src/`, and oxlint's
  `import/no-relative-parent-imports` makes every import that leaves its directory use it.
  `vue-tsc -b` type-checks a split tsconfig (`tsconfig.app.json` for browser code and unit
  tests, `tsconfig.node.json` for configs and Playwright) at Nuxt's strictness, in CI too.
- **The backend owns the security headers; the edge owns HSTS.** `helmet` runs first in
  `configureApp`, so every response gets them, the SPA's and the API's: an enforced CSP that
  allows only the site's own origin, `nosniff`, `strict-origin-when-cross-origin` and
  `frame-ancestors 'none'`. The `Caddyfile` sends HSTS, also on Caddy's own errors.
  `style-src` allows `'unsafe-inline'` because PrimeVue writes its theme into `<style>`
  elements at runtime. A nonce would make every `index.html` unique (no more 304s) and would
  block the `style="…"` attributes that PrimeVue and Vue's static template blocks set; the
  remaining risk, injected CSS, needs an HTML injection point, and the app has no `v-html`.
  The images the header used to load from beate-lessmann.de are self-hosted, and every
  Playwright test fails on a CSP violation.
- **Node 26 everywhere**, which no longer bundles corepack: the image installs it from npm.
