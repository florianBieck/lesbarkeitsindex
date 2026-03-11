# AGENTS.md

## Project Overview

**Lesbarkeitsindex (LÜ-LIX)** — a German text readability analysis tool. Bun monorepo with two apps under `apps/`:

- **Backend** (`apps/backend`): Elysia + Prisma (Postgres) + Better-Auth
- **Frontend** (`apps/frontend`): Nuxt 4 + Vue 3 + PrimeVue (Aura theme) + Tailwind CSS

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime / Package Manager | Bun (use `bun` everywhere, never `npm`/`yarn`/`node`) |
| Backend framework | [Elysia](https://elysiajs.com/) |
| Database | PostgreSQL 16 via Prisma 7 (`@prisma/adapter-pg` + `pg`) |
| Auth | [Better-Auth](https://www.better-auth.com/) with email/password + admin plugin |
| Schema validation | Prismabox (generates Elysia/TypeBox types from Prisma schema) |
| Frontend framework | Nuxt 4 (Vue 3, Composition API) |
| UI library | PrimeVue 4 with Aura preset |
| CSS | Tailwind CSS via `@nuxtjs/tailwindcss` |
| API client | `@elysiajs/eden` (type-safe Elysia client) |
| Charts | Chart.js + `chartjs-plugin-annotation` |
| Rich text | Quill |
| Dates | Day.js |

## CLAUDE.md Overrides

`CLAUDE.md` contains generic Bun guidance. The following project-specific rules take precedence:

- The frontend uses **Nuxt/Vue**, not React or Bun HTML imports. Do not use `Bun.serve()` for the frontend.
- The backend uses **Elysia** (`new Elysia()`), not `Bun.serve()` directly.
- The backend uses **`pg`** (with `@prisma/adapter-pg`) for Postgres, not `Bun.sql`.
- Use **PrimeVue** components for all UI work. Consult PrimeVue MCP tools for component docs.

## Monorepo Structure

```
/
├── apps/
│   ├── backend/           # Elysia API server (port 3000)
│   │   ├── generated/     # Prisma client + Prismabox types (gitignored, run `bun run generate`)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── index.ts   # Elysia app, routes, startup seeding
│   │   │   ├── db.ts      # Prisma client setup
│   │   │   ├── auth.ts    # Better-Auth config
│   │   │   └── result.ts  # Readability calculation logic (LIX, gSMOG, Flesch-Kincaid, WSTF)
│   │   ├── prisma.config.ts
│   │   └── package.json
│   └── frontend/          # Nuxt 4 app (dev port 3001)
│       ├── app/
│       │   ├── app.vue
│       │   ├── pages/     # index, login, logout, results, admin
│       │   ├── components/# result-view.vue
│       │   └── composables/# useAuthClient.ts
│       ├── nuxt.config.ts
│       └── package.json
├── docker-compose.yml     # Dev: Postgres only
├── docker-compose-prod.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── Caddyfile              # Prod reverse proxy
├── package.json           # Root workspace config
└── CLAUDE.md
```

## Development Setup

### Prerequisites

- Bun (latest)
- Docker (for Postgres)

### Install dependencies

```sh
bun install
```

### Start Postgres

```sh
docker compose up -d
```

Default credentials: `admin` / `admin`, database `lesbarkeitsindex`, port `5432`.

### Backend environment

Create `apps/backend/.env`:

```
DATABASE_URL=postgresql://admin:admin@localhost:5432/lesbarkeitsindex
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:3000
```

### Generate Prisma client and Prismabox types

```sh
bun run --cwd apps/backend generate
```

### Run database migrations

```sh
bun run --cwd apps/backend migrate
```

### Start backend (port 3000)

```sh
bun run --cwd apps/backend dev
```

### Start frontend (port 3001)

```sh
bun run --cwd apps/frontend dev
```

The frontend reads `NUXT_PUBLIC_API_BASE` (defaults to `http://localhost:3000`).

## Cursor Cloud Specific Instructions

### Running the full stack locally

1. `docker compose up -d` (Postgres)
2. Create `apps/backend/.env` with the values shown above
3. `bun run --cwd apps/backend generate` (Prisma + Prismabox codegen)
4. `bun run --cwd apps/backend migrate` (apply migrations)
5. `bun run --cwd apps/backend dev` (backend on :3000)
6. `bun run --cwd apps/frontend dev` (frontend on :3001)

### Testing the frontend

Open `http://localhost:3001` in Chrome to test the Nuxt frontend.

### Testing the backend

The Elysia backend runs on `http://localhost:3000`. You can use `curl` or Eden for API calls. Key endpoints:

- `GET /` — health check
- `GET /config` — current readability config
- `POST /config` — update config (requires auth)
- `POST /calculate` — calculate readability for text
- `GET /results?page=0&limit=10` — paginated results
- `POST /api/auth/*` — Better-Auth endpoints

## Code Conventions

- **Language**: TypeScript everywhere, strict mode
- **Frontend components**: Vue 3 Composition API (`<script setup lang="ts">`)
- **UI components**: Always use PrimeVue; consult PrimeVue MCP tools for API details
- **Styling**: Tailwind utility classes; PrimeVue Aura theme tokens
- **API types**: Backend exports `App` type from `apps/backend/src/index.ts`; frontend uses Eden treaty for type-safe API calls
- **Database changes**: Edit `apps/backend/prisma/schema.prisma`, then run `bun run --cwd apps/backend generate` and `bun run --cwd apps/backend migrate`
- **Auth**: Use `useAuthClient()` composable in frontend; protected backend routes use `auth: true` macro
- **Runtime config**: Use `useRuntimeConfig().public.apiBase` for the API base URL in frontend code

## Linting

Frontend only:

```sh
bun run --cwd apps/frontend lint
```

Uses `@nuxt/eslint` with default Nuxt config.

## Testing

No automated tests exist yet. The backend `test` script is a placeholder. The frontend has `@nuxt/test-utils` installed but no test files.

When writing new tests:

- Backend: use `bun test` with `bun:test` (as specified in `CLAUDE.md`)
- Frontend: use `@nuxt/test-utils` with Vitest (Nuxt convention)

## CI/CD

- **`.github/workflows/build.yml`**: On push to `main` or tags — installs deps with `bun install --frozen-lockfile`, builds Docker images for backend and frontend, pushes to `ghcr.io`
- **`.github/workflows/deploy.yml`**: Manual trigger — deploys to Hetzner via SSH using `docker-compose-prod.yml`

## Key Domain Concepts

The app computes German readability indices:

- **LIX** (Lesbarkeitsindex)
- **gSMOG** (simplified measure of gobbledygook, German variant)
- **Flesch-Kincaid** (adapted for German)
- **WSTF** (Wiener Sachtextformel variant)
- **LÜ-LIX** (custom weighted composite score)

Parameters are stored in a `Config` model; analysis results in a `Result` model. The weighting of indices is configurable via the admin page.
