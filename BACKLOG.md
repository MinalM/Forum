# Backlog

Source of truth for the autonomous development cycle. Items are ordered by
priority; each is scoped to one development cycle (one PR). The nightly agent
takes the **topmost unchecked item**, runs the full cycle (design → plan →
TDD implementation → verification), and opens a PR referencing the item.
Items are checked off when their PR merges.

Rules for items:
- One PR of work or less. If an item turns out bigger, split it and re-list.
- Each item states acceptance criteria the PR must demonstrate (with tests).
- New discoveries (bugs, cleanups) get appended with a priority judgment,
  not silently fixed inside unrelated PRs.
- Completed items move to `docs/BACKLOG-ARCHIVE.md` (with their "Done" notes)
  so this file stays short enough to read in full every run.

## Items

- [x] **Post tags are polluted with category-description fragments.**
  Done: #33. `server/seeder.js`, `scripts/generate-seed.js`, and
  `scripts/seed-mongo.js` were audited and already produce clean, short
  tags (no code change needed there — the join-category-description root
  cause named in this item's original text was not present in any
  versioned seed source; the polluted rows on the live site predate these
  scripts and must have been seeded some other way). What was missing was
  server-side enforcement: `Post.tags` had no validation at all, so the
  API would silently accept arbitrarily long/many tags. Added a shared
  `normalizeTags()` helper (trim, drop empties, dedupe) used by
  `createPost`/`updatePost`, plus Post schema validators rejecting more
  than 10 tags or any tag over 30 characters — this also makes
  `Post.create()` (including from `server/seeder.js`) enforce the same
  caps going forward. Added `scripts/cleanup-post-tags.js`, a documented,
  not-auto-run one-off a human must execute against the target database
  (dry run by default, `--apply` to persist) to strip already-polluted
  tags from existing rows.

