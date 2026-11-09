# Repo drops vite-plus for Vite, Vitest, oxlint and oxfmt

The repo ran its toolchain through vite-plus (`vp`), which bundles Vite, Vitest, oxlint and
oxfmt behind one CLI. Decision (2026-11-08): the whole repo drops vite-plus and runs the tools
it wraps directly, called through pnpm scripts. The backend and the API client test on Vitest
5, the root lints with oxlint and formats with oxfmt, and the Vue SPA that replaces Nuxt will
build on plain Vite. The reasons:

- `vp` is a shell function, so CI and agents can't call it by name. CI already ran pnpm
  directly.
- A Vue app on vite-plus needs a hand-pinned `vite` → `@voidzero-dev/vite-plus-core` alias,
  or pnpm installs a second Vite for `@vitejs/plugin-vue`
  ([#47](https://github.com/florianBieck/lesbarkeitsindex/issues/47),
  [vite-plus#1932](https://github.com/voidzero-dev/vite-plus/issues/1932)).
- `vp check` can't type-check `.vue` files, so `vue-tsc` has to run on its own anyway.
- `vp migrate` writes `vite@*`/`vitest@*` overrides into `pnpm-workspace.yaml` that broke
  `nuxt build` and the frontend tests.
- oxlint, oxfmt and Vitest moved on vite-plus's release schedule instead of their own.

The switch ships as its own PR, before the frontend drops Nuxt, on the versions vite-plus
1.4.0 runs (oxlint 1.89.0, oxfmt 0.74.0, Vitest 5.0.5), and changes no lint finding, formatting
or test result. The root `vite.config.ts` splits into `.oxlintrc.json` (ignore patterns) and
`.oxfmtrc.json` (`singleQuote`). Its `test` block goes with no replacement, so `pnpm test` (each
package's own `test` script) is the one way to run every package's unit tests.

## Considered options

- **Keep vite-plus and pin the alias:** fixes the second Vite, but leaves the other reasons
  standing.
- **ESLint and Prettier instead of oxlint and oxfmt:** new rules and a reformatting diff
  across the repo. oxlint still can't lint Vue templates; accepted.
