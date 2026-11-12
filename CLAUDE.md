# Lesbarkeitsindex (LÜ-LIX)

German text readability analysis tool for teachers and educators. pnpm monorepo with a NestJS/Express backend that also serves the Vue SPA frontend, and an R NLP sidecar.

## pnpm first

Use `pnpm` for installs and scripts (`pnpm <script>` at the root, `pnpm --filter <package> run <script>` in a package) and `pnpm --filter <package> exec <binary>` for a binary no script wraps; npm, yarn and bun stay out of this repo.

## Tech Stack Rules

- **Package manager**: pnpm
- **Toolchain**: package scripts call Vite, Vitest, vue-tsc, oxlint, oxfmt and the Nest CLI directly (ADR 0006 records why vite-plus left)
- **Runtime**: Node.js (not Bun)
- **Backend**: NestJS with Express adapter (`@nestjs/platform-express`, Express 5)
- **Database**: Prisma 7 with `@prisma/adapter-pg` + `pg`
- **Frontend**: Vue 3 SPA (Composition API, vue-router 5), built by Vite; the backend serves the build (ADR 0007)
- **UI**: PrimeVue 4 with Aura theme — use PrimeVue components for all UI work
- **CSS**: Tailwind 4 utility classes (`@tailwindcss/vite`). `surface-*` and `primary-*` are PrimeVue's Aura tokens, mapped by the `@theme inline` block in `src/assets/main.css`, not Tailwind's palette
- **Auth**: Better-Auth with email/password + admin plugin
- **Schema validation**: Zod (backend DTOs validated with Zod schemas)
- **API client**: `@lesbarkeitsindex/api-client` package (zero-dependency) — the frontend injects its native-`fetch` wrapper via `createApiClient(fetcher)` for typed frontend → backend calls
- **Linting**: oxlint (`.oxlintrc.json`)
- **Formatting**: oxfmt (`.oxfmtrc.json`)
- **Dead code**: knip (`knip.config.ts`) — unused files, exports, dependencies
- **Testing**: Vitest for unit tests and backend e2e, Playwright for frontend E2E and the prod smoke test
- **Build**: NestJS SWC compiler (`nest build --builder swc`)
- **Charts**: Chart.js + `chartjs-plugin-annotation`

## Monorepo Structure

```
apps/
  backend/            # NestJS/Express API (port 3000)
    src/
      main.ts         # Bootstrap, seed
      configure-app.ts # helmet (CSP), /api prefix, JSON body limit; e2e specs call it too
      app.module.ts   # Root module
      health.controller.ts
      prisma/         # PrismaModule + PrismaService
      auth/           # AuthModule, AuthService, AuthController, AuthGuard
      config/         # ConfigController (GET/POST /api/config)
      calculate/      # CalculateController, CalculateService
        result/       # Pure computation functions
          index.ts    # computeReadability() — barrel exports
          basic-metrics.ts
          indices.ts  # LIX, gSMOG, FK, WSTF, RIX
          linguistic-features.ts
          grapheme-analysis.ts
          text-features.ts
          heading-extraction.ts
      results/        # ResultsController (GET /api/results)
      r-sidecar/      # RSidecarService (R service HTTP client)
      spa/            # spaImports(): serves apps/frontend/dist (ADR 0007)
      generated/      # Prisma client (gitignored, auto-generated)
    prisma/
      schema.prisma   # Config, Result, User, Session models
  frontend/           # Vue 3 SPA (dev port 3001)
    src/
      main.ts         # createApp, router, PrimeVue (Aura)
      router.ts       # Hand-written route table
      pages/          # index, login, logout, results, admin, not-found
      components/     # result-view, config-weights-form
      composables/    # useApiClient + api-fetch (native fetch), useAuthClient
    e2e/              # Playwright specs; fixtures.ts fails any test on a CSP violation
    smoke/            # Playwright smoke test against prod
packages/
  api-client/         # Typed API client (@lesbarkeitsindex/api-client)
    src/index.ts      # createApiClient() factory + type interfaces
r-sidecar/            # R Plumber API for NLP (port 8787, Docker only)
```

## Development