- [x] **Vite migration step 1: add Vite tooling and dev/build scripts.**
  Done: #34. Added `vite` + `@vitejs/plugin-react` as client devDeps,
  `client/vite.config.js` (proxy `/api` → `localhost:2000`, port 3000,
  `build.outDir: 'build'`, `envPrefix: 'REACT_APP_'`), moved
  `client/public/index.html` to `client/index.html` dropping
  `%PUBLIC_URL%` templating, replaced `start`/`build` scripts with
  `vite`/`vite build`, dropped `eject`. Pinned `vite@^6.4.3` +
  `@vitejs/plugin-react@^4.7.0` (not their current latest majors) since
  Vite 7 / plugin-react 5+ require Node ≥20.19 and CI is pinned to Node
  18.x. Undocumented snag not covered by the design doc: all `client/src`
  uses JSX in `.js` files (CRA convention), and Vite's esbuild plugin
  excludes `.js` by default even with a custom `include`, so
  `vite.config.js` also sets `exclude: []` to opt them back in. Client
  Jest suite (still running via `react-scripts test`, untouched by this
  item) passes as-is: 8 suites, 27 tests.
  Step 2 (env vars) got pulled into this same PR — see below; step 1 alone
  left the live app throwing `process is not defined` and rendering a
  blank page (caught via a local Playwright/headless-browser check after
  CI's e2e job failed the same way), so shipping step 1 without it wasn't
  an option.

- [x] **Vite migration step 2: env vars.** Done: #34 (folded into the same
  PR as step 1 — see note above). Updated `client/src/config.js` and
  `client/src/index.js` from `process.env.REACT_APP_*`/`process.env.CI` to
  `import.meta.env.REACT_APP_*`; dropped the CI-branch API URL logic
  entirely rather than replacing it, since CI already sets
  `REACT_APP_API_URL` directly (the workflow's `echo ... > client/.env`
  step and Playwright's `webServer` env), making the CI-specific branch
  redundant (and its hardcoded `localhost:5000` never matched CI's actual
  server port 2000 anyway). Also needed: `client/jest.babelTransform.js`'s
  `import.meta` → `({})` strip plugin now replaces with
  `({ env: process.env })` instead — application code reading
  `import.meta.env.REACT_APP_*` needs that to resolve under Jest too, not
  just react-router's `import.meta` usage. `.env.production` and CI's env
  injection unchanged. Client Jest suite: 8 suites, 28 tests, all passing.

- [x] **Vite migration step 3: Jest under the post-CRA transform chain.**
  Done: #35. Replaced `babel-preset-react-app` in
  `client/jest.babelTransform.js` with `@babel/preset-env`
  (`targets: { node: 'current' }`) + `@babel/preset-react`
  (`runtime: 'automatic'`) configured directly, added as direct
  devDependencies (`@babel/core`, `@babel/preset-env`,
  `@babel/preset-react`, `babel-jest`) rather than relying on them being
  resolvable transitively through `react-scripts`. Kept the
  `import.meta`→`({ env: process.env })` strip plugin, `axios`
  `moduleNameMapper`, and `transformIgnorePatterns` allowlist unchanged.
  `react-scripts` (and its transitive `babel-preset-react-app`) stays in
  the tree — it's still the `test` script's runner wrapper; dropping it
  entirely is a separate, not-yet-scoped step. Full client Jest suite: 9
  suites, 31 tests, all passing (up from 8/28 — the delta is 3 new
  regression tests added in this PR guarding the transform's dependency
  and behavior). `npm run build` (Vite) and
  `npm audit --omit=dev` both re-verified clean.

- [ ] **Vite migration step 4: replace CRA's ESLint config.** From
  `docs/vite-migration-design.md`: `client/package.json`'s
  `"eslintConfig": {"extends": ["react-app", "react-app/jest"]}` depends on
  `eslint-config-react-app`. Do a rule-by-rule comparison and replace with a
  standalone config (hooks rules, JSX a11y rules) so lint coverage doesn't
  silently regress.
  Acceptance: `npx eslint src` (or equivalent) runs clean under the new
  config with parity to the prior rule set, documented in the PR.

- [ ] **Vite migration step 5: prune CRA-only `overrides` and re-audit.**
  From `docs/vite-migration-design.md`: `client/package.json`'s `overrides`
  (`nth-check`, `postcss`, `svgo`, `@svgr/webpack`, `resolve-url-loader`)
  exist to patch react-scripts's webpack/SVG transitive CVEs; drop whichever
  no longer apply once react-scripts is gone (verify `form-data`/
  `formidable` are still needed by remaining deps before dropping those too).
  Acceptance: `cd client && npm audit --omit=dev` stays clean after pruning.

- [ ] **Vite migration step 6: CI workflow verification.** From
  `docs/vite-migration-design.md`: confirm `.github/workflows/node.js.yml`
  needs no structural changes beyond possibly dropping `CI=false` from the
  build step (a CRA-only convention); re-verify `build-and-test` (including
  Playwright against the Vite dev server) and `deploy` (Netlify
  `publish-dir: './client/build'`) end-to-end.
  Acceptance: full CI green on a PR built against the migrated client from
  the prior steps.

- [ ] **Post content renders raw markdown.** Post bodies are stored with
  markdown but rendered as plain text, so users see the literal syntax —
  e.g. `/posts/6924f058f1be24e72e9fa294` displays
  "\*\*Title:\*\* Image Classification Model in Python \*\*Description:\*\*"
  on the detail page and in every excerpt. Either render markdown (a
  sanitized renderer — never `dangerouslySetInnerHTML` with unsanitized
  input, since post content is user-supplied) or strip the syntax for
  excerpts. Decide and justify the choice in the PR; if rendering, cover at
  minimum bold/italic/links/code/lists and escape raw HTML.
  Deliberately sequenced after the Vite steps: this adds a client
  dependency, and doing that mid-migration muddies both changes.
  Acceptance: component tests render markdown correctly AND prove XSS
  payloads in post content are neutralized; excerpts show no raw syntax.

- [ ] **Per-page document titles.** Every route sets the same
  `<title>AI/ML Career Forum</title>` — verified on `/`, `/login`, a post
  detail page, `/search?q=`, and the 404 page. Browser tabs, history, and
  bookmarks are indistinguishable, and search engines see one title for the
  whole site. Set a per-route title (post title, category name,
  "Search: <query>", "Page not found") plus a matching document title on the
  404 route.
  Acceptance: tests assert `document.title` per route; the site name still
  appears (e.g. `<page> · AI/ML Career Forum`).

- [ ] **Mobile touch targets below the 44px minimum.** At a 375px viewport,
  16 of 27 interactive elements are under 44px tall — the navbar search
  input measures 173×19, its submit button 17×19, and category links 21px
  tall. WCAG 2.5.5 / mobile usability: pointer targets should be at least
  44×44 CSS px (or have equivalent spacing).
  Acceptance: a documented sweep at 375px showing primary interactive
  elements (nav links, search input/button, category links, pagination
  buttons) meet the minimum; no layout regression at desktop widths.

- [ ] **Auth inputs missing `autocomplete` attributes.** `/login`'s email
  and password inputs have proper `<label>`s but no `autocomplete`, so
  password managers can't reliably fill or save credentials (WCAG 2.1 AA
  1.3.5, Identify Input Purpose). Add `autocomplete="email"` /
  `"current-password"` on login and `"new-password"` on register/reset
  flows.
  Acceptance: tests assert the attributes on login, register, and any
  password-change form.

- [ ] **No Open Graph / social preview metadata.** The document has a
  `meta[name=description]` but no `og:*` or `twitter:*` tags, so links
  shared to Slack/LinkedIn/X render with no title, description, or image.
  Add static defaults for the site.
  Note: sequence after Vite step 1, which moves `client/public/index.html`
  to `client/index.html` — doing this first would create a needless
  conflict. Per-post dynamic previews need server-side rendering and are
  explicitly out of scope; static site-level defaults only.
  Acceptance: `og:title`, `og:description`, `og:type`, `og:url`, and
  `twitter:card` present in the built HTML; documented in the PR.

- [ ] **CI's Node 18.x pin blocks newer Vite/plugin-react majors.**
  Discovered while implementing Vite migration step 1 (#34): Vite 7 and
  `@vitejs/plugin-react` 5+ both require Node `^20.19.0 || >=22.12.0`, so
  that PR pinned to Vite 6 / plugin-react 4 (both support Node 18)
  instead of current latest. `.github/workflows/node.js.yml`'s
  `build-and-test` matrix is `node-version: [18.x]`. Not fixed inline
  since bumping the CI Node matrix is unrelated to the migration itself
  and touches `.github/workflows/`, which the autonomous cycle's ground
  rules say not to modify without it being the item's explicit scope.
  Acceptance: decide whether to bump CI's Node matrix (and re-verify the
  full suite + Playwright under the new version) or stay on Vite
  6/plugin-react 4 long-term; document the decision. Low priority —
  current pins aren't blocking anything else in the migration steps
  already scoped.
