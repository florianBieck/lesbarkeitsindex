
# Lesbarkeitsindex (LÜ-LIX)

German text readability analysis tool for teachers and educators. Bun monorepo with Elysia backend, Nuxt 4 frontend, and R NLP sidecar.

## Bun First

Use `bun` everywhere — never `npm`, `yarn`, `node`, or `ts-node`. Bun auto-loads `.env`, so don't use dotenv.

## Tech Stack Rules

- **Backend**: Elysia (`new Elysia()`), not `Bun.serve()` directly
- **Database**: Prisma 7 with `@prisma/adapter-pg` + `pg`, not `Bun.sql` or `bun:sqlite`
- **Frontend**: Nuxt 4 (Vue 3 Composition API), not React or Bun HTML imports
- **UI**: PrimeVue 4 with Aura theme — use PrimeVue components for all UI work
- **CSS**: Tailwind utility classes + PrimeVue Aura theme tokens
- **Auth**: Better-Auth with email/password + admin plugin
- **Schema validation**: Prismabox generates TypeBox types from Prisma schema for Elysia request validation
- **API client**: `@elysiajs/eden` treaty for type-safe frontend → backend calls
- **Charts**: Chart.js + `chartjs-plugin-annotation`
- **Rich text**: Quill
- **Dates**: Day.js

## Monorepo Structure

```
apps/
  backend/          # Elysia API (port 3000)
    src/
      index.ts      # Routes, startup seeding — exports App type
      db.ts         # Prisma client
      auth.ts       # Better-Auth config
      result/       # Readability calculation modules
        index.ts    # Orchestrator + barrel exports
        basic-metrics.ts
        indices.ts  # LIX, gSMOG, FK, WSTF, RIX
        linguistic-features.ts
        grapheme-analysis.ts
        text-features.ts
      r-sidecar.ts  # R service HTTP client
    prisma/
      schema.prisma # Config, Result, User, Session models
    generated/      # Prisma client + Prismabox types (gitignored)
  frontend/         # Nuxt 4 SPA (dev port 3001)
    app/
      pages/        # index, login, logout, results
      components/   # result-view.vue
      composables/  # useAuthClient.ts
    e2e/            # Playwright specs
r-sidecar/          # R Plumber API for NLP (port 8787, Docker only)
```

## Development

```sh
# 1. Start Postgres + R sidecar
docker compose up -d

# 2. Install deps
bun install

# 3. Generate Prisma client + Prismabox types
bun run --cwd apps/backend generate

# 4. Run migrations
bun run --cwd apps/backend migrate

# 5. Start backend (port 3000)
bun run --cwd apps/backend dev

# 6. Start frontend (port 3001)
bun run --cwd apps/frontend dev
```

### Environment

**`apps/backend/.env`** (required):
```
DATABASE_URL=postgresql://admin:admin@localhost:5432/lesbarkeitsindex?schema=public
R_SIDECAR_URL=http://localhost:8787
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:3000
```

Frontend reads `NUXT_PUBLIC_API_BASE` (defaults to `http://localhost:3000`).

## Testing

```sh
# Backend unit tests (bun:test)
bun test --cwd apps/backend

# Frontend unit tests (Vitest + @nuxt/test-utils)
bun run --cwd apps/frontend test:unit

# Frontend E2E (Playwright, requires running stack)
bun run --cwd apps/frontend test:e2e

# Frontend E2E with UI
bun run --cwd apps/frontend test:e2e:ui

# Run all workspace tests from root
bun run test
```

Backend uses `bun:test`. Frontend unit tests use Vitest with Nuxt environment. Frontend E2E uses Playwright (Chromium only, single worker).

## API Endpoints

- `GET /` — health check
- `GET /config` — current readability config
- `POST /config` — update config (requires auth)
- `POST /calculate` — analyze text readability
- `GET /results?page=0&limit=10` — paginated results
- `/api/auth/*` — Better-Auth endpoints