```sh
# 1. Start Postgres + R sidecar
docker compose up -d

# 2. Install deps (the backend's postinstall generates the Prisma client)
pnpm install

# 3. Run migrations
pnpm --filter backend exec prisma migrate deploy

# 4. Start backend (port 3000)
pnpm dev:backend

# 5. Start frontend (port 3001; proxies /api to :3000)
pnpm dev:frontend
```

### Environment

**`.env`** (project root, required):

```
DATABASE_URL=postgresql://admin:admin@localhost:5432/lesbarkeitsindex?schema=public
R_SIDECAR_URL=http://localhost:8787
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:3000
```

Single `.env` at the project root, read by the backend (`process.loadEnvFile` in `main.ts`). The frontend has no settings: it calls `/api` on its own origin, and the Vite dev and preview servers proxy that to :3000.

## Testing

```sh
# Backend unit tests (Vitest 5)
pnpm --filter backend run test

# API client unit tests (Vitest 5)
pnpm --filter @lesbarkeitsindex/api-client run test

# Frontend unit tests (Vitest 5 + @vue/test-utils)
pnpm --filter frontend run test:unit

# Frontend type-check (vue-tsc over tsconfig.app.json + tsconfig.node.json)
pnpm --filter frontend run typecheck

# Frontend E2E (Playwright): backend on :3000 plus `build` + `preview` on :3001, or
# E2E_BASE_URL=http://localhost:3000 against the backend serving the build (as CI does)
pnpm --filter frontend run test:e2e

# Smoke test against prod after a deploy (Playwright; login from the gitignored
# apps/frontend/.env.smoke.local, see playwright.smoke.config.ts). The user writes that
# file by hand: an agent that creates it sees the password once the user fills it in
pnpm --filter frontend run test:smoke

# Run all workspace tests from root (each package's own test script)
pnpm test
```

Playwright runs Chromium only, on a single worker.

## API Endpoints

Every backend route lives under `/api/` (ADR 0004); every other GET path gets the SPA's file or `index.html` (ADR 0007).

- `GET /api/health` — health check
- `GET /api/config` — current readability config
- `POST /api/config` — update config (requires auth)
- `POST /api/calculate` — analyze text readability
- `GET /api/results?page=0&limit=10` — paginated results
- `/api/auth/*` — Better-Auth endpoints

## Code Conventions

- TypeScript strict mode everywhere
- Frontend: `<script setup lang="ts">` with Composition API
- Backend: NestJS modules with controllers, services, and Zod DTOs
- API client: `useApiClient()` passes `apiFetch` (native `fetch`, relative URLs) to `createApiClient(fetcher)` from `@lesbarkeitsindex/api-client`
- Frontend imports are explicit (Vue APIs, PrimeVue components, composables); `@/` is `src/`, and oxlint requires it for every import that leaves the file's directory
- DB changes: edit `prisma/schema.prisma` → `pnpm generate` → `pnpm migrate`
- Auth in frontend: `useAuthClient()` composable

## Linting & Formatting

```sh
# Lint the whole repo (oxlint)
pnpm run lint

# Format the whole repo in place (oxfmt)
pnpm run fmt

# Check formatting, then lint
pnpm run check

# Unused files, exports, dependencies (knip, also runs in CI)
pnpm run knip
```

## CI/CD

- **`.github/workflows/build.yml`**: On push to `main` or tags — `pnpm install --frozen-lockfile`, runs tests, builds Docker images for the backend (with the SPA) and the r-sidecar, pushes to `ghcr.io`
- **`.github/workflows/deploy.yml`**: the only deploy path: prod changes when someone approves a run. It starts after each successful build of a push to `main` (or by hand from `main`) and waits in the `production` environment, which holds its four secrets. Then it ships both compose files and the `Caddyfile` over SSH, writes the server's `.env`, runs `pull` + `up -d --remove-orphans`, and smoke-checks `/api/health` + `/api/config` through the edge. The server (`root@lix.florianbieck.com`, `/root/app/lesbarkeitsindex`, project `lesbarkeitsindex`) has no git; its `.env` sets `COMPOSE_FILE`, so a plain `docker compose logs backend` there sees the whole stack. Read logs there: Actions logs are public. The seed creates missing admin accounts with `SEED_ADMIN_PASSWORD` (default `#Test1234` outside prod) and never changes existing ones
- **`renovate.json`**: Renovate dependency updates — grouped PRs Monday mornings (Europe/Berlin), security fixes immediately. The Node.js major lives in `.node-version` (CI reads it via `node-version-file`) and `Dockerfile.backend`, and moves as one PR; Postgres and `@types/node` majors wait for approval on the Dependency Dashboard issue

