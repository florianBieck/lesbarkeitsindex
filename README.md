# Lesbarkeitsindex (LÜ-LIX)

German text readability analysis tool for teachers and educators. Computes readability indices (LIX, gSMOG, Flesch-Kincaid, WSTF) and a custom weighted composite score (LÜ-LIX) tailored for German texts.

## Tech Stack

- **Backend**: NestJS + Fastify, Prisma 7, PostgreSQL, Better-Auth
- **Frontend**: Nuxt 4, PrimeVue 4, Tailwind CSS, Chart.js
- **NLP**: R Plumber sidecar (sentence splitting, syllable counting, POS tagging)
- **Toolchain**: [Vite+](https://viteplus.dev/) (`vp` CLI), pnpm, Vitest, oxlint

## Prerequisites

- [Vite+](https://viteplus.dev/) (`curl -fsSL https://vite.plus | bash`)
- Docker (for PostgreSQL and R sidecar)

## Quick Start

```bash
# Start Postgres + R sidecar
docker compose up -d

# Install dependencies (also generates Prisma client)
vp install

# Copy and edit environment variables
cp apps/backend/.env.example apps/backend/.env

# Run database migrations
vp exec --filter backend prisma migrate deploy

# Start backend (port 3000) and frontend (port 3001)
vp exec --filter backend nest start --watch
vp exec --filter frontend nuxt dev
```

## Commands

```bash
vp install          # Install all dependencies
vp test             # Run all unit tests
vp lint             # Lint with oxlint
vp fmt              # Format with oxfmt
vp check            # Lint + format check
```

## Project Structure

```
apps/
  backend/          # NestJS/Fastify API
  frontend/         # Nuxt 4 SPA
packages/
  api-client/       # Typed API client (ofetch)
r-sidecar/          # R Plumber NLP service (Docker only)
```

## License

Private
