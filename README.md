# Lesbarkeitsindex (LÜ-LIX)

German text readability analysis tool for teachers and educators. Computes readability indices (LIX, gSMOG, Flesch-Kincaid, WSTF) and a custom weighted composite score (LÜ-LIX) tailored for German texts.

## Tech Stack

- **Backend**: NestJS + Express, Prisma 7, PostgreSQL, Better-Auth
- **Frontend**: Nuxt 4, PrimeVue 4, Tailwind CSS, Chart.js
- **NLP**: R Plumber sidecar (sentence splitting, syllable counting, POS tagging)
- **Toolchain**: pnpm, Vitest, oxlint, oxfmt

## Prerequisites

- Node.js (major in `.node-version`) and pnpm (version in `package.json` → `packageManager`)
- Docker (for PostgreSQL and R sidecar)

## Quick Start

```bash
# Start Postgres + R sidecar
docker compose up -d

# Install dependencies (also generates Prisma client)
pnpm install

# Copy and edit environment variables
cp .env.example .env

# Run database migrations
pnpm --filter backend exec prisma migrate deploy

# Start backend (port 3000) and frontend (port 3001)
pnpm dev
```

## Commands

```bash
pnpm install        # Install all dependencies
pnpm test           # Run all unit tests
pnpm run lint       # Lint with oxlint
pnpm run fmt        # Format with oxfmt
pnpm run check      # Format check + lint
```

## Project Structure

```
apps/
  backend/          # NestJS/Express API
  frontend/         # Nuxt 4 SPA
packages/
  api-client/       # Typed API client (injected $fetch)
r-sidecar/          # R Plumber NLP service (Docker only)
```

## License

Private
