# Repo drops vite-plus for Vite, Vitest, oxlint and oxfmt

The repo ran its toolchain through vite-plus (`vp`), which bundles Vite, Vitest, oxlint and
oxfmt behind one CLI. Decision (2026-11-08): the whole repo drops vite-plus and runs the tools
it wraps directly, called through pnpm scripts. The backend and the API client test on Vitest
5, the root lints with oxlint and formats with oxfmt, and the Vue SPA that replaces Nuxt builds
on plain Vite. The reasons:

- `vp` is a shell function, so CI and agents can't call it by name. CI already ran pnpm
  directly.
- A Vue app on vite-plus needs a hand-pinned `vite` → `@voidzero-dev/vite-plus-core` alias,
  or pnpm installs a second Vite for `@vitejs/plugin-vue`
  ([vite-plus#1932](https://github.com/voidzero-dev/vite-plus/issues/1932)).
- `vp check` can't type-check `.vue` files, so `vue-tsc` has to run on its own anyway.
- `vp migrate` writes `vite@*`/`vitest@*` overrides into `pnpm-workspace.yaml` that broke
  `nuxt build` and the frontend tests.
- oxlint, oxfmt and Vitest moved on vite-plus's release schedule instead of their own.

The switch shipped as its own PR, before the frontend drops Nuxt, on the versions vite-plus
1.4.0 ran (oxlint 1.89.0, oxfmt 0.74.0, Vitest 5.0.5), and changed no lint finding, formatting
or test result. The root `vite.config.ts` split into `.oxlintrc.json` (ignore patterns) and
`.oxfmtrc.json` (`singleQuote`); its `test` block went with no replacement, so `pnpm test`
(each package's own `test` script) is the one way to run every test.

## Considered options

- **Keep vite-plus and pin the alias:** works, but every Vite-ecosystem plugin added later
  needs the same check, and the other reasons stand.
- **ESLint and Prettier instead of oxlint and oxfmt:** new rules and a reformatting diff
  across the repo, for no finding the current setup misses. oxlint still can't lint Vue
  templates; accepted.
