# App keeps no accounts, no texts and no database

The app had logins (Better-Auth), a Postgres database, a consent checkbox that saved an
analysed text, and a "Bisherige Analysen" list. Almost none of it earned its keep: the only
route behind a login was `POST /api/config`, the list was readable without one, and a saved
analysis with changed weights wrote a new `Config` row that became the default for every
visitor. The app is also being handed to the client, who will run it from a compose file
without the people who built it.

Decision (2026-11-22): the app computes and forgets. It has no accounts, stores nothing, and
needs no database. The removal lands in steps, tracked in
[#92](https://github.com/florianBieck/lesbarkeitsindex/issues/92); each step leaves `main`
deployable.

- **Nothing is saved.** The consent checkbox, `saveResult`, `GET /api/results` and the
  results page are gone, and the stored analyses are deleted. A result exists only in the
  response to `POST /api/calculate`, which carries the five configuration values it used and
  no `id`, `createdAt` or `configId`.
- **The submitted text is never stored or logged.** The backend logs its startup and
  nothing per request, the R sidecar logs no request bodies, and the edge Caddy writes no
  access log. Keep it that way: a log line that includes a text breaks this promise.
- **The configuration is a default plus a per-request override.** α and the four WK weights
  ([ADR 0001](./0001-lue-lix-adds-a-wk-surcharge-to-the-lix.md)) come from a `config.json`
  mounted into the backend and read on each request, so the operator changes the default by
  editing a file, with no restart. An absent file means the built-in defaults; an invalid
  one stops calculation with a clear message. Every visitor may override the values for
  their own request in "Erweiterte Einstellungen"; the override is forgotten on reload and
  the weights need not sum to 100.
- **No accounts.** Better-Auth, the login, logout and admin pages, `POST /api/config`, the
  seeded admin accounts and the menu go. `GET /api/config` stays as the frontend's only
  source of the defaults.
- **No database.** Prisma, Postgres, the migrations and their Docker and CI steps go once
  nothing reads them.
- **`POST /api/calculate` is rate-limited** per IP, since the endpoint is public and each
  call runs the R sidecar.
- **The client deploys by hand** from a `deploy/` folder (compose file, `Caddyfile`,
  `config.json`, German instructions) and version-tagged images. The deploy workflow and the
  current prod server are retired once the client's instance runs.

This changes three earlier ADRs, each of which has a note:
[0004](./0004-app-api-lives-under-api.md) (the route list),
[0005](./0005-backend-runs-on-express.md) (the Better-Auth bridge) and
[0007](./0007-frontend-drops-nuxt-for-a-vue-spa.md) ("a login-gated tool", cookies).

## Considered options

- **Keep the login for the admin page only:** keeps a database, two secrets and a seeded
  password for one form that changes five numbers a few times a year.
- **Default configuration in environment variables:** needs a container restart for every
  change and spreads five related numbers over five variables.
- **A browser-local history in place of the results list:** a second, hidden place where
  texts live, on shared school computers. Printing the page covers the need.
- **Remember a visitor's changed weights in the browser:** a teacher would get non-default
  scores weeks later without noticing.

## Consequences

- Changing the default needs access to the server's files; there is no screen for it.
- Results cannot be compared over time or shared by link. The calibration script
  (`docs/calibration/run-calibration.mjs`) already recomputes from the texts.
- A typo in `config.json` takes calculation down until it is fixed, instead of silently
  scoring with values nobody chose.
- The endpoint stays public; the rate limit is the only protection against load.
