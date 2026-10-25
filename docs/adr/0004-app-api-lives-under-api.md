# App API lives under `/api/`; the frontend owns every other path

The edge Caddy routed `/calculate*`, `/config*` and `/results*` to the backend, so these
prefixes also matched the frontend's own page paths: a hard reload of "Bisherige Analysen"
(`/results`) showed the backend's JSON instead of the page.

Decision (2026-10-24, revised 2026-10-25): every backend route lives under `/api/`, and every
other path belongs to the frontend.

- The backend sets one global prefix, `api`, with no exclusions, in `configureApp`
  (`apps/backend/src/configure-app.ts`), which `main.ts` and the e2e specs share. Routes:
  `/api/calculate`, `/api/config`, `/api/results`, `/api/auth/*` (Better-Auth, unchanged)
  and the health check at `/api/health`.
- The API client (`packages/api-client`) owns the prefix, and callers pass the bare origin.
- The edge `Caddyfile` routes `/api/*` to the backend and everything else to the frontend.
- No aliases for the old paths: the SPA is the API's only caller, and both move in the same
  deploy. No version segment (`/api/v1`) either.

The health check first stayed at `GET /`, but the backend will serve the built SPA, and `/`
then belongs to `index.html`. It moved to `/api/health` on 2026-10-25.

## Considered options

- **Rename the page** (e.g. `/analysen`): fixes `/results` only; `/config*` and any future
  page name can still clash with an API route.
- **Hash-mode routing** (`/#/results`): gives teachers uglier links and only hides the
  overlap; the two path spaces would still share one namespace.