## Gotchas

- **Native build scripts**: `pnpm-workspace.yaml` has an `allowBuilds` map — when adding deps with native code (e.g. `@swc/core`), add them there or `pnpm install` will skip their build scripts.
- **Prisma `generated/` inside `src/`**: The Prisma client generates to `apps/backend/src/generated/prisma/` so NestJS SWC compiles it alongside application code. Import via `../generated/prisma/client.js`.
- **Prisma codegen required**: After any Prisma schema change, run `pnpm generate`
- **R sidecar is Docker-only**: The NLP service runs in Docker, not natively. It takes ~60s to start (health check at `/health`)
- **Same-origin everywhere**: Caddy sends every path to the backend; the Vite dev and preview servers proxy `/api`. The backend sends no CORS headers
- **A new external origin needs a CSP entry**: an image, font or API from another origin needs a change to `CONTENT_SECURITY_POLICY` in `configure-app.ts`, or the browser blocks it and every Playwright test against the backend fails
- **SPA deep links 404 below a dot-directory**: serve-static refuses paths under a directory starting with `.`, so the backend serves no deep links from a worktree under `.claude/worktrees/`. Run Playwright there against `vite preview`
- **Backend specs that need the SPA**: build the testing module with `spaTestingModule()` from `test/spa-fixture.ts`. A plain `Test.createTestingModule` with `spaImports` serves nothing, because serve-static picks its loader before the app has an HTTP adapter
- **Utilities beat PrimeVue**: PrimeVue's `cssLayer` (in `main.ts`) puts Aura in a `primevue` layer below Tailwind's utilities, so a utility on a PrimeVue component overrides Aura (`py-3` makes a `Button` taller than every other control). Size and shape components through their props and Aura. A CSS layer of our own sorts above `primevue` unless it is `theme` or `base`, which is why `primeicons.css` is imported into `base`
- **Better-Auth trustedOrigins**: Configured in `apps/backend/src/auth/auth.service.ts` — update when adding new domains
- **knip via the script only**: Run `pnpm run knip`, not bare `knip` — the script sets `KNIP_DISABLE_RAW_TRANSFER=1`, without which knip's oxc-parser panics (`raw_transfer.rs` assertion). Ignores in `knip.config.ts` carry a comment saying why; keep it that way
- **NestJS + Better-Auth**: `AuthController`'s `@All('*path')` bridges Express requests to Better-Auth's Web `Request`/`Response`. Send `Set-Cookie` as one `res.setHeader('set-cookie', response.headers.getSetCookie())`: `res.header()`/`res.set()` replace, so copying cookies one by one keeps only the last, and sign-out leaves the session cookie in the browser
- **`@nestjs/platform-express` stays on `^11`**: add or update it as `@nestjs/platform-express@^11`, matching `@nestjs/common`/`core`. Its `latest` dist-tag is Nest 12, which a bare `pnpm add` installs

## Key Domain Concepts

The app computes German readability indices:

- **LIX** (Lesbarkeitsindex)
- **gSMOG** (simplified measure of gobbledygook, German variant)
- **Flesch-Kincaid** (adapted for German)
- **WSTF** (Wiener Sachtextformel variant)
- **LÜ-LIX** (custom weighted composite score)

Parameters are stored in a `Config` model; analysis results in a `Result` model. The weighting of indices is configurable via the admin page.

## Design Context

**Users**: Teachers and educators (often non-technical) evaluating text difficulty for students. UI must be self-explanatory.

**Brand**: Friendly, warm, simple — like a helpful colleague. German-language UI. Forgiving interactions, complexity hidden behind defaults.

**Aesthetic**: Warm & educational. PrimeVue Aura theme foundation. Light mode only. Soft colors, rounded shapes, generous white space. Readability scores use green/yellow/red. WCAG AA compliance required. Colorblind-safe chart colors.

**Principles**: Clarity over cleverness. Warmth over sterility. Progressive disclosure (essential results first). Content-first layout.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues (`florianBieck/lesbarkeitsindex`), managed via the `gh` CLI. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles use their default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
