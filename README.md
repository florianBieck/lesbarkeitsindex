# Visual check for PR 2 (Nuxt → Vue SPA)

Throwaway branch, never merged. Screenshots of `main` (Nuxt 4 prod build, `node .output/server/index.mjs` on :3001) and of
`refactor/frontend-vue-spa` (`vite build` + `vite preview` on :3001), each against its own backend on :3000 and the same
database, taken with `shoot.mjs` (Playwright, Chromium, 1280×4000 viewport, so a full-page shot never resizes the page and
redraws the chart). `diff.py` compares them pixel by pixel; `diff/` paints every differing pixel red on the branch's shot.

| Page | Result |
| --- | --- |
| 01 start page, empty | 1 px inside the logo (decode noise; the same header is identical on 03–12 and 14) |
| 02 start page, menu open (signed out) | 1 px inside the logo, as 01 |
| 03 login | identical |
| 04 admin, signed out | identical |
| 05 results, signed out | identical |
| 06 start page, menu open (signed in) | identical |
| 07 start page with a result, sections collapsed | identical |
| 08 start page with a result, all sections open | identical |
| 09 results | identical |
| 10 results, row selected | identical |
| 11 results after a reload | identical |
| 12 admin, signed in | identical |
| 13 `/gibtsnicht` | differs on purpose: Nuxt's English 404 page on `main`, the new German not-found page in the app shell on the branch |
| 14 after sign-out | identical |
