# How vite-plus 1.4 builds, serves and tests a Vue 3 SPA

Research for [#47](https://github.com/florianBieck/lesbarkeitsindex/issues/47), a ticket on the map [#46](https://github.com/florianBieck/lesbarkeitsindex/issues/46) (Nuxt 4 to a plain Vue 3 SPA). Done on 2026-10-24.

This note reports facts and trade-offs. Three decisions belong to their grilling tickets and are left open here: how the SPA reaches the API, explicit vs. auto imports, and the type-check strategy.

## Method

- **Primary sources:** the vite-plus repo at tag [`v1.4.0`](https://github.com/voidzero-dev/vite-plus/tree/v1.4.0): `docs/guide/*`, `docs/config/*`, `packages/*/package.json`, the migrator source, and the CLI snapshot fixtures. Also the vite-plus issue tracker, the oxc issue tracker, the Vue, Vite, Vitest and PrimeVue docs, npm registry metadata, and this repo's own config.
- **Experiment:** a throwaway pnpm workspace laid out like this repo (`apps/web` plus a root `vite.config.ts`). Toolchain: pnpm 11.9.0 and Node 24.22.1. Versions under test:

  | Package                        | Version                                                                                                                  |
  | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
  | vite-plus                      | 1.4.0, which bundles Vite 8.3.5, Rolldown 1.2.15, Vitest 5.0.5, Oxlint 1.89.0, Oxfmt 0.74.0 and oxlint-tsgolint 7.0.2004 |
  | @vitejs/plugin-vue             | 6.0.10                                                                                                                   |
  | vue                            | 3.5.44                                                                                                                   |
  | vue-router                     | 4.6.4                                                                                                                    |
  | primevue                       | 4.5.5                                                                                                                    |
  | @primeuix/themes               | 2.0.3                                                                                                                    |
  | @vue/test-utils                | 2.5.1                                                                                                                    |
  | happy-dom                      | 20.14.6                                                                                                                  |
  | vue-tsc                        | 3.3.13                                                                                                                   |
  | typescript                     | 5.9.3                                                                                                                    |
  | unplugin-auto-import           | 21.1.0                                                                                                                   |
  | unplugin-vue-components        | 32.1.0                                                                                                                   |
  | @primevue/auto-import-resolver | 4.5.5                                                                                                                    |

  The experiment also ran `vp create vite:application -- --template vue-ts` (vite-plus 1.4.0's own Vue scaffold) as a reference. Every claim marked **(verified)** below was reproduced there.

## Summary

1. **Config:** `apps/frontend/vite.config.ts` uses `defineConfig` from `vite-plus`. `plugins: [vue()]` comes from `@vitejs/plugin-vue` 6.x, and the `test` block lives in the same file. Under vite-plus-core, plugin-vue 6.0.10 builds, serves and tests SFCs. **(verified)**
2. **The `vite` peer needs care under pnpm.** Unless `apps/frontend` declares `vite` itself, `@vitejs/plugin-vue` and `unplugin-vue-components` make pnpm install a second, upstream `vite@8.3.5`, plus `rolldown`. Neither a `vite@*` nor a bare `vite` workspace override changes that. A direct `"vite": "npm:@voidzero-dev/vite-plus-core@1.4.0"` devDependency in the app package gives one Vite. That is the layout `vp create` scaffolds. **(verified)** Details in [§2](#2-the-vite-peer-one-vite-or-two).
3. **Dev, build and preview** are plain Vite 8:
   - `vp dev` serves `index.html` and handles `server.proxy`, history fallback and SFC HMR.
   - `vp build` writes `dist/`.
   - `vp preview` serves `dist/` with history fallback, and its `preview.proxy` defaults to `server.proxy`. **(verified)**
4. **Tests:** `vp test` runs Vitest 5.0.5 against the app's `vite.config.ts`, so SFCs and unplugins are compiled for tests too. `@vue/test-utils` `mount` works with PrimeVue installed as a global plugin, on happy-dom, with imports from `vite-plus/test`. **(verified)**
5. **Type checking:** `vp check` does **not** type-check `.vue` files. Its tsgolint (TypeScript Go) path cannot read SFCs, and it needs a `declare module '*.vue'` shim even to resolve `.vue` imports from `.ts` files. `vue-tsc` is the tool that checks SFCs, and vite-plus's own Vue scaffold builds with `vue-tsc -b && vp build`. **(verified)**
6. **Lint and format:** `vp fmt` (Oxfmt) formats `.vue` files, templates included. `vp lint` (Oxlint) lints the `<script>` blocks but does not understand templates. **(verified)**
7. **Plugins:** `unplugin-auto-import` 21, `unplugin-vue-components` 32 and `@primevue/auto-import-resolver` 4.5.5 work under `vp dev`, `vp build` and `vp test`. Their generated `*.d.ts` files fail `vp check`'s format step unless they are listed in `fmt.ignorePatterns`. **(verified)**
8. **Monorepo:** a root-level `vp test` uses the root `vite.config.ts`, which has no Vue plugin, so it fails on frontend SFC tests. Setting `test.projects: ['apps/*']` in the root config fixes that. Vitest 5 no longer looks for configs in parent directories. **(verified)**

## 1. Config shape

- vite-plus keeps all config in one `vite.config.ts`. The standard Vite fields (`plugins`, `resolve`, `server`, `build`, `preview`) sit next to the vite-plus blocks (`lint`, `fmt`, `check`, `test`, `run`, `staged`, `pack`). Sources: [config/index.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/config/index.md) and [config/build.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/config/build.md).
- `defineConfig` comes from `vite-plus`. The package itself owns only `defineConfig`, `defineProject` and `lazyPlugins`. Other `vite` imports keep resolving through the `@voidzero-dev/vite-plus-core` alias. See [migrate-rules.md, "`vite` Imports"](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/migrate-rules.md).
- `lazyPlugins(() => [vue()])` skips loading plugins when vite-plus reads the config only for metadata (`lint`, `fmt`, `check`, `staged`, tasks, editor tooling). Plugins still load for `dev`, `build`, `test` and `preview`. See [troubleshooting.md, "Slow config loading"](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/troubleshooting.md). The vite-plus Vue scaffold uses it.
- **Reference scaffold.** Running `vp create vite:application -- --template vue-ts` with 1.4.0 produced the following **(verified)**:
  - **`package.json`:**
    - `"vite": "catalog:"` plus `"vite-plus": "catalog:"`
    - `@vitejs/plugin-vue ^6.0.10`, `vue-tsc ^3.3.13`, `@vue/tsconfig`, `typescript ~6.0.3`
    - scripts `dev: vp dev`, `build: vue-tsc -b && vp build` and `preview: vp preview`
  - **`pnpm-workspace.yaml`:**
    - the catalog maps `vite: npm:@voidzero-dev/vite-plus-core@1.4.0` and `vite-plus: 1.4.0`
    - `overrides: { 'vite@*': 'catalog:' }`
    - `peerDependencyRules: { allowAny: [vite], allowedVersions: { vite: '*' } }`
  - **`vite.config.ts`:**
    - `plugins: lazyPlugins(() => [vue()])`
    - `lint.options: { typeAware: true, typeCheck: true }`
    - the `vite-plus/oxlint-plugin` JS plugin with `vite-plus/prefer-vite-plus-imports: error`
  - **TypeScript files:** `src/env.d.ts` holds the `*.vue` shim. `tsconfig.app.json` extends `@vue/tsconfig/tsconfig.dom.json` and sets `types: ["vite/client"]`. `tsconfig.node.json` covers `vite.config.ts`.
- **Version pairing.** `@vitejs/plugin-vue@6.0.10` peers `vite ^5 || ^6 || ^7 || ^8` and `vue ^3.2.25` (npm registry). It depends only on `@rolldown/pluginutils`. At runtime it imports `createFilter`, `normalizePath`, `isCSSRequest`, `formatPostcssSourceMap` and `transformWithEsbuild` from `vite`, and calls `transformWithOxc` for `lang="ts"` when it exists. Through the core alias, `vite` resolves to Vite 8.3.5 / Rolldown 1.2.15, and `transformWithOxc` is a function there, so plugin-vue takes the Oxc path. **(verified)**
- **Client types:** with no `vite` dependency, `"types": ["vite-plus/client"]` in tsconfig worked with vue-tsc. **(verified)** The scaffold uses `vite/client`, which works through the alias. vite-plus [#2037](https://github.com/voidzero-dev/vite-plus/issues/2037) lists an open case where plain `tsc` could not find `vite-plus/client`. That did not reproduce here.

## 2. The `vite` peer: one Vite or two

`vite-plus` ships its own `"vite": "npm:@voidzero-dev/vite-plus-core@…"` dependency. That covers Vitest's peer _inside_ vite-plus ([packages/cli/package.json](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/packages/cli/package.json), and migrate-rules.md "Vite and Overrides": "pnpm packages that use only `vite-plus` need no new `vite` entry"). A Vue app is not "only vite-plus", though: `@vitejs/plugin-vue` and `unplugin-vue-components` peer `vite`. Three layouts were tested from a fresh lockfile:

| Layout of `apps/web`                                                                                | What pnpm 11.9.0 installed                                                                                                                                           | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `vite` entry, no override (this repo's current style)                                            | Upstream `vite@8.3.5` plus `rolldown@1.2.15` and its native binding, about 19 MB on darwin-arm64, as auto-installed peers for plugin-vue and unplugin-vue-components | `vp build`/`vp dev` run on vite-plus-core; plugin-vue's helpers come from upstream Vite. Build, dev and tests pass. `tsc` on `vite.config.ts` **crashes** (TS 5.9.3 `Debug Failure… parameter should have errors when reporting errors`, even with only `plugins: [vue()]`). The only difference from the passing layout is that plugin-vue's types come from upstream Vite rather than the core that types `defineConfig`. After an incremental `pnpm add` of the unplugins, pnpm also bound vite-plus's `vitest` to the upstream Vite, so `vp test` ran on upstream Vite 8.3.5. A fresh install bound it to core. The graph depends on install history. |
| Workspace `overrides: { 'vite@*': npm:@voidzero-dev/vite-plus-core@1.4.0 }`, or the bare `vite` key | Same as above: the override does **not** redirect the auto-installed peer of plugin-vue or unplugin-vue-components                                                   | Same as above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Direct devDependency `"vite": "npm:@voidzero-dev/vite-plus-core@1.4.0"` in `apps/web`               | One Vite (core) and no upstream `vite` or `rolldown`                                                                                                                 | Build, dev, test, `vue-tsc` and `tsc` on `vite.config.ts` all pass. `pnpm peers check` still reports "unmet peer vite, installed 1.4.0" for plugin-vue and vitest, because the alias carries the wrapper's version 1.4.0. That warning is cosmetic.                                                                                                                                                                                                                                                                                                                                                                                                       |

Context from upstream:

- [vite-plus#1932](https://github.com/voidzero-dev/vite-plus/issues/1932) (closed) describes the same split: "The `vite` override … only rewrites real `vite` dependency edges". The duplicate Vitest ran on an upstream Vite that "lacks the `@voidzero-dev/vite-task-client` integration", so `vp run` task caching missed. The fix in [#1933](https://github.com/voidzero-dev/vite-plus/pull/1933) was a direct aliased `vite` devDependency.
- The peer warning is intentional, per [#1021](https://github.com/voidzero-dev/vite-plus/issues/1021). A request to make strict peer validation work without `allowAny` is open as [#2806](https://github.com/voidzero-dev/vite-plus/issues/2806).
- Per [migrate-rules.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/migrate-rules.md), `vp migrate` keeps an existing `vite` declaration and points it at the core alias, but it "does not add `vite` to a package solely because it uses `vite-plus`". So a frontend without a `vite` entry is not fixed by `vp migrate`.

This bears on the map's open question about whether `vp migrate`'s overrides and catalog become acceptable once Nuxt is gone. Here, the `vite@*` override alone made no difference. The part that mattered was the direct alias in the app package, which the scaffold writes through `catalog:`. Whether to adopt the catalog, the override or `peerDependencyRules` remains the user's call.

## 3. Dev, build and preview for an app

- `vp dev`, `vp build` and `vp preview` always run the built-in Vite commands. A `package.json` script of the same name runs only through `vp run <script>` ([dev.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/dev.md), [build.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/build.md), [run.md "Built-in Commands vs Scripts"](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/run.md)). Builds use Vite 8 and Rolldown.
- **Entry and output:**
  - The entry is `index.html` at the package root, which is where `<html lang="de">` would move.
  - The output directory is `build.outDir`, default `'dist'` (vite-plus-core typings: "If the directory exists, it will be removed before the build").
  - The scratch build produced `dist/index.html` plus hashed `dist/assets/*.js|css`. **(verified)**
- **`server.proxy`** works as in Vite. **(verified)** In the scratch app, `POST /calculate` and `GET /api/auth/*` went through `vp dev` to a fake backend.
  - Proxy entries match on path before the history fallback. A plain proxy entry for a path that is also an SPA page (`/results`) sent a browser navigation (`Accept: text/html`) to the backend.
  - A `bypass(req)` that returns `'/index.html'` for HTML requests served the SPA for navigations and still proxied JSON requests.
  - Both behaviours were verified. `ProxyOptions.bypass` exists in the vite-plus-core 1.4.0 types. This is the dev/preview side of the map's `/results` route clash and is listed as a fact only.
- **History fallback:** a deep link such as `/results` returns `index.html` (200, `text/html`) from both `vp dev` and `vp preview`. **(verified)**
- **`vp preview`:**
  - Defaults are `preview.port` 4173 and `preview.proxy` = `server.proxy` ([Vite preview options](https://vite.dev/config/preview-options)). The proxy inheritance was verified.
  - Vite: "`vite preview` is intended for previewing the build locally and not meant as a production server" ([Vite static deploy guide](https://vite.dev/guide/static-deploy)).
  - vite-plus's [docker.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/docker.md) "Production: static SPA / SSG" builds with `vp build` and copies `dist` into `nginx:alpine`. The server choice is ticket #49.
- **Env vars:**
  - `.env` files load from `envDir`, default `root`, which means `apps/frontend`, not the monorepo root where this repo's single `.env` lives.
  - Only `VITE_`-prefixed variables reach client code, and they are "statically replaced at build time" ([Vite env and mode](https://vite.dev/guide/env-and-mode)).
  - There is no runtime injection equivalent to `NUXT_PUBLIC_API_BASE`.
- **Monorepo commands:** a bare `vp dev`/`vp build` at the workspace root picks the single package that looks like an app (one with `vite.config.*` or `index.html`). The alternatives are `vp -C apps/frontend build` or `defaultPackage` in the root config ([monorepo.md "App Commands"](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/monorepo.md)). In non-interactive shells with several candidates it exits 1.

## 4. Tests

- **Runner and config:**
  - `vp test` runs the Vitest 5.0.5 bundled with vite-plus. It is non-watch by default, and `vp test watch` is the watch mode.
  - Vitest APIs are imported from `vite-plus/test`.
  - Config goes in the `test` block of `vite.config.ts`; vite-plus advises against a separate `vitest.config.ts` ([test.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/test.md)).
  - Vitest reads `vite.config.*` by default, so the app's plugins apply in tests. A `vitest.config.*` "will have the higher priority and will override the configuration from `vite.config.ts`" and "all options in your `vite.config` will be ignored" ([Vitest config](https://vitest.dev/config/)).
  - The backend uses `vitest.config.ts` today. A frontend needs the Vue plugin in its test config, and a single `vite.config.ts` provides it. **(verified)**
- **Verified setup:**
  - `test: { environment: 'happy-dom' }`, with `happy-dom` as a devDependency of the package.
  - Specs import from `vite-plus/test` and `@vue/test-utils`.
  - Specs call `mount(Comp, { props, global: { plugins: [PrimeVue] } })` and `trigger('click')`.
  - SFCs with `<script setup lang="ts">`, scoped styles and a PrimeVue `Button` render and update. Components resolved by unplugin also render in tests. **(verified)**
- **Vitest 4 to 5 behaviour changes** relevant to porting the current Vitest 4 frontend tests ([vitest-v5.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/vitest-v5.md)):
  - `clearMocks` is on by default. The backend keeps `clearMocks: false` for compatibility.
  - Nested `vi.mock`/`vi.hoisted` calls must move to the top level.
  - Async assertions must be awaited.
  - "Vitest v5 no longer searches parent directories for a config".
  - `@nuxt/test-utils` is one reason migration keeps a package-local `vitest`. Once it is gone, that reason is gone too.
- **Workspace root:**
  - The repo's root `package.json` `test` script is `vp run -r test`, which runs each package's own `test` script. That path is unaffected.
  - A bare `vp test` at the root uses the root `vite.config.ts`. In the scratch workspace it picked up `apps/web` specs and failed with "Install @vitejs/plugin-vue to handle .vue files". **(verified)** This matches the map's pre-existing failure.
  - `test: { projects: ['apps/*'] }` in the root config made the root run green: each project used its own config. **(verified)**

## 5. Type checking

- **What `vp check` does:**
  - It runs Oxfmt, Oxlint and, only when both `lint.options.typeAware` and `lint.options.typeCheck` are on in the **workspace-root** `lint` block, type checks through tsgolint on TypeScript 7 / Go ([check.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/check.md), [lint.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/lint.md)).
  - Package configs cannot override the root lint settings in `vp check`.
  - This repo's root `vite.config.ts` sets neither option, so `vp check` does no type checking today. Turning it on applies to the whole workspace, backend included.
- **SFCs are not covered.**
  - "Vue SFC component type support for Oxlint-tsgolint isn't there yet" ([vite-plus#1007](https://github.com/voidzero-dev/vite-plus/issues/1007)). The limitation is tracked upstream in [oxc#15761](https://github.com/oxc-project/oxc/issues/15761), still open. October 2026 comments there tie a fix to TypeScript 7.1's programmatic API, which is in beta.
  - Without a `*.vue` shim, `vp check` fails with `TS2307: Cannot find module './App.vue'` ([vite-plus#1277](https://github.com/voidzero-dev/vite-plus/issues/1277)). **(verified)**
  - `vp create` and `vp migrate --full` add the shim when `vue` is a dependency ([framework-shim.ts](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/packages/cli/src/migration/migrator/framework-shim.ts)).
  - The shim types every SFC as `DefineComponent<{}, {}, unknown>`, which is what lets tsgolint skip them.
- **Side-by-side test** in the scratch app, with the shim present, using four injected errors:

  | Injected error                            | `vp check` (typeCheck on) | `vue-tsc --noEmit` |
  | ----------------------------------------- | ------------------------- | ------------------ |
  | Wrong type in a `.ts` file                | reported                  | reported           |
  | Wrong type in an SFC `<script setup>`     | missed                    | reported           |
  | Unknown identifier in an SFC template     | missed                    | reported           |
  | Wrong prop type passed to an imported SFC | missed                    | reported           |

  vue-tsc reads real SFC types despite the shim. **(verified)**

- **Vue's position:** "If using SFCs, use the `vue-tsc` utility for command line type checking", and the Vite dev server and bundler "are transpilation-only and do not perform any type-checking" ([Vue TypeScript overview](https://vuejs.org/guide/typescript/overview.html)).
- **No hook into `vp check`.** `vp check` cannot run extra checkers such as `vue-tsc`; that feature request was closed as not planned, with `vp run <task>` suggested instead ([vite-plus#1722](https://github.com/voidzero-dev/vite-plus/issues/1722)).
- **Package metadata:** vite-plus-core lists `vue-tsc` and `@vue/language-core` as optional peers. They are used by `vp pack` (tsdown declaration generation) and are not wired into `vp check` ([packages/core/package.json](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/packages/core/package.json)).
- **Current CI:** CI today runs no lint or type check for the frontend. It runs backend tests, knip, the frontend build and Playwright (`.github/workflows/build.yml`).

## 6. Lint and format on `.vue`

- `vp fmt` reformatted a deliberately misformatted `App.vue`, script and template both. HTML is formatted too. **(verified)**
- `vp lint` counts `.vue` files among the linted files and lints the `<script>` blocks. Template-aware rules and `eslint-plugin-vue` parity are not available ([oxc#15761](https://github.com/oxc-project/oxc/issues/15761)). With default rules, template-only bindings caused no false `no-unused-vars` reports. **(verified)**
- `vp check` and `vp lint` take their settings from the root `lint`/`fmt` blocks. Package-specific rules go in `lint.overrides`, and nested configs do not apply per file ([troubleshooting.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/troubleshooting.md)).
- A root config with no `.gitignore` covering `dist` (scratch only) made `vp check` flag `dist/` as unformatted. The repo's `.gitignore` handles this.

## 7. Plugins: unplugin and PrimeVue

- `unplugin-auto-import@21.1.0` and `unplugin-vue-components@32.1.0` are built on `unplugin` and do not depend on `vite`. `unplugin-vue-components` does pick up an optional `vite` and `rolldown` peer in the lockfile.
- `@primevue/auto-import-resolver` must match the PrimeVue major. Versions 4.5.5 and 5.0.4 both exist, and the map targets PrimeVue 4, so 4.5.5 applies.
- Verified with `AutoImport({ imports: ['vue', 'vue-router'], dts })` and `Components({ resolvers: [PrimeVueResolver()], dts })`:
  - An SFC with no imports, using `ref`/`computed` plus `<Button>`/`<InputText>`, builds. The bundle contains the PrimeVue components.
  - It renders in `vp test`.
  - It passes `vue-tsc` through the generated `auto-imports.d.ts`/`components.d.ts`. **(verified)**
- Caveats observed:
  - The generated `.d.ts` files fail Oxfmt in `vp check` until they are added to `fmt.ignorePatterns`.
  - `components.d.ts` only lists resolver-imported components after a dev or build transform has seen them. A `vp test` run alone did not add `Button`/`InputText`.
- PrimeVue 4's documented Vite setup is `app.use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } })`. With auto-import, the [v4 docs](https://v4.primevue.org/autoimport/) show only `app.use(PrimeVue)` plus the `Components({ resolvers: [PrimeVueResolver()] })` plugin. Note that `primevue.org` now redirects to the PrimeVue 5 docs at `primevue.dev`.

## 8. Known Vue-specific gaps and caveats in 1.4.0

- **No SFC type checking in `vp check`.** `vue-tsc` is a separate step, and the `*.vue` shim is required for `vp check` to pass ([§5](#5-type-checking)).
- **Duplicate Vite under pnpm** when the app package has no direct aliased `vite` entry. This also caused a `tsc` crash on `vite.config.ts` in the experiment ([§2](#2-the-vite-peer-one-vite-or-two)).
- **Oxlint is template-unaware for Vue** ([§6](#6-lint-and-format-on-vue)).
- **Peer warnings:** `pnpm peers check` warns "unmet peer vite (installed 1.4.0)" whenever vite plugins resolve to the core alias. The scaffold silences this with `peerDependencyRules`.
- **Version and runtime notes:**
  - `vue-router` 5.4.0 and `primevue` 5.0.4 are current on npm. The repo uses `vue-router ^4.6.3` and `primevue ^4.5.2`, and the map names PrimeVue 4.
  - vite-plus requires Node `^22.18.0 || ^24.11.0 || >=26.0.0` ([test.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/test.md)).
- **Nuxt-only issues disappear with Nuxt.** These include `@nuxt/vite-builder` failing to resolve `rolldown` after migration ([#2037](https://github.com/voidzero-dev/vite-plus/issues/2037)) and the `@nuxt/test-utils` import-rewrite exception in migrate-rules.md.

## 9. This repo today, for comparison

- Root `package.json` has `vite-plus ^1.4.0`. `pnpm-workspace.yaml` has no `overrides`, catalog or `peerDependencyRules`, by design (see `CLAUDE.md` Gotchas).
- The root `vite.config.ts` has:
  - a `test` block with `clearMocks: false` and excludes for `.nuxt`/`.output`/`e2e`
  - `lint.ignorePatterns`
  - `fmt.singleQuote`
  - no `typeAware` or `typeCheck`
- **Backend:**
  - `apps/backend/package.json` declares `vite-plus ^1.4.0` and no `vite`.
  - Its scripts are `test: vp test run` and `test:e2e: vp test run --config vitest.e2e.config.ts`.
  - Its configs are `vitest.config.ts` and `vitest.e2e.config.ts`, both using `defineConfig` from `vite-plus`. The e2e config adds `unplugin-swc` for decorator metadata.
  - The lockfile resolves the backend's Vitest 5.0.5 `vite` to `@voidzero-dev/vite-plus-core@1.4.0`, so it has a single Vite.
- **Frontend:** it is still on Nuxt, with Vitest 4 through `@nuxt/test-utils`. Its `tsconfig.json` only references the generated `.nuxt/tsconfig.*.json` files.

## Open uncertainties

- **pnpm behaviour:** the finding that overrides don't redirect auto-installed peers comes from pnpm 11.9.0, the repo's pinned version. Other pnpm versions were not tested, and the vite-plus scaffold itself ran pnpm 12.15.0 through vp's managed environment.
- **Root `typeCheck` and the backend:** whether turning on root `typeAware`/`typeCheck` passes for the NestJS backend (decorators, `NodeNext`) was not tested here.
- **Node version:** the experiment ran on Node 24.22.1, while the repo pins 22 in `.node-version`. vite-plus supports both lines, and no Node-specific behaviour was observed.
- **knip:** how knip's Vite and Vitest plugins detect a `vite.config.ts` that imports `vite-plus` was not tested. The plugins are keyed on dependencies, and the frontend may have no `vite`/`vitest` dependency. The knip ignores for `apps/frontend` need re-checking in PR 2.
- **SFC support in tsgolint:** it may land in a later vite-plus release (oxc#15761, TS 7.1). Nothing in 1.4.0 provides it.

## Sources

- vite-plus v1.4.0:
  - [docs/guide/build.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/build.md), [dev.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/dev.md), [test.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/test.md), [check.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/check.md), [lint.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/lint.md)
  - [vitest-v5.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/vitest-v5.md), [migrate.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/migrate.md), [migrate-rules.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/migrate-rules.md)
  - [monorepo.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/monorepo.md), [troubleshooting.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/troubleshooting.md), [docker.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/docker.md), [create.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/guide/create.md)
  - [docs/config/index.md](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/docs/config/index.md)
  - [packages/cli/package.json](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/packages/cli/package.json), [packages/core/package.json](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/packages/core/package.json)
  - [framework-shim.ts](https://github.com/voidzero-dev/vite-plus/blob/v1.4.0/packages/cli/src/migration/migrator/framework-shim.ts) and the `create_framework_shim_vue` / `migration_framework_shim_vue` snapshot fixtures under `crates/vp_cli_snapshots/tests/cli_snapshots/fixtures/`
- vite-plus issues and PRs: [#1007](https://github.com/voidzero-dev/vite-plus/issues/1007), [#1021](https://github.com/voidzero-dev/vite-plus/issues/1021), [#1277](https://github.com/voidzero-dev/vite-plus/issues/1277), [#1722](https://github.com/voidzero-dev/vite-plus/issues/1722), [#1932](https://github.com/voidzero-dev/vite-plus/issues/1932) / [PR #1933](https://github.com/voidzero-dev/vite-plus/pull/1933), [#2037](https://github.com/voidzero-dev/vite-plus/issues/2037), [#2806](https://github.com/voidzero-dev/vite-plus/issues/2806)
- oxc: [#15761 "oxlint: better vue support"](https://github.com/oxc-project/oxc/issues/15761)
- Vue: [TypeScript overview](https://vuejs.org/guide/typescript/overview.html)
- Vite: [preview options](https://vite.dev/config/preview-options), [env and mode](https://vite.dev/guide/env-and-mode), [static deploy](https://vite.dev/guide/static-deploy)
- Vitest 5.0.5: [Getting started, "Configuring Vitest"](https://vitest.dev/guide/), [config reference](https://vitest.dev/config/)
- PrimeVue 4.5.5: [auto import](https://v4.primevue.org/autoimport/)
- npm registry metadata (`npm view`, 2026-10-24) for `@vitejs/plugin-vue`, `vue`, `vue-router`, `vue-tsc`, `@vue/test-utils`, `unplugin-auto-import`, `unplugin-vue-components`, `@primevue/auto-import-resolver` and `primevue`
- This repo at `e256f1d`: `package.json`, `pnpm-workspace.yaml`, `vite.config.ts`, `apps/backend/{package.json,vitest.config.ts,vitest.e2e.config.ts}`, `apps/frontend/{package.json,vitest.config.ts,nuxt.config.ts,tsconfig.json}`, `pnpm-lock.yaml`, `.github/workflows/build.yml` and `knip.config.ts`
