# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Lesbarkeitsindex (LÜ-LIX) is a German text readability calculator. Bun monorepo with two workspaces:
- **Backend** (`apps/backend`): Elysia + Prisma 7 + PostgreSQL + Better Auth, port 3000
- **Frontend** (`apps/frontend`): Nuxt 4 + PrimeVue + Tailwind CSS, port 3001

### Running services

1. **PostgreSQL**: `sudo docker compose up -d postgres` (from repo root). Uses default creds `admin:admin`, db `lesbarkeitsindex`.
2. **Backend**: `cd apps/backend && bun run dev` — requires `.env` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
3. **Frontend**: `cd apps/frontend && bun run dev` — uses `NUXT_PUBLIC_API_BASE` (defaults to `http://localhost:3000`).

Before first backend start, run `bunx prisma generate` and `bunx prisma migrate deploy` from `apps/backend`.

### Backend .env template

```
DATABASE_URL="postgresql://admin:admin@localhost:5432/lesbarkeitsindex"
BETTER_AUTH_SECRET="dev-secret-key-for-local-development-only"
BETTER_AUTH_URL="http://localhost:3000"
```

### Seeded accounts

On startup the backend seeds two admin accounts (password: `#Test1234`):
- `info@florianbieck.com`
- `info@beate-lessmann.de`

### Gotchas

- The frontend's `eslint.config.mjs` imports `.nuxt/eslint.config.mjs` as a bare specifier. Running `bunx eslint .` standalone fails. The lint config only works within Nuxt's dev tooling context. Run `bunx nuxt prepare` first if you need `.nuxt` generated types.
- The backend uses Prisma with `@prisma/adapter-pg` (driver adapter pattern). The generated Prisma client is in `apps/backend/generated/prisma` and Prismabox types in `apps/backend/generated/prismabox` — both are gitignored, so `bunx prisma generate` must run after install.
- Docker (with `fuse-overlayfs` storage driver and `iptables-legacy`) is required for PostgreSQL.
- The frontend imports `type App` directly from `../../../backend/src` for end-to-end type safety via Eden treaty.
