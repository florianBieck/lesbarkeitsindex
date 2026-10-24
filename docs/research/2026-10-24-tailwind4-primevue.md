# Tailwind 4 and PrimeVue 4 Aura in a Vite SPA

Research for [#48](https://github.com/florianBieck/lesbarkeitsindex/issues/48) on the map
[#46](https://github.com/florianBieck/lesbarkeitsindex/issues/46). Date: 2026-10-24.

This note reports facts and trade-offs only. How Tailwind 4 gets set up (Vite plugin or PostCSS,
`tailwindcss-primeui` or not, how the migration is done) is decided in a separate grilling ticket.

**Versions examined:** tailwindcss 3.4.19 (current) and 4.3.3 (latest), `@tailwindcss/vite` and
`@tailwindcss/postcss` 4.3.3, `@tailwindcss/upgrade` 4.3.3, `@nuxtjs/tailwindcss` 6.14.0,
primevue 4.5.4, `@primevue/core` 4.5.4, `@primeuix/styled` 0.7.4, `@primeuix/themes` 2.0.3,
`tailwindcss-primeui` 0.6.1, vite-plus 1.4.0 (`@voidzero-dev/vite-plus-core` 1.4.0).

**Method:** primary docs and source code, plus four throwaway experiments, none of them
committed:

- **E1:** compiled `apps/frontend/app/**` with Tailwind 3.4.19 and the same config the Nuxt
  module generates.
- **E2:** built the current Nuxt app and measured computed styles with Playwright (Chromium).
- **E3:** built a minimal Vue SPA with vite-plus 1.4.0, Tailwind 4.3.3, PrimeVue 4.5.4 Aura and
  `tailwindcss-primeui`. It was built once with `@tailwindcss/vite` and once with
  `@tailwindcss/postcss`, then measured with PrimeVue `cssLayer` off and on.
- **E4:** ran `@tailwindcss/upgrade@4.3.3` on a git-initialised copy of `apps/frontend/app`.

## Key findings

1. **About 60 colour classes in the app generate no CSS today.** These are `text-surface-*`,
   `bg-surface-*`, `border-surface-100`, `outline-surface-0`, `fill-surface-700` and
   `text-primary`. Tailwind 3's default palette has no `surface` or `primary`, and the Nuxt
   module adds no theme. Visible effects today:
   - the `AppLogo` SVG on `/login` and `/logout` has `fill: none`, so it is invisible
   - the header logo box has a dark slate-700 outline instead of a white one
   - text takes the inherited Aura text colour (slate-700)

   Adding `tailwindcss-primeui` would make all of these classes produce CSS for the first time.

2. **Utilities on PrimeVue components lose today.** Examples are `py-3 rounded-lg` on the login
   `Button` and `rounded-lg shadow-sm` on the `InputText`. PrimeVue's styles are unlayered and
   come after Tailwind's CSS, so they win. A Tailwind 4 setup gives the same result while
   `cssLayer` is off. With `cssLayer: { name: 'primevue', order: 'theme, base, primevue' }` the
   utilities win (measured in E3).
3. **`@tailwindcss/vite` works on vite-plus 1.4.0 (measured).** vite-plus-core 1.4.0 bundles
   Vite 8.3.5 and Rolldown 1.2.15. `@tailwindcss/vite` has declared `vite ^8` support since
   4.2.2. In E3, `vp build` and `vp dev` both worked with the Vite plugin. `vp build` also
   worked with the PostCSS plugin, and the two builds produced byte-identical CSS. I found no
   first-party Vite+ statement about Tailwind either way.
4. **`tailwindcss-primeui` 0.6.1 supports Tailwind 4.** It ships a CSS entry for v4, used with
   `@import "tailwindcss-primeui"`, and a JS plugin for v3. Its last release was 2025-03-26 and
   4 issues are open.
5. **`@tailwindcss/upgrade` does nothing useful on this app as it stands.** The app has no CSS
   entry, no `tailwind.config.*`, and no `tailwindcss` entry in `apps/frontend/package.json`.
   Once those three are stubbed (E4), the tool rewrites 4 files. Those rewrites are the
   `shadow*` renames, `outline` → `outline-solid`, and some cosmetic canonicalisations. It also
   adds a v3 border-colour compatibility block.
6. **v3 → v4 changes that hit this app's classes:**
   - the `shadow`/`shadow-sm` rename
   - the bare `outline` utility
   - `border` with no colour (default changes from gray-200 to `currentColor`)
   - `text-base!` and `leading-normal!`, which are v4 syntax and generate nothing in v3
   - the hover media query
   - a 1px line-height change on one element
   - slightly different OKLCH colour values

   The app uses no `ring`, `blur`, `space-*`, `divide-*`, `rounded`, `rounded-sm`, opacity
   utilities or `@apply`.

7. **Two contrast problems would appear if the dead classes start working.** The app has
   `text-surface-400` (2.56:1 on white) and `text-primary` (Aura emerald-500, 2.54:1). Both fail
   WCAG AA for normal text. Today they are dead and the text renders in slate-700.
8. **Surprise:** primevue.org now redirects to primevue.dev, which documents PrimeVue 5 (5.0.0
   was released 2026-07-15; latest 5.0.4). The PrimeVue 4 docs live at v4.primevue.org, and npm
   dist-tag `v4-stable` is 4.5.5.

## 1. What the app relies on from `@nuxtjs/tailwindcss` 6.14.0 today

Source: `@nuxtjs/tailwindcss@6.14.0/dist/module.mjs` and the generated
`apps/frontend/.nuxt/tailwind/postcss.mjs` (after `nuxt prepare`).

| Default                         | What it does in this app                                                                                                                                                                                                                                                                                                                                                                      | After Nuxt is removed                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `cssPath`                       | Default is `<assets>/css/tailwind.css`. The app has no `app/assets/`, so the module falls back to `tailwindcss/tailwind.css` from the tailwindcss package (`@tailwind base; @tailwind components; @tailwind utilities;`). The build logs "Using default Tailwind CSS file". It is inserted at position `first` of `nuxt.options.css` and bundled into the entry CSS (`<link … entry.*.css>`). | The app has no CSS file at all. A CSS entry has to exist and be imported from `main.ts`.      |
| `content`                       | Generated globs under `app/`: `components/**/*.{vue,js,jsx,mjs,ts,tsx}`, `layouts/**`, `plugins/**/*.{js,ts,mjs}`, `composables/**/*.{js,ts,mjs}`, `utils/**/*.{js,ts,mjs}`, `pages/**/*.{vue,…}`, `{A,a}pp.*`, `{E,e}rror.*`, `app.config.*`                                                                                                                                                 | Tailwind 4 detects sources automatically (see §2). No equivalent is needed for these folders. |
| `config` / theme / plugins      | `{}`. There is no theme extension, no plugins and no `darkMode` override, so the Tailwind 3 defaults apply.                                                                                                                                                                                                                                                                                   | Nothing is lost.                                                                              |
| PostCSS                         | Adds `tailwindcss/nesting` and `tailwindcss` to Nuxt's PostCSS config. Nuxt's defaults add `autoprefixer`, plus `cssnano` in builds (`@nuxt/schema` 4.4.2).                                                                                                                                                                                                                                   | Tailwind 4 prefixes vendors itself. Vite 8 minifies CSS with Lightning CSS by default.        |
| `viewer`                        | In dev, `tailwind-config-viewer` is served at `/_tailwind`.                                                                                                                                                                                                                                                                                                                                   | This dev-only tool disappears.                                                                |
| `exposeConfig`, `editorSupport` | Both `false`.                                                                                                                                                                                                                                                                                                                                                                                 | Nothing is lost.                                                                              |
| Dependency                      | `tailwindcss@3.4.19` is a dependency of `@nuxtjs/tailwindcss`, **not** of `apps/frontend`.                                                                                                                                                                                                                                                                                                    | Removing the module removes Tailwind entirely.                                                |

The app has no `<style>` blocks, no `@apply`, no `theme()` and no `tailwind.config`. All Tailwind
usage is classes in templates, plus four class strings in `result-view.vue`'s script (the
`severityStyle` map).

### Baseline measurements (E1 and E2)

E1: Tailwind 3.4.19 with the module's content globs generates **no rule containing `surface` or
`primary`**. It also generates no `text-base!` or `leading-normal!` rule. The trailing `!` is v4
syntax; v3 uses the `!` prefix.

E2: computed styles on the current Nuxt build in Chromium.

| Element                                                 | Classes                                                         | Computed today                                             | Why                                                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Login "Anmelden" `Button`                               | `py-3 rounded-lg`                                               | padding 8px, radius 6px (Aura values)                      | PrimeVue's unlayered `<style>` tags come after Tailwind's `entry.css` in `<head>`. Specificity is equal, so the later rule wins. |
| Login `InputText`                                       | `px-3 py-2 shadow-sm rounded-lg`                                | radius 6px, Aura input shadow                              | Same reason.                                                                                                                     |
| Login button icon                                       | `text-base! leading-normal!`                                    | line-height 16px                                           | No CSS is generated in v3.                                                                                                       |
| `AppLogo` path                                          | `fill-surface-700`, and the `<svg>` has `fill="none"`           | `fill: none`, so the logo is **invisible**                 | No CSS is generated, so the path inherits `fill="none"`.                                                                         |
| Header logo box                                         | `bg-surface-0 shadow outline outline-[3.5px] outline-surface-0` | outline is solid 3px rgb(51,65,85), background transparent | No colour CSS is generated, so the outline uses `currentColor` (Aura text slate-700).                                            |
| Headings and labels with `text-surface-900` and similar | various                                                         | rgb(51,65,85)                                              | Inherited `--p-text-color` (Aura surface-700).                                                                                   |
| `border-t border-surface-100`                           |                                                                 | gray-200 border                                            | v3 preflight's default border colour; `border-surface-100` itself generates nothing.                                             |

The Nuxt PrimeVue module injected a `<style>` for **every** PrimeVue component into the SSR
`<head>` (about 180 entries). In the plain-SPA prototype (E3), PrimeVue only injected styles for
the components that mounted.

## 2. `@tailwindcss/vite` vs `@tailwindcss/postcss` on vite-plus-core

**Facts**

- vite-plus 1.4.0 depends on `vite: npm:@voidzero-dev/vite-plus-core@1.4.0`. The `package.json`
  of vite-plus-core 1.4.0 declares `bundledVersions: { vite: "8.3.5", rolldown: "1.2.15" }`. So
  vite-plus-core is Rolldown-based Vite 8.
- `@tailwindcss/vite` peer range: `^5.2.0 || ^6 || ^7` up to 4.2.1, and `^5.2.0 || ^6 || ^7 || ^8`
  from 4.2.2 (2026-03-18) on. This was Tailwind issue #19789, fixed by PR #19790. A follow-up
  issue about Vite 8's Lightning CSS defaults (#19792) is closed.
- At runtime, `@tailwindcss/vite` 4.3.3 does `import * as M from "vite"` and uses only
  `M.createIdResolver` and `M.isCSSRequest`. Which `vite` package this resolves to depends on
  pnpm peer resolution, not on vite-plus. In E3, pnpm auto-installed real `vite@8.3.5` to satisfy
  the peers of `@tailwindcss/vite` and `@vitejs/plugin-vue`. That happened even though
  `pnpm.overrides` aliased `vite` to vite-plus-core.
- The Tailwind upgrade guide says: "If you're using Vite, we recommend migrating from the PostCSS
  plugin to our new dedicated Vite plugin for improved performance and the best developer
  experience."
- Vite 8.3 (vite.dev): `css.transformer` is `'postcss'` by default (`'lightningcss'` is
  experimental), and `postcss.config.*` is auto-loaded. `build.cssMinify` defaults to
  `'lightningcss'`. `build.target` defaults to `'baseline-widely-available'`.
- Source scanning base: the Vite plugin scans `**/*` from Vite's resolved `config.root` (from the
  plugin source). The docs say the default base is the current working directory. Both respect
  `.gitignore`, skip `node_modules`, CSS, binary and lock files, and can be changed with
  `@import "tailwindcss" source(...)`, `@source` and `@source not`.

