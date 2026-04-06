# Lesbarkeitsindex (LÜ-LIX)

German text readability analysis tool for teachers and educators. pnpm monorepo with NestJS/Fastify backend, Nuxt 4 frontend, and R NLP sidecar. Managed by Vite+ (`vp` CLI).

## Vite+ / pnpm First

Use `vp` (Vite+ CLI) for all toolchain operations — never `npm`, `yarn`, `bun`, or `node` directly. Use `vp exec` to run binaries in the managed environment. pnpm is the package manager (managed by Vite+).

## Tech Stack Rules

- **Toolchain**: Vite+ (`vp` CLI) — install, dev, test, lint, fmt, build
- **Package manager**: pnpm (managed by Vite+)
- **Runtime**: Node.js (not Bun)
- **Backend**: NestJS with Fastify adapter (`@nestjs/platform-fastify`)
- **Database**: Prisma 7 with `@prisma/adapter-pg` + `pg`
- **Frontend**: Nuxt 4 (Vue 3 Composition API)
- **UI**: PrimeVue 4 with Aura theme — use PrimeVue components for all UI work
- **CSS**: Tailwind utility classes + PrimeVue Aura theme tokens
- **Auth**: Better-Auth with email/password + admin plugin
- **Schema validation**: Zod (backend DTOs validated with Zod schemas)
- **API client**: `@lesbarkeitsindex/api-client` package using `ofetch` for typed frontend → backend calls
- **Linting**: oxlint (via Vite+)
- **Formatting**: oxfmt (via Vite+)
- **Testing**: Vitest for all tests
- **Build**: NestJS SWC compiler (`nest build --builder swc`)
- **Charts**: Chart.js + `chartjs-plugin-annotation`
- **Rich text**: Quill
- **Dates**: Day.js

## Monorepo Structure

```
apps/
  backend/            # NestJS/Fastify API (port 3000)
    src/
      main.ts         # Bootstrap, CORS, Swagger, seed
      app.module.ts   # Root module
      health.controller.ts
      prisma/         # PrismaModule + PrismaService
      auth/           # AuthModule, AuthService, AuthController, AuthGuard
      config/         # ConfigController (GET/POST /config)
      calculate/      # CalculateController, CalculateService
        result/       # Pure computation functions
          index.ts    # computeReadability() — barrel exports
          basic-metrics.ts
          indices.ts  # LIX, gSMOG, FK, WSTF, RIX
          linguistic-features.ts
          grapheme-analysis.ts
          text-features.ts
          heading-extraction.ts
      results/        # ResultsController (GET /results)
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
vp install

# 3. Generate Prisma client
vp exec --filter backend prisma generate

# 4. Run migrations
vp exec --filter backend prisma migrate deploy

# 5. Start backend (port 3000)
vp exec --filter backend nest start --watch

# 6. Start frontend (port 3001)
vp exec --filter frontend nuxt dev
```

### Environment

**`.env`** (project root, required):

```
DATABASE_URL=postgresql://admin:admin@localhost:5432/lesbarkeitsindex?schema=public
R_SIDECAR_URL=http://localhost:8787
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:3000
ADMIN_EMAILS=
```

Single `.env` at the project root — used by both backend (via `ConfigModule.forRoot()`) and frontend (`NUXT_PUBLIC_API_BASE`, defaults to `http://localhost:3000`).

## Testing

```sh
# Backend unit tests (Vitest)
vp exec --filter backend vitest run

# Frontend unit tests (Vitest + @nuxt/test-utils)
pnpm --filter frontend run test:unit

# Frontend E2E (Playwright, requires running stack)
pnpm --filter frontend run test:e2e

# Run all workspace tests from root
vp test
```

All tests use Vitest. Frontend E2E uses Playwright (Chromium only, single worker). Use `vp exec` for running binaries directly; use `pnpm --filter` for npm scripts defined in package.json.

## API Endpoints

- `GET /` — health check
- `GET /config` — current readability config
- `POST /config` — update config (requires auth)
- `POST /calculate` — analyze text readability
- `GET /results?page=0&limit=10` — paginated results
- `/api/auth/*` — Better-Auth endpoints
- `GET /api` — Swagger UI (dev only)

## Code Conventions

- TypeScript strict mode everywhere
- Frontend: `<script setup lang="ts">` with Composition API
- Backend: NestJS modules with controllers, services, and Zod DTOs
- API client: `createApiClient(baseURL)` from `@lesbarkeitsindex/api-client`
- DB changes: edit `prisma/schema.prisma` → `vp exec prisma generate` → `vp exec prisma migrate dev`
- Auth in frontend: `useAuthClient()` composable
- Runtime config: `useRuntimeConfig().public.apiBase` for API base URL

## Linting & Formatting

```sh
# Lint all workspaces (oxlint via Vite+)
vp lint

# Format all workspaces (oxfmt via Vite+)
vp fmt

# Check both
vp check
```

## CI/CD

- **`.github/workflows/build.yml`**: On push to `main` or tags — `pnpm install --frozen-lockfile`, runs tests, builds Docker images for backend/frontend/r-sidecar, pushes to `ghcr.io`

## Gotchas

- **`vp` in scripts/CI**: `vp` is a shell function loaded from your profile. In non-interactive shells (CI, Bash tool), use the full path `~/.vite-plus/bin/vp`. CI uses `pnpm` directly instead.
- **Native build scripts**: Root `package.json` has `pnpm.onlyBuiltDependencies` — when adding deps with native code (e.g. `@swc/core`), add them to this list or `pnpm install` will skip their build scripts.
- **Prisma `generated/` inside `src/`**: The Prisma client generates to `apps/backend/src/generated/prisma/` so NestJS SWC compiles it alongside application code. Import via `../generated/prisma/client.js`.
- **Prisma codegen required**: After any Prisma schema change, run `vp exec --filter backend prisma generate`
- **R sidecar is Docker-only**: The NLP service runs in Docker, not natively. It takes ~60s to start (health check at `/health`)
- **Same-origin routing in prod**: Caddy reverse proxy routes `/api/auth/*`, `/calculate`, `/config`, `/results` to backend; everything else to frontend. No CORS needed in production
- **ADMIN_EMAILS**: Comma-separated list in root `.env`. If empty, any logged-in user gets admin access
- **Better-Auth trustedOrigins**: Configured in `apps/backend/src/auth/auth.service.ts` — update when adding new domains
- **NestJS + Better-Auth**: Auth routes are handled by a wildcard Fastify controller that converts requests to Web API format

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
