# Lesbarkeitsindex (LÜ-LIX)

German text readability analysis tool for teachers and educators. Computes readability indices (LIX, gSMOG, Flesch-Kincaid, WSTF) and a custom weighted composite score (LÜ-LIX) tailored for German texts.

## Tech Stack

- **Backend**: NestJS + Express; no database
- **Frontend**: Vue 3 SPA (Vite, vue-router), PrimeVue 4, Tailwind CSS, Chart.js; served by the backend
- **NLP**: R Plumber sidecar (sentence splitting, syllable counting, POS tagging)
- **Toolchain**: pnpm, Vite, Vitest, vue-tsc, oxlint, oxfmt

## Prerequisites

- Node.js (major in `.node-version`) and pnpm (version in `package.json` → `packageManager`). Node 26 no longer ships corepack: `npm install -g corepack && corepack enable` sets up the pinned pnpm
- Docker (for the R sidecar)

## Quick Start

```bash
# Start the R sidecar
docker compose up -d

# Install dependencies
pnpm install

# Copy and edit environment variables
cp .env.example .env

# Start backend (port 3000) and frontend (port 3001, proxies /api to the backend)
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
  frontend/         # Vue 3 SPA (Vite)
packages/
  api-client/       # Typed API client (injected fetcher)
r-sidecar/          # R Plumber NLP service (Docker only)
```

## License

Private