**E3 results** (vite-plus 1.4.0, `vp build`, `vp dev`, macOS arm64)

| Variant                                          | `vp build`                   | `vp dev`                                                                          | Output                                                                                                                                                         |
| ------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tailwindcss/vite` in `plugins`                 | ✓ (140 modules, 13.3 kB CSS) | ✓ (`/src/style.css` served with `text-surface-500`, `text-red-600`, `py-3` rules) | `oklch()` colours preserved, so the Rolldown/Vite 8 OKLCH→LAB problem from #19789's comments did not reproduce. `hover:` is wrapped in `@media (hover:hover)`. |
| `@tailwindcss/postcss` via `css.postcss.plugins` | ✓                            | not tried                                                                         | CSS byte-identical to the Vite-plugin build (same content hash).                                                                                               |

**Unknown:** no first-party Vite+ documentation or issue mentions Tailwind. A search of
`voidzero-dev/vite-plus` issues for "tailwind" returned nothing relevant. The Vite+ docs site
itself depends on `tailwindcss ^4.1.18`, but through VitePress. E3 is a smoke test with a
single-file app, not a production-scale proof. HMR edits were not exercised.

**Adjacent:** oxfmt, which `vp fmt` uses, has a `sortTailwindcss` option (alias
`experimentalTailwindcss`). It uses the prettier-plugin-tailwindcss algorithm, and for v4 it takes
a `stylesheet` path that defaults to the installed `tailwindcss/theme.css`
(`oxc-project/oxc` `apps/oxfmt/src/core/oxfmtrc.rs`).

## 3. Cascade layers: Tailwind 4 × PrimeVue `cssLayer`

**Tailwind 4.** `@import "tailwindcss"` expands to `@layer theme, base, components, utilities;`
followed by `theme.css` in `layer(theme)`, `preflight.css` in `layer(base)` and `utilities.css` in
`layer(utilities)` (Preflight docs). The minified E3 build declares layers in this order:
`properties`, `theme`, `base`, `components`, `utilities`. It adds `keyframes` when
`tailwindcss-primeui` is imported, because that package wraps its `@keyframes` in
`@layer keyframes`.

**PrimeVue 4 styled mode.**

- `cssLayer` defaults to `false` (v4 docs, "CSS Layer → Specificity"). With `false`, all PrimeVue
  CSS is unlayered.
- Styles are injected at runtime with `document.head.appendChild` (`@primevue/core/usestyle`), so
  in an SPA they land after the bundled Tailwind `<link>`.
- When `cssLayer` is set, `@primevue/core` `BaseComponent._loadStyles` injects one extra
  `<style data-primevue-style-id="layer-order">` with `first: true`, which means
  `document.head.prepend`. Its content is `@layer <order>`, built by `@primeuix/styled` as
  `getLayerOrder`, so PrimeVue's layer order statement precedes every other stylesheet in the
  document.
- MDN: "Styles that are not defined in a layer always override styles declared in named and
  anonymous layers." Layer priority follows the order in which layers are first declared, and
  re-declaring a layer later does not change that order.

**PrimeVue's documented Tailwind 4 setup** (v4.primevue.org/tailwind, "Override → CSS Layer"):
"Ensure primevue layer is after theme and base, but before the other Tailwind layers such as
utilities". The example is
`cssLayer: { name: 'primevue', order: 'theme, base, primevue' }`, and the Tailwind CSS needs no
change. The resulting order is `theme < base < primevue < components < utilities`. The Tailwind 3
variant of the same docs instead wraps `@tailwind base` and `@tailwind utilities` in named layers
by hand.

**E3 measured (Tailwind 4.3.3 + PrimeVue 4.5.4 Aura, Chromium):**

| Element                                      | `cssLayer: false`                               | `cssLayer: { name: 'primevue', order: 'theme, base, primevue' }` |
| -------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `<Button class="py-3 rounded-lg">`           | padding 8px, radius 6px (Aura wins)             | padding 12px, radius 8px (utilities win)                         |
| `<InputText class="… shadow-sm rounded-lg">` | radius 6px, Aura shadow                         | radius 8px, Tailwind `shadow-sm`                                 |
| `<head>` order                               | `link` (Tailwind), then PrimeVue `<style>` tags | `layer-order` style first, then `link`, then PrimeVue            |

**Preflight × PrimeVue.** In v4, Preflight lives in `@layer base`. In both configurations above,
PrimeVue's component rules beat it: unlayered beats layered, and the `primevue` layer comes after
`base`. PrimeVue's v4 docs ("CSS Layer → Reset", "Libraries → Tailwind") only describe Preflight
as a problem when PrimeVue's rules are layered _below_ the reset. Tailwind 3 Preflight in today's
app is unlayered too, but it uses element selectors, which have lower specificity than PrimeVue's
class selectors. v4 Preflight changes that touch plain elements in this app:

- buttons get `cursor: default`; the PrimeVue `.p-button` sets its own cursor
- placeholders become 50% `currentColor`; PrimeVue inputs set their own placeholder colour
- the `[hidden]` attribute now beats display utilities

**Gotchas in the code:**

- With `cssLayer: true` instead of an object, `@primeuix/styled` 0.7.4 names the layer `primeui`,
  not `primevue` as the docs say (`transformCSS`: `{name:"primeui",order:"primeui"}` unless an
  object is passed).
- The app sets `darkModeSelector: false`, and no `dark:` classes are used. So PrimeVue's
  dark-mode alignment advice (a custom `@custom-variant dark`) does not apply.
- PrimeVue 5 docs (primevue.dev) describe a new `preflight` option and a `primeui` / `primeui.base`
  layer. That is **v5 only** and absent from the v4 docs.

## 4. `tailwindcss-primeui`

- **Version and activity:** npm latest 0.6.1, last modified 2025-03-26. Peer:
  `tailwindcss >=3.1.0`. GitHub `primefaces/tailwindcss-primeui` has 4 open issues: #33
  (a CSS syntax warning in Angular builds), #34 (custom prefix not supported), and #35/#36
  (severity variants). The E3 `vp build` printed no warnings.
- **Tailwind 4 support:** `exports["."].style` points to `./v4/index.css`, so
  `@import "tailwindcss-primeui"` in CSS resolves to the v4 build. `import`/`require` resolve to
  the v3 JS plugin. PrimeVue v4 docs: "the CSS version is compatible with Tailwind v4, while the
  JS version is designed for Tailwind v3."
- **What it adds (v4 build):**
  - `@theme inline` colours that read **PrimeVue's runtime CSS variables**:
    - `primary` → `var(--p-primary-color)`
    - `primary-emphasis`, `primary-emphasis-alt` and `primary-contrast`
    - `primary-50…950` → `var(--p-primary-*)`
    - `surface-0…950` → `var(--p-surface-*)`

    These work only while PrimeVue styled mode has injected the `--p-*` variables. With Aura,
    `primary` = emerald and `surface` = slate (from `@primeuix/themes` 2.0.3 `aura/base`).

  - Semantic utilities:
    - `border-surface` (`--p-content-border-color`)
    - `bg-emphasis`, `bg-highlight`, `bg-highlight-emphasis`
    - `rounded-border`
    - `text-color`, `text-color-emphasis`
    - `text-muted-color`, `text-muted-color-emphasis`
  - Animation utilities from legacy PrimeFlex: `animate-enter`/`animate-leave`, presets like
    `animate-fadein`, and duration, delay, fill-mode and similar utilities, with keyframes in
    `@layer keyframes`.
  - About 90 `p-*` custom variants keyed on PrimeVue `data-p` attributes (`p-invalid`,
    `p-disabled`, `p-checked`, …). They are mainly useful for unstyled mode and pass-through.
- **Relevance to this app:** without it (or an equivalent `@theme` block), every `*-surface-*` and
  `text-primary` class stays dead in v4, just as in v3. With it, they all become live (see §5b).

## 5. Class inventory of `apps/frontend/app/**` against v4

Templates and script strings in all 12 non-test `.vue` and `.ts` files were inventoried. No test
asserts on class names.

### 5a. Changed meaning or renamed in v4

| Class (where)                                                                                                                                               | v3 → v4                                                                                                                                                                                                                    | `@tailwindcss/upgrade` (E4)                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `shadow` (`app.vue` logo box)                                                                                                                               | v3 `shadow` = v4 `shadow-sm`. Bare `shadow` still works for backward compatibility.                                                                                                                                        | → `shadow-sm`                                                                                  |
| `shadow-sm` (`logout.vue` card, `login.vue` InputText)                                                                                                      | v4 `shadow-sm` is v3's `shadow`, which is larger. v3 `shadow-sm` is now `shadow-xs`.                                                                                                                                       | → `shadow-xs`                                                                                  |
| `outline` (`app.vue` logo box)                                                                                                                              | v4 `outline` also sets `outline-width: 1px`. Here `outline-[3.5px]` overrides the width, and v4 `outline-<n>` defaults the style to solid.                                                                                 | → `outline-solid`                                                                              |
| `border` with no colour (`config-weights-form.vue` ×2)                                                                                                      | Default border colour changes from gray-200 to `currentColor`, which is dark slate-700 here.                                                                                                                               | Adds a `@layer base` compatibility block (`border-color: var(--color-gray-200, currentcolor)`) |
| `border-t`/`border-b` + `border-surface-100` (`result-view.vue` ×2, `index.vue`)                                                                            | Today the colour class is dead and gray-200 comes from Preflight. In v4: currentColor without the plugin and without the compatibility block; gray-200 with the compatibility block; slate-100 with `tailwindcss-primeui`. | compatibility block (see above)                                                                |
| `text-base! leading-normal!` (`login.vue` icon)                                                                                                             | Dead in v3, live in v4: line-height 16px → 24px.                                                                                                                                                                           | unchanged                                                                                      |
| `text-sm md:text-lg leading-normal` (`app.vue` subtitle)                                                                                                    | v3: `md:text-lg` comes later in the CSS, so its 1.75rem line-height wins at md+ (28px). v4: `text-*` uses `var(--tw-leading, …)`, so `leading-normal` wins (27px).                                                         | unchanged                                                                                      |
| `hover:underline` (`results.vue` link)                                                                                                                      | v4 only applies under `@media (hover: hover)`, so there is no underline on touch devices.                                                                                                                                  | unchanged                                                                                      |
| `text-green-600`, `text-green-700`, `text-amber-700`, `text-red-600` (`result-view.vue` severity map, `admin.vue`, `index.vue`, `login.vue`, `results.vue`) | The v4 palette is OKLCH. Contrast on white (Chromium, sRGB) is listed below this table.                                                                                                                                    | unchanged                                                                                      |
| `-top-[70px]`, `-mb-[70px]`, `md:w-[30rem]`                                                                                                                 | Same meaning.                                                                                                                                                                                                              | → `top-[-70px]`, `mb-[-70px]`, `md:w-120` (cosmetic)                                           |
| `rounded` (`app.vue` line 53)                                                                                                                               | Not a class: it is a PrimeVue `Button` prop, which the scanner picks up as text. It generates an unused rule in both versions and does no harm.                                                                            | n/a                                                                                            |

Contrast on white for the severity colours, v3 → v4:

- `green-600`: 3.30:1 → 3.22:1
- `green-700`: 5.02:1 → 4.95:1
- `amber-700`: 5.02:1 → 5.03:1
- `red-600`: 4.83:1 → 4.77:1

`green-600` already fails WCAG AA for normal text in v3 (the success label is
`text-lg font-medium`, which is not large text).

### 5b. Dead today, live once `primary`/`surface` are defined (for example by `tailwindcss-primeui`)

Counts: `text-surface-900` ×17, `text-surface-700` ×15, `text-surface-500` ×13,
`text-surface-600` ×3, `border-surface-100` ×3, `bg-surface-0` ×3, `text-surface-400` ×2,
`bg-surface-50` ×1, `outline-surface-0` ×1, `fill-surface-700` ×1, `text-primary` ×1.

Visible changes if they become live (Aura light):

- `AppLogo` becomes visible (slate-700 fill).
- The header logo box gets a white background and a white outline instead of a dark one.
- Text colours change from the inherited slate-700 to the written shade.
- `text-surface-400` (hints in `config-weights-form.vue`) becomes slate-400 #94a3b8, a contrast
  of **2.56:1, which fails AA**.
- `text-primary` (the "Startseite" link in `results.vue`) becomes emerald-500 #10b981, a contrast
  of **2.54:1, which fails AA**.
- `text-surface-500` becomes 4.76:1 and `text-surface-600` 7.58:1 (both pass).
- `bg-surface-50` on `logout.vue` gives a light grey page band.
- `border-surface-100` borders become slate-100.

The class names are PrimeBlocks / `tailwindcss-primeui` vocabulary. The login markup (`email1`,
`password1`, `rememberme1`, `text-base!`) matches PrimeBlocks templates written for Tailwind 4.
That is an inference from the names, not verified.

### 5c. Unchanged

`flex`, `flex-col`, `flex-1`, `flex-wrap`, `grid`, `grid-cols-1`, `sm:`/`md:grid-cols-2`,
`lg:flex-row`, `gap-*`, `items-*`, `justify-*`, `p-*`/`px-*`/`py-*`/`pt-*`/`pb-*`, `mt-*`/`mb-*`,
`-mt-8`, `mx-auto`, `relative`, `w-full`, `w-14`, `h-14`, arbitrary `w-[…]`/`h-[…]`/`max-w-[…]`,
`max-w-4xl`, `max-w-sm`, `text-xs` through `text-3xl`, `font-*`, `leading-*` (apart from the
interaction above), `tracking-wide`, `uppercase`, `text-center`, `truncate`, `overflow-hidden`,
`bg-no-repeat`, `bg-cover`, `bg-center`, `bg-[url(…)]`, `rounded-md`, `rounded-lg`,
`rounded-2xl`, `cursor-pointer`.

## 6. `@tailwindcss/upgrade` on a project with no config file

From the v4.3.3 source (`packages/@tailwindcss-upgrade/src`):

- It needs **Node 20+** and a **clean git tree** (`--force` skips the git check).
- It exits if the installed `tailwindcss` version differs from the one in `package.json`. This app
  lists no `tailwindcss` in `apps/frontend/package.json`.
- It discovers `**/*.css` (respecting gitignore). If no CSS file imports Tailwind or uses
  `@tailwind`, it errors: "Cannot find any CSS files that reference Tailwind CSS. Before your
  project can be upgraded you need to create a CSS file that imports Tailwind CSS or uses
  `@tailwind`."
- For a v3 project it then looks for a `tailwind.config.*` next to the CSS file or in a parent
  directory. If there is none, it errors: "No configuration file found … Please provide a path to
  the Tailwind CSS v3 config file via the `--config` option."
- For v3 projects, the templates to migrate come **only** from the config's `content`. With no
  config the list is empty ("We cannot fallback to the `**/*` pattern"). Git-ignored files and
  files outside the repo are skipped.
- It adds the border-colour compatibility CSS unless `theme.borderColor.DEFAULT` is
  `currentcolor`. It bumps `tailwindcss` (and `@tailwindcss/vite` or `@tailwindcss/postcss` only
  if already present) to `@latest`. It migrates `postcss.config.*` if one exists.

**E4 trial.** A copy of `app/` was set up with three stubs: an `app/assets/css/tailwind.css` with
the three `@tailwind` directives, a `tailwind.config.js` reproducing the module's content globs,
and `tailwindcss@3.4.19` in `package.json`. The tool then:

- migrated the stylesheet to `@import 'tailwindcss';` plus the compatibility block
- deleted `tailwind.config.js`, which was fully migrated, and added no `@source` lines
- bumped `tailwindcss` to 4.3.3
- changed 4 templates: `app.vue`, `login.vue`, `logout.vue`, `result-view.vue` (the rewrites in
  §5a)
- left the `*-surface-*` classes, `text-base!`, plain `border` and colour classes untouched
- printed "No PostCSS config found, skipping migration" and added neither `@tailwindcss/vite` nor
  `@tailwindcss/postcss`

## 7. Other v4 facts that bear on this app

- **Browser support:** Tailwind 4 targets Safari 16.4+, Chrome 111+ and Firefox 128+. It relies on
  `@property` and `color-mix()`. "If you need to support older browsers, we recommend sticking
  with v3.4" (upgrade guide).
- **`<style>` blocks and CSS modules** are processed separately and need `@reference` for
  `@apply`. Not relevant here, because the app has none.
- **JS config** is no longer auto-detected. It can still be loaded with `@config`, but
  `corePlugins`, `safelist` and `separator` are unsupported. Safelisting uses
  `@source inline(…)`.
- **Dynamic class names** must appear as complete strings. The `severityStyle` map in
  `result-view.vue` already does this.

## Open uncertainties

- E3 is a single-page smoke test on macOS arm64. It did not cover HMR on edits, the real app, or a
  linux/arm64 Docker build (prod is arm64).
- Which `vite` the frontend resolves after PR 2 depends on the vite-plus override decision. In E3,
  the Tailwind and Vue plugins loaded real `vite@8.3.5` alongside vite-plus-core.
- Whether `tailwindcss-primeui` 0.6.x stays maintained for PrimeVue 4. Its last release is
  19 months old, and PrimeVue 5 is now npm `latest`.
- How PrimeVue 5's `preflight` and `primeui` layer would change this picture. Not investigated,
  since v5 is outside the map. Its npm package also depends on `@primeui/license-manager`, which
  was not looked into.
- The contrast numbers were computed from sRGB-clamped pixels in Chromium. OKLCH colours outside
  the sRGB gamut can render differently on wide-gamut displays.

## Sources

**Tailwind docs:**

- [Upgrade guide](https://tailwindcss.com/docs/upgrade-guide)
- [Preflight](https://tailwindcss.com/docs/preflight)
- [Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Compatibility](https://tailwindcss.com/docs/compatibility)

**Tailwind source and issues:**

- `@tailwindcss/upgrade` v4.3.3 source:
  - [`src/index.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/@tailwindcss-upgrade/src/index.ts)
  - [`codemods/css/link.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/@tailwindcss-upgrade/src/codemods/css/link.ts)
  - [`codemods/template/prepare-config.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/@tailwindcss-upgrade/src/codemods/template/prepare-config.ts)
  - [`codemods/css/migrate-preflight.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/@tailwindcss-upgrade/src/codemods/css/migrate-preflight.ts)
- Tailwind issues [#19789](https://github.com/tailwindlabs/tailwindcss/issues/19789) (Vite 8 support) and [#19792](https://github.com/tailwindlabs/tailwindcss/issues/19792) (Lightning CSS with Vite 8)
- npm `@tailwindcss/vite` peer ranges for 4.2.1, 4.2.2 and 4.3.3; the `dist/index.mjs` of 4.3.3

**PrimeVue 4 docs:**

- [v4.primevue.org/tailwind](https://v4.primevue.org/tailwind/), with source in `primefaces/primevue` `apps/showcase/doc/tailwind/` ([PluginDoc.vue](https://github.com/primefaces/primevue/blob/master/apps/showcase/doc/tailwind/PluginDoc.vue), [OverrideDoc.vue](https://github.com/primefaces/primevue/blob/master/apps/showcase/doc/tailwind/OverrideDoc.vue), [DarkModeDoc.vue](https://github.com/primefaces/primevue/blob/master/apps/showcase/doc/tailwind/DarkModeDoc.vue), [OverviewDoc.vue](https://github.com/primefaces/primevue/blob/master/apps/showcase/doc/tailwind/OverviewDoc.vue))
- [v4.primevue.org/theming/styled](https://v4.primevue.org/theming/styled/), with source in `apps/showcase/doc/theming/styled/csslayer/` ([SpecificityDoc.vue](https://github.com/primefaces/primevue/blob/master/apps/showcase/doc/theming/styled/csslayer/SpecificityDoc.vue), [LibrariesDoc.vue](https://github.com/primefaces/primevue/blob/master/apps/showcase/doc/theming/styled/csslayer/LibrariesDoc.vue), [ResetDoc.vue](https://github.com/primefaces/primevue/blob/master/apps/showcase/doc/theming/styled/csslayer/ResetDoc.vue))

**PrimeVue 5 docs:**

- [primevue.dev/tailwind](https://primevue.dev/tailwind/); `primevue.org` 301-redirects here
- npm `primevue` dist-tags and times (`latest` 5.0.4, `v4-stable` 4.5.5); `primevue@5.0.4` dependencies

**PrimeVue and Prime UI source** (installed in the workspace):

- `@primeuix/styled@0.7.4/dist/index.mjs`: `getLayerOrder`, `transformCSS`, `defaults.options`
- `@primevue/core@4.5.4`: `basecomponent/index.mjs` (`layer-order`, `first: true`), `usestyle/index.mjs` (`prepend` / `appendChild`), `base/style/index.mjs`
- `@primeuix/themes@2.0.3` `aura/base`: emerald primary, slate surface

**`tailwindcss-primeui`:**

- [primefaces/tailwindcss-primeui](https://github.com/primefaces/tailwindcss-primeui): `packages/tailwindcss-primeui/{package.json, src/v4/theme/colors.css, src/v4/utils/variants.css}`
- the npm tarball for 0.6.1 (`v4/utils/preset.css`, `v4/utils/keyframes.css`, `package.json` exports)

**Nuxt module and Nuxt:**

- `@nuxtjs/tailwindcss@6.14.0/dist/module.mjs` (`defaults`, `resolveCSSPath`, `resolveInjectPosition`, `resolveContentConfig`, `resolveViewerConfig`) and its `package.json`
- the generated `apps/frontend/.nuxt/tailwind/postcss.mjs`
- `@nuxt/schema@4.4.2` PostCSS defaults

**Vite and Vite+:**

- `@voidzero-dev/vite-plus-core@1.4.0/package.json` (`bundledVersions`); npm `vite-plus@1.4.0` dependencies
- [Vite shared options: `css.transformer`](https://vite.dev/config/shared-options) and [build options: `build.cssMinify`, `build.target`](https://vite.dev/config/build-options) (docs show v8.3.4)
- `voidzero-dev/vite-plus` issue search for "tailwind"; `docs/package.json`

**CSS and tooling:**

- [MDN `@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [`oxc-project/oxc` `apps/oxfmt/src/core/oxfmtrc.rs`](https://github.com/oxc-project/oxc/blob/main/apps/oxfmt/src/core/oxfmtrc.rs)

**In-repo:**

- `apps/frontend/app/**`, `apps/frontend/nuxt.config.ts`, `apps/frontend/package.json`
- `docs/adr/0003-ampelfarben-der-niveaustufe.md` (WCAG AA requirement for the severity colours)