## Code Conventions

- TypeScript strict mode everywhere
- Frontend: `<script setup lang="ts">` with Composition API
- API types: backend exports `App` type; frontend uses Eden treaty
- DB changes: edit `prisma/schema.prisma` → `bun run generate` → `bun run migrate`
- Auth in frontend: `useAuthClient()` composable
- Runtime config: `useRuntimeConfig().public.apiBase` for API base URL

## Linting

```sh
# Frontend (uses @nuxt/eslint with default Nuxt config)
bun run --cwd apps/frontend lint

# Backend (uses typescript-eslint)
bun run --cwd apps/backend lint

# Lint all workspaces from root
bun run lint
```

## CI/CD

- **`.github/workflows/build.yml`**: On push to `main` or tags — `bun install --frozen-lockfile`, builds Docker images for backend/frontend/r-sidecar, pushes to `ghcr.io`
- **`.github/workflows/deploy.yml`**: Manual trigger — deploys to Hetzner via SSH using `docker-compose-prod.yml`

## Gotchas

- **Prismabox codegen required**: After any Prisma schema change, run `bun run --cwd apps/backend generate` — both Prisma client and TypeBox validation types need regeneration
- **R sidecar is Docker-only**: The NLP service runs in Docker, not natively. It takes ~60s to start (health check at `/health`)
- **Same-origin routing in prod**: Caddy reverse proxy routes `/api/auth/*`, `/calculate`, `/config`, `/results` to backend; everything else to frontend. No CORS needed in production
- **ADMIN_EMAILS**: Comma-separated list in root `.env`. If empty, any logged-in user gets admin access
- **Better-Auth trustedOrigins**: Configured in `apps/backend/src/auth.ts` — update when adding new domains

## Key Domain Concepts

The app computes German readability indices:

- **LIX** (Lesbarkeitsindex)
- **gSMOG** (simplified measure of gobbledygook, German variant)
- **Flesch-Kincaid** (adapted for German)
- **WSTF** (Wiener Sachtextformel variant)
- **LÜ-LIX** (custom weighted composite score)

Parameters are stored in a `Config` model; analysis results in a `Result` model. The weighting of indices is configurable via the admin page.

## Design Context

### Users
Teachers and educators assessing text difficulty for students learning to read. They use this tool in classroom/preparation contexts to evaluate whether texts are appropriate for their students' reading level. Many may not be technically savvy — the interface must be self-explanatory.

### Brand Personality
**Friendly, Approachable, Simple.** The tool should feel like a helpful colleague, not a technical system. Language is warm (German), interactions are forgiving, and complexity is hidden behind clear defaults.

### Aesthetic Direction
**Warm & Educational.** Soft colors, rounded shapes, inviting feel like a learning platform. Light mode only — no dark mode. Content-first with generous white space. The existing PrimeVue Aura theme provides the foundation; customizations should lean warmer and softer.

- **Color palette**: Build on PrimeVue Aura surface colors. Readability scores use green/yellow/red semantic colors. Accent colors should feel warm, not corporate.
- **Typography**: Clear, readable. Generous sizing for educators who may use the tool on various devices.
- **Spacing**: Comfortable, not cramped. Prioritize scannability over information density.
- **Charts**: Use the existing Chart.js color palette but ensure accessibility (colorblind-safe combinations).

### Design Principles
1. **Clarity over cleverness** — Every element should be immediately understandable. No jargon in the UI, no ambiguous icons.
2. **Warmth over sterility** — Soft edges, friendly colors, encouraging tone. This is a tool for learning, not auditing.
3. **Progressive disclosure** — Show essential results first, let users drill into details. Don't overwhelm with data.
4. **Accessibility as baseline** — WCAG AA compliance. Sufficient contrast, readable font sizes, keyboard navigable.
5. **Content-first** — The text being analyzed and its results are the hero. Chrome and decoration serve the content, never compete with it.
