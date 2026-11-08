# Lesbarkeitsindex (LÜ-LIX)

German text readability analysis tool for teachers and educators. pnpm monorepo with NestJS/Express backend, Nuxt 4 frontend, and R NLP sidecar.

## pnpm first

Use `pnpm` for installs and scripts (`pnpm --filter <package> run <script>`) and `pnpm --filter <package> exec <binary>` for a package's binaries; npm, yarn and bun stay out of this repo. Every tool runs directly from a package script (ADR 0006 records why vite-plus left).

## Tech Stack Rules

- **Package manager**: pnpm
- **Runtime**: Node.js (not Bun)
- **Backend**: NestJS with Express adapter (`@nestjs/platform-express`, Express 5)
- **Database**: Prisma 7 with `@prisma/adapter-pg` + `pg`
- **Frontend**: Nuxt 4 (Vue 3 Composition API)
- **UI**: PrimeVue 4 with Aura theme — use PrimeVue components for all UI work
- **CSS**: Tailwind utility classes + PrimeVue Aura theme tokens
- **Auth**: Better-Auth with email/password + admin plugin
- **Schema validation**: Zod (backend DTOs validated with Zod schemas)
- **API client**: `@lesbarkeitsindex/api-client` package (zero-dependency) — the frontend injects Nuxt's `$fetch` (ofetch) via `createApiClient(fetcher)` for typed frontend → backend calls
- **Linting**: oxlint (`.oxlintrc.json`)
- **Formatting**: oxfmt (`.oxfmtrc.json`)
- **Dead code**: knip (`knip.config.ts`) — unused files, exports, dependencies
- **Testing**: Vitest for all tests
- **Build**: NestJS SWC compiler (`nest build --builder swc`)
- **Charts**: Chart.js + `chartjs-plugin-annotation`

## Monorepo Structure

```
apps/
  backend/            # NestJS/Express API (port 3000)
    src/
      main.ts         # Bootstrap, seed
      configure-app.ts # /api prefix, CORS, JSON body limit; e2e specs call it too
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
      generated/      # Prisma client (gitignored, auto-generated)
    prisma/
      schema.prisma   # Config, Result, User, Session models
  frontend/           # Nuxt 4 SPA (dev port 3001)
    app/
      pages/          # index, login, logout, results
      components/     # result-view.vue
      composables/    # useAuthClient.ts, useApiClient.ts
    e2e/              # Playwright specs
packages/
  api-client/         # Typed API client (@lesbarkeitsindex/api-client)
    src/index.ts      # createApiClient() factory + type interfaces
r-sidecar/            # R Plumber API for NLP (port 8787, Docker only)
```

## Development

```sh
# 1. Start Postgres + R sidecar
docker compose up -d

# 2. Install deps
pnpm install

# 3. Generate Prisma client
pnpm --filter backend exec prisma generate

# 4. Run migrations
pnpm --filter backend exec prisma migrate deploy

# 5. Start backend (port 3000)
pnpm --filter backend exec nest start --watch

# 6. Start frontend (port 3001)
pnpm --filter frontend exec nuxt dev
```

### Environment

**`.env`** (project root, required):

```
DATABASE_URL=postgresql://admin:admin@localhost:5432/lesbarkeitsindex?schema=public
R_SIDECAR_URL=http://localhost:8787
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:3000
```

Single `.env` at the project root — used by both backend (via `process.loadEnvFile` in `main.ts`) and frontend (`NUXT_PUBLIC_API_BASE`, defaults to `http://localhost:3000`).

## Testing

```sh
# Backend unit tests (Vitest 5)
pnpm --filter backend run test

# API client unit tests (Vitest 5)
pnpm --filter @lesbarkeitsindex/api-client run test

# Frontend unit tests (Vitest 4 + @nuxt/test-utils)
pnpm --filter frontend run test:unit

# Frontend E2E (Playwright, requires running stack)
pnpm --filter frontend run test:e2e

# Smoke test against prod after a deploy (Playwright; login from the gitignored
# apps/frontend/.env.smoke.local, see playwright.smoke.config.ts). The user writes that
# file by hand: an agent that creates it sees the password once the user fills it in
pnpm --filter frontend run test:smoke

# Run all workspace tests from root (each package's own test script)
pnpm test
```

All tests use Vitest. Frontend E2E uses Playwright (Chromium only, single worker).

## API Endpoints

Every backend route lives under `/api/` (ADR 0004); every other path belongs to the frontend.

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
- API client: `createApiClient(fetcher)` from `@lesbarkeitsindex/api-client` — caller supplies a configured `$fetch`/ofetch instance (baseURL + credentials)
- DB changes: edit `prisma/schema.prisma` → `pnpm --filter backend exec prisma generate` → `pnpm --filter backend exec prisma migrate dev`
- Auth in frontend: `useAuthClient()` composable
- Runtime config: `useRuntimeConfig().public.apiBase` for API base URL

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

- **`.github/workflows/build.yml`**: On push to `main` or tags — `pnpm install --frozen-lockfile`, runs tests, builds Docker images for backend/frontend/r-sidecar, pushes to `ghcr.io`
- **`.github/workflows/deploy.yml`**: the only deploy path: prod changes when someone approves a run. It starts after each successful build of a push to `main` (or by hand from `main`) and waits in the `production` environment, which holds its four secrets. Then it ships both compose files and the `Caddyfile` over SSH, writes the server's `.env`, runs `pull` + `up -d --remove-orphans`, and smoke-checks `/api/health` + `/api/config` through the edge. The server (`root@lix.florianbieck.com`, `/root/app/lesbarkeitsindex`, project `lesbarkeitsindex`) has no git; its `.env` sets `COMPOSE_FILE`, so a plain `docker compose logs backend` there sees the whole stack. Read logs there: Actions logs are public. The seed creates missing admin accounts with `SEED_ADMIN_PASSWORD` (default `#Test1234` outside prod) and never changes existing ones
- **`renovate.json`**: Renovate dependency updates — grouped PRs Monday mornings (Europe/Berlin), security fixes immediately. The Node.js major lives in `.node-version` (CI reads it via `node-version-file`) and both Dockerfiles, and moves as one PR; Postgres and `@types/node` majors wait for approval on the Dependency Dashboard issue

## Gotchas

- **Two Vitest majors**: The backend and the API client run Vitest 5 directly (import from `vitest`); the Nuxt frontend keeps its own `vitest` 4, since `@nuxt/test-utils` 3 doesn't support Vitest 5
- **Native build scripts**: `pnpm-workspace.yaml` has an `allowBuilds` map — when adding deps with native code (e.g. `@swc/core`), add them there or `pnpm install` will skip their build scripts.
- **Prisma `generated/` inside `src/`**: The Prisma client generates to `apps/backend/src/generated/prisma/` so NestJS SWC compiles it alongside application code. Import via `../generated/prisma/client.js`.
- **Prisma codegen required**: After any Prisma schema change, run `pnpm --filter backend exec prisma generate`
- **R sidecar is Docker-only**: The NLP service runs in Docker, not natively. It takes ~60s to start (health check at `/health`)
- **Same-origin routing in prod**: Caddy routes `/api/*` to the backend and everything else to the frontend. No CORS needed in production
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
