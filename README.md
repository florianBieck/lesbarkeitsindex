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

## Running it in production

`deploy/` is everything a server needs: one `docker-compose.yml` (Caddy, backend, R sidecar) with the images pinned to a release tag, a `Caddyfile`, the default `config.json`, and a `.env` that holds only the domain. [`deploy/README.md`](./deploy/README.md) (German) covers starting, updating, changing the default configuration, the footer links and reading logs.

CI builds the images for amd64 and arm64 and pushes them to `ghcr.io`. A release: set the new tag on both images in `deploy/docker-compose.yml`, merge, then push that `v*` tag from `main`; CI builds both images under it.

Submitted texts are never stored or logged (ADR 0008).

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
deploy/             # What a server needs to run the app (compose file, Caddyfile, config.json)
```

## License

Private
