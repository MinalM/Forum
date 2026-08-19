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

- [x] **Vite migration step 4: replace CRA's ESLint config.** Done: #36.
  Replaced `client/package.json`'s `"eslintConfig": {"extends": ["react-app",
  "react-app/jest"]}` with a standalone flat config
  (`client/eslint.config.mjs`, ESLint 9 — the latest major whose engines
  range still covers CI's Node 18.x pin, consistent with the Vite/plugin-react
  version choices from step 1) that ports `eslint-config-react-app`'s
  `base.js` + `index.js` + `jest.js` rule sets rule-by-rule, at the same
  severities, via `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, `eslint-plugin-jest`,
  `eslint-plugin-testing-library`, and `confusing-browser-globals` (the same
  package CRA's config used for `no-restricted-globals`). Deliberately
  dropped: the TypeScript override block and `flowtype` plugin/rules (no
  .ts/.tsx or Flow syntax in this codebase) and `import/no-webpack-loader-syntax`
  (Vite, not webpack). Three `eslint-plugin-testing-library` rules and one
  `eslint-plugin-jest` rule were renamed/removed upstream since CRA pinned
  its version; ported under current names (documented in the config file).
  Also pinned `no-unused-vars`'s `caughtErrors: 'none'` explicitly — ESLint
  9 changed that option's default from `"none"` to `"all"`, which would have
  newly warned on ~13 pre-existing `catch (err) {}` blocks. Verified parity
  against a real baseline: ran the old `eslint-config-react-app` config
  under the still-installed ESLint 8 (via react-scripts) for comparison —
  baseline was 9 problems (4 errors, 5 warnings); the new flat config
  produces the identical 9 problems (same files, same rules) on the
  unmodified `src/` tree. Added `"lint": "eslint src"` script (not wired
  into CI — out of scope for this item). Client Jest suite: 9 suites, 31
  tests, all passing (unaffected — Jest doesn't consume `eslintConfig`).
  `vite build` and `npm audit --omit=dev` (0 vulnerabilities) both
  re-verified clean.

- [x] **Vite migration step 5, first slice: drop the unused `formidable`
  override.** Done: this PR. Attempted the full item below ("prune CRA-only
  `overrides`") and found it doesn't hold together as scoped: the item's
  premise is "once react-scripts is gone", but react-scripts is *not* gone
  — step 3's PR note already flagged that dropping it entirely is "a
  separate, not-yet-scoped step," and `client/package.json`'s `"test"`
  script still runs `react-scripts test` (jest itself isn't even a direct
  client devDependency yet — it's pulled in transitively via
  `react-scripts@5.0.1` → `jest@27.5.1`). Verified concretely: with
  `nth-check`/`postcss`/`svgo`/`@svgr/webpack`/`resolve-url-loader`
  removed from `overrides` and `npm install` re-run, `npm audit --omit=dev`
  does stay clean (0 vulnerabilities, satisfying this item's literal
  acceptance criterion as written) — but the *full* `npm audit` goes from
  25 to 32 vulnerabilities, because those overrides are the only thing
  patching known CVEs inside react-scripts's own (still-installed, still
  in daily use for `npm test`) dev toolchain. Pruning them now would be a
  real, if CI-invisible, security regression, not a cleanup — so this PR
  reverts that experiment and splits the item instead (see the two
  entries below) rather than declaring it done. The one part of the
  original item that *is* unconditionally safe regardless of
  react-scripts's presence: `formidable` doesn't resolve anywhere in
  `client/package-lock.json` (confirmed via `npm ls formidable --all` and
  `grep -c '"formidable"' package-lock.json` → 0 both before and after);
  its override was dead weight. Dropped it; `npm audit --omit=dev` stays
  at 0 vulnerabilities (unchanged) and `npm install` reproduces an
  identical dependency tree for every other package. `nth-check`,
  `postcss`, `svgo`, `@svgr/webpack`, `resolve-url-loader`, and
  `form-data` are all still needed and untouched.

- [x] **`GET /api/posts/:id` returns 400 for 29 of 32 live posts, making
  them unreadable.** Done: #39. Replaced `post.views += 1; await
  post.save()` in `server/controllers/posts.js`'s `getPost` with
  `await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });
  post.views += 1;` (the in-memory bump keeps the already-populated
  response document in sync without a second `findById`/populate
  round-trip). `findByIdAndUpdate` does not run document validators by
  default, so the read path no longer re-triggers the write-path tag
  validators added in PR #33. Added a regression test in
  `server/__tests__/integration/post-operations.test.js` ("Get Single
  Post › should get a post with an oversized tag ... without failing on
  the view-count save") that saves a post with a 31-char tag via
  `validateBeforeSave: false` (simulating a pre-existing row) and asserts
  the detail route still returns 200. Caveat: could not execute the
  server test suite in this environment — `mongodb-memory-server`'s
  binary download to `fastdl.mongodb.org` is blocked by this sandbox's
  network policy (403 on CONNECT, confirmed via the proxy status
  endpoint), unrelated to the code change. `node --check` on the modified
  file passes; the fix and test were written test-first but not run
  end-to-end here — CI's `build-and-test` job (unaffected by this
  sandbox's egress policy) is the first real execution.
  The existing oversized tags in the live DB still need
  `scripts/cleanup-post-tags.js --apply` run by a human against the live
  database — that remains outside this item's scope.

- [x] **Vite migration step 5a: drop react-scripts, run client tests via
  plain Jest.** Done: #40. Added `jest@^30.4.2` +
  `jest-environment-jsdom@^30.4.1` as direct devDependencies (matching the
  server's Jest 30 major per `CLAUDE.md`), bumped `babel-jest` from
  `^27.5.1` to `^30.4.1` to match. Added `testEnvironment: "jsdom"`,
  `roots: ["<rootDir>/src"]`, and
  `setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"]` (the correct Jest
  config key — not `setupFilesAfterEach`, which doesn't exist) to
  `client/package.json`'s `"jest"` block. Added `jest.cssTransform.js`
  mirroring react-scripts' `config/jest/cssTransform.js`, but returning
  `{ code }` per Jest 28+'s transformer protocol (react-scripts' bundled
  version predates that break and returns a bare string — caught by a
  regression test, not just manual verification). Only 7 plain
  (non-CSS-Module) `.css` imports exist in `src/`, so no
  `identity-obj-proxy` was needed; no image/svg imports exist either (only
  plain public-folder URL strings), so no file transform was needed
  either. Deliberately did not carry over CRA's `resetMocks: true` default
  — every test using `jest.fn()`/`jest.mock()` already resets mocks
  explicitly in `beforeEach`. `react-scripts` removed from
  `devDependencies` entirely. Full client Jest suite: 11 suites, 36 tests,
  all passing (up from 9/31 — the delta is 5 new regression tests guarding
  this PR's acceptance criteria). `vite build` and `npm audit --omit=dev`
  (0 vulnerabilities) both re-verified clean. Full `npm audit` dropped
  from 47 to 2 vulnerabilities (both pre-existing, from vite's
  postcss → nanoid chain, unrelated to react-scripts).

- [x] **Vite migration step 5b: prune CRA-only `overrides` and re-audit.**
  Done: this PR. With react-scripts gone (step 5a, #40), re-checked each
  override with `npm ls <pkg> --all`: `nth-check`, `svgo`,
  `@svgr/webpack`, and `resolve-url-loader` no longer resolve anywhere in
  the tree (all `(empty)`) — dropped. `postcss` (pulled in by `vite`) and
  `form-data` (pulled in by `axios`) still resolve — kept, unchanged.
  `client/package.json`'s `overrides` block is now just
  `{ postcss, form-data }`. Added two regression tests to
  `client/src/__tests__/packageJson.test.js` asserting the pruned
  overrides are absent and the still-needed ones remain, written
  test-first (confirmed failing before the `package.json` edit). Verified:
  `npm install` reproduces 897 packages (unchanged from pre-prune);
  `npm audit --omit=dev` → 0 vulnerabilities; full `npm audit` → 2 high
  severity (unchanged from pre-prune — pre-existing `brace-expansion` and
  `nanoid` transitive advisories, both already present before this PR and
  unrelated to the pruned overrides). Full client Jest suite: 11 suites,
  38 tests, all passing (up from 36 — the 2 new tests). `vite build` and
  `npm run lint` both re-verified clean of regressions (lint's 9
  pre-existing problems, from step 4's baseline, are unchanged).

- [ ] **Vite migration step 6: CI workflow verification.** From
  `docs/vite-migration-design.md`: confirm `.github/workflows/node.js.yml`
  needs no structural changes beyond possibly dropping `CI=false` from the
  build step (a CRA-only convention); re-verify `build-and-test` (including
  Playwright against the Vite dev server) and `deploy` (Netlify
  `publish-dir: './client/build'`) end-to-end.
  Acceptance: full CI green on a PR built against the migrated client from
  the prior steps.

- [x] **PostDetail crashes the entire React app when a post's author has
  been deleted (`post.user` is null).** Done: this PR. Guarded the author
  block in `client/src/pages/PostDetail.js` (post-header meta, `isAuthor`
  was already null-safe) so `post.user ? <Link …>{post.user.name}</Link> :
  <span>Deleted user</span>` renders instead of dereferencing `post.user._id`
  unconditionally. Added `client/src/pages/__tests__/PostDetail.test.js`
  (new file — no prior test existed), written test-first: confirmed both
  cases threw `TypeError: Cannot read properties of null (reading '_id')`
  against the unmodified component, then verified they pass after the fix.
  Covers: component mounts without throwing and shows "Deleted user" for a
  post with `user: null`, and the rest of the post (title, content,
  category) still renders. Full client Jest suite: 12 suites, 40 tests, all
  passing (up from 38 — the 2 new tests). `npm run lint` unaffected (same 9
  pre-existing problems as the step 4 baseline). `vite build` re-verified
  clean.

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
