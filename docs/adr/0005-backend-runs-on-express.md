# Backend runs on Express instead of Fastify

The backend will serve the built SPA, so it needs static files plus a fallback to `index.html`
for every path outside `/api/` and `/assets/`. Decision (2026-10-26): the backend runs on
`@nestjs/platform-express` (Express 5) instead of `@nestjs/platform-fastify`. The switch ships
as its own PR and its own deploy, before the frontend drops Nuxt. The reasons:

- `@nestjs/serve-static` honours its `exclude` option on Express, and the SPA serving will use it.
- Express is Nest's default adapter, and its docs, examples and third-party modules assume it.
- Express is the more familiar framework for the people maintaining this code.
- helmet is plain Express middleware, so `configureApp` stays synchronous.

This reverses [What serves the built SPA in the frontend image?](https://github.com/florianBieck/lesbarkeitsindex/issues/52),
which kept Fastify because a switch put the login path at risk. On Express, Better-Auth's sign-out
loses two of its three `Set-Cookie` headers if the bridge copies headers one by one:
`res.header()` replaces. `AuthController` now sends every cookie from
`response.headers.getSetCookie()` in a single `res.setHeader('set-cookie', …)`, and the
`api-prefix` e2e spec checks that all three arrive. The switch also deploys on its own, so a
login problem after that deploy has one cause.

## Considered options

- **Stay on Fastify and serve the SPA with `@fastify/static`:** works, but needs two
  `@fastify/static` registrations plus a hand-written catch-all route.
- **Better-Auth's `toNodeHandler` inside the controller:** works only because `better-call`
  reuses the `req.body` Nest has already parsed, which Better-Auth's docs warn against, and it
  behaves differently on Better-Auth 1.5 and 1.7.
- **Mount Better-Auth's handler on the raw Express instance:** bypasses Nest's guards and
  filters, and needs the Better-Auth instance in `configureApp`, so the `api-prefix` spec,
  which mocks `AuthService` for a list of controllers, would have to change shape.

## Consequences

- JSON bodies are capped at 1 MiB (`app.useBodyParser('json', { limit: '1mb' })` in
  `configureApp`), Fastify's limit. Express's 100 KB default would answer 413 to a long text with
  umlauts that `POST /api/calculate`'s schema allows.
- `X-Powered-By` is turned off; Fastify never sent it.
- Express defaults stay as they are, though they differ from Fastify's:
  - weak ETags on API responses, and 304 for a matching `If-None-Match`;
  - `text/html` for string responses such as `GET /api/health`;
  - case-insensitive, non-strict routing (`/API/HEALTH` and `/api/health/` answer);
  - a request without a JSON body reaches the controller as `undefined` and gets 422 from the
    schema, where Fastify answered 415 or 400;
  - the `simple` query parser instead of `qs`.
