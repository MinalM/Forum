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

- [x] **Vite migration step 6: CI workflow verification.** Done: this PR.
  Audited `.github/workflows/node.js.yml` against
  `docs/vite-migration-design.md` step 10/11 and the risks section: no
  structural change is needed anywhere in the workflow. Specifically —
  `build-and-test`'s `echo "REACT_APP_API_URL=..." > client/.env` step,
  `npm run build --if-present` (root script is `cd client && npm run
  build` → `vite build` since step 5a), and the Playwright `webServer`
  block all already target the Vite output as-is (`build.outDir: 'build'`
  kept unchanged since step 1); `deploy`'s Netlify `publish-dir:
  './client/build'` likewise needs no change. Confirmed via `npm view`
  against the registry that the pinned `vite@6.4.3` and
  `@vitejs/plugin-react@4.7.0` both declare `engines.node` ranges
  including `18.x` (`^18.0.0 || ^20.0.0 || >=22.0.0` and `^14.18.0 ||
  >=16.0.0` respectively), so CI's `node-version: [18.x]` matrix needs no
  bump for this pinned Vite major (the separate, already-filed backlog
  item below tracks whether to bump Node for a *future* Vite major).
  On the one candidate change the design doc flagged — dropping `CI=false`
  from the two `npm run build` invocations (`build-and-test` and
  `deploy`) since it's a CRA-only "warnings as errors" convention Vite
  doesn't read — this run's ground rules bar modifying
  `.github/workflows/` outside of an item explicitly scoped to that (this
  item's *acceptance criteria* is CI verification, not a workflow edit).
  Investigated whether leaving it is actually harmful rather than just
  vestigial: `vite build` doesn't consult `process.env.CI`, and neither
  does `npm run build`'s own invocation of it (`CI=false` is simply an
  extra env var the build process ignores), so it's inert, not a bug.
  Filed the cleanup as its own explicitly-scoped follow-up item below
  rather than doing it inline. No source files changed in this PR — the
  verification is the PR itself: this diff (BACKLOG.md only) still runs
  the full `build-and-test` job (build + unit tests + Playwright against
  the Vite dev server) and `security` job against the accumulated Vite
  migration, which is the "full CI green" acceptance criterion.

- [ ] **Drop the vestigial `CI=false` from the two `npm run build`
  invocations in `.github/workflows/node.js.yml`** (`build-and-test`'s
  build step and the `deploy` job's client build step). Confirmed via the
  Vite step 6 verification above that it's a no-op under Vite (a CRA-only
  convention Vite's build doesn't read) — removing it is a pure cleanup,
  not a fix. Deliberately not part of that item since removing it requires
  editing `.github/workflows/`, which needs its own explicitly-scoped PR
  per this repo's autonomous-cycle rules.
  Acceptance: both `CI=false` occurrences removed; `build-and-test` and
  `deploy` still succeed unchanged.

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

- [x] **Post content renders raw markdown.** Done: this PR. Chose to render
  markdown rather than strip it, since post bodies are meant to hold
  formatted markdown (the backlog item's own example content —
  `**Title:** ... **Description:**` — reads like intentionally-formatted
  markdown a user wrote, not accidental syntax noise). Added
  `client/src/utils/markdown.js`: `renderMarkdown()` runs `marked.parse()`
  then always pipes the output through `DOMPurify.sanitize()` before it's
  used with `dangerouslySetInnerHTML` in
  `client/src/pages/PostDetail.js`'s `.post-content` (marked does not
  sanitize its own HTML output, so this ordering is load-bearing, not
  incidental); `markdownToPlainText()` reuses the same sanitized-HTML path
  and reduces it to `textContent` via a detached `div`, so
  `client/src/components/posts/PostItem.js`'s 200-char excerpt now
  truncates plain text instead of raw markdown (fixing mid-syntax splits
  like a `**` pair torn across the truncation boundary as a side effect).
  Picked `marked` + `dompurify` over `react-markdown`/`remark`/`rehype`:
  both are zero-dependency, CJS/ESM-dual packages (`require`-resolvable
  under Jest, unlike the ESM-only `unified` ecosystem), so no
  `transformIgnorePatterns` whitelist changes were needed in
  `client/jest.babelTransform.js`/`client/package.json`. Version-pinned
  for CI's Node 18.x matrix: `marked`'s latest majors (16-18) require Node
  ≥20, so pinned `marked@^15.0.12` (last major supporting Node ≥18, same
  constraint pattern as the Vite-migration version pins);
  `dompurify@^3.4.14` has no `engines` restriction. `npm audit --omit=dev`
  stays at 0 vulnerabilities after adding both (full `npm audit` unchanged
  at 2, the same pre-existing `brace-expansion`/`nanoid` dev-tree
  advisories noted in the Vite migration steps — unrelated to this PR).
  Tests: `client/src/utils/__tests__/markdown.test.js` (new, 12 tests) —
  bold/italic/links/code/lists render correctly, and `<script>` tags,
  `onerror`-style event-handler attributes, and `javascript:` URIs (both
  in markdown links and raw `<a>` HTML) are all neutralized.
  `client/src/components/posts/__tests__/PostItem.test.js` (new, 4 tests)
  — excerpts show no raw markdown syntax, links/code strip to visible
  text, truncation still caps at 200 chars, and a script-tag payload
  doesn't survive into the excerpt. Extended
  `client/src/pages/__tests__/PostDetail.test.js` (+3 tests) with the same
  markdown-renders / script-neutralized / onerror-neutralized coverage on
  the detail page. All new assertions use `screen` queries only (no
  `document.querySelector`/`container` access), matching this repo's
  `testing-library/no-node-access` and `testing-library/no-container`
  lint rules (both `error`). Full client Jest suite: 14 suites, 59 tests,
  all passing (up from 40 — the 19 new tests above). `npm run lint`:
  same 4 pre-existing errors / 5 pre-existing warnings as the step-4
  baseline, plus 2 new `no-script-url` warnings from the XSS-payload test
  fixtures themselves (`javascript:alert(1)` string literals) — no new
  errors. `vite build` re-verified clean.
  Deliberately out of scope: `client/src/pages/PostDetail.js`'s
  `.comment-content` block has the identical raw-markdown-rendering issue
  for comment bodies (not post bodies) — filed as its own item below
  rather than folded in here, since the backlog item as written scoped
  only to "post content"/"post bodies".

- [x] **Per-page document titles.** Done: this PR. Added
  `client/src/hooks/useDocumentTitle.js` — a small `useEffect`-based hook
  (matching the existing lightweight style of `useFeatureFlag.js`) that
  sets `document.title` to `"<title> | AI/ML Career Forum"`, or just
  `"AI/ML Career Forum"` when called with no title/an empty title. No
  `react-helmet` dependency needed. Wired into every route component:
  `Home` (site name only), `Login` ("Login"), `Register` ("Register"),
  `NotFound` ("Page Not Found"), `PostDetail` (`post?.title`, so it
  reads the fallback site name until the post loads, then the post's
  title), `CategoryPosts` (`category?.name`, same fetched-then-set
  pattern), and `SearchResults` (`` `Search: ${query}` `` or plain
  "Search" when the query is empty). Routes rendered only behind
  `PrivateRoute`/`AdminRoute`/`ModeratorRoute` (`Dashboard`, `Profile`,
  `EditProfile`, `Categories`, `CreatePost`, `EditPost`, admin/moderator
  pages, `OAuthSuccess`) were left out of this item's scope — the
  backlog item's acceptance criteria and its verified routes (`/`,
  `/login`, a post detail page, `/search?q=`, the 404 page) only named
  public-facing routes; filed the rest as a follow-up item below rather
  than silently expanding scope.
  Tests: `client/src/hooks/__tests__/useDocumentTitle.test.js` (new, 4
  tests, written test-first — confirmed failing with "Cannot find
  module" before the hook existed) covers the no-title/empty-title
  fallback, the suffixed case, and that the title updates across
  re-renders. Added `document.title` assertions to the existing
  `PostDetail.test.js`, `CategoryPosts.test.js` (new
  "CategoryPosts document title" describe block), `SearchResults.test.js`,
  and `Home.test.js` (new "Home document title" describe block) suites,
  plus new `Login.test.js`, `Register.test.js`, and `NotFound.test.js`
  files (none existed before for these three pages). Full client Jest
  suite: 18 suites, 70 tests, all passing (up from 14/59 — the 11 new
  tests above). `npm run lint`: same 4 pre-existing errors / 7
  pre-existing warnings as prior baselines (unaffected by this PR).
  `vite build` re-verified clean.

- [x] **Mobile touch targets below the 44px minimum.** Done: this PR.
  Fixed all four element groups named in this item's acceptance criteria
  with `min-height`/`min-width: 44px` declarations: `.nav-link` and
  `.mobile-menu-toggle` (`client/src/App.css`, inside the existing
  `@media (max-width: 768px)` block, so desktop's nav sizing is
  unchanged), `.navbar-search-input`/`.navbar-search-btn`
  (`client/src/components/layout/Navbar.css`, new mobile-only media
  block, same rationale), `.pagination button` (`App.css`, same mobile
  block — pagination has no separate desktop-only layout to preserve, but
  kept mobile-scoped for consistency with the other three), and
  `.categories-sidebar .category-item a` (`App.css`, unscoped — this
  selector had *no* CSS at all before this PR, so there's no desktop
  behavior to regress; anchors are inline by default, so it also needed
  `display: flex` for `min-height` to take effect at all).
  `.mobile-menu-toggle` and `.nav-item` turned out to already have a
  second, redundant `@media (max-width: 768px)` block earlier in
  `App.css` (pre-existing duplication, not introduced by this PR) —
  left as-is rather than consolidated, since deduplicating unrelated CSS
  is outside this item's scope; filed as a follow-up below.
  Verified with a real 375px browser measurement was not possible: task
  ground rules for this run say "Do not run Playwright — CI covers
  e2e," and `mongodb-memory-server`/a live app aren't available in this
  sandbox either. Used the same file-content-assertion pattern already
  established in `client/src/__tests__/packageJson.test.js` instead:
  new `client/src/__tests__/mobileTouchTargets.test.js` parses the raw
  CSS source (brace-matching to pull out the `@media (max-width: 768px)`
  block content, merging the pre-existing duplicate occurrences the same
  way a real cascade would) and asserts `min-height`/`min-width: 44px`
  on each of the five selectors above — written test-first, confirmed
  failing (`no mobile media query found` / a `null` min-height) before
  the CSS changes, passing after. Full client Jest suite: 19 suites, 76
  tests, all passing (up from 18/70 — the 6 new tests). `npm run lint`:
  same 4 pre-existing errors / 7 pre-existing warnings baseline
  (unaffected). `vite build` re-verified clean.

- [x] **Auth inputs missing `autocomplete` attributes.** Done: this PR.
  Added `autoComplete="email"` to the email inputs and
  `autoComplete="current-password"` to the password input on
  `client/src/pages/Login.js`; added `autoComplete="email"` to the email
  input and `autoComplete="new-password"` to both the password and
  confirm-password inputs on `client/src/pages/Register.js`. Searched the
  codebase for a separate password-change/reset form (`grep -r password
  client/src`) — none exists; `EditProfile.js` has no password field, and
  `AuthContext.js`'s only other password usage is the login/register API
  calls already covered above. So this item's acceptance criteria ("login,
  register, and any password-change form") is fully covered by the two
  files touched; no reset flow was silently skipped.
  Tests: extended `client/src/pages/__tests__/Login.test.js` (+2 tests) and
  `client/src/pages/__tests__/Register.test.js` (+3 tests), written
  test-first — confirmed all 5 failing (`autocomplete` attribute `null`)
  against the unmodified components before the change. Full client Jest
  suite: 19 suites, 81 tests, all passing (up from 76 — the 5 new tests).
  `npm run lint`: same 4 pre-existing errors / 7 pre-existing warnings
  baseline, unaffected. `vite build` re-verified clean.

- [x] **No Open Graph / social preview metadata.** Done: this PR. Added
  static `og:title`, `og:description`, `og:type` (`website`), `og:url`,
  and `twitter:card`/`twitter:title`/`twitter:description` tags to
  `client/index.html`, alongside the existing `meta[name=description]`.
  `og:url` can't be a literal value in source — the repo has no
  documented production domain anywhere (checked `DEPLOYMENT.md`,
  `netlify.toml`, `README.md`; `DEPLOYMENT.md` itself only ever uses
  `<your-domain>` placeholders for this exact reason) — so it uses Vite's
  built-in `%ENV_NAME%` HTML env-replacement syntax:
  `<meta property="og:url" content="%REACT_APP_SITE_URL%" />`, backed by
  a new `REACT_APP_SITE_URL` var in `client/.env.production` (same file,
  same placeholder convention as the pre-existing
  `REACT_APP_GOOGLE_ANALYTICS_ID=your_ga_id_here` line). Initially
  defaulted to the RFC 2606 placeholder `https://your-domain.example`;
  once this PR was opened, Netlify's own deploy-preview bot comment on
  it revealed the real site domain
  (`cerulean-marshmallow-003d16.netlify.app`), so the value was updated
  to `https://cerulean-marshmallow-003d16.netlify.app` — the actual
  production URL, not a placeholder. Verified the substitution actually
  resolves at build time, not just in source: ran both `npx vite build
  --mode production` and the real `npm run build` (matches what
  CI/Netlify invoke) and confirmed `build/index.html` contains the
  resolved `<meta property="og:url"
  content="https://cerulean-marshmallow-003d16.netlify.app" />` rather
  than the literal `%REACT_APP_SITE_URL%` token.
  If a custom domain is ever attached in Netlify, `REACT_APP_SITE_URL`
  should be updated to match (here or via a Netlify env var override).
  Per-post dynamic previews (server-side rendering per post) remain
  explicitly out of scope, as originally scoped.
  Tests: `client/src/__tests__/socialMeta.test.js` (new, 5 tests, written
  test-first — confirmed all 5 failing against the unmodified
  `index.html` before the change) parses the raw `client/index.html`
  source and asserts each of the five required tags is present with
  non-empty (or, for `og:type`, exactly `"website"`) content — following
  the same raw-source-assertion pattern already established in
  `mobileTouchTargets.test.js`/`packageJson.test.js` since no live
  browser/e2e is available in this environment (ground rules: no
  Playwright). Full client Jest suite: 20 suites, 86 tests, all passing
  (up from 19/81 — the 5 new tests). `npm run lint`: same 4 pre-existing
  errors / 7 pre-existing warnings baseline, unaffected. `npm audit
  --omit=dev`: 0 vulnerabilities (unaffected, no new dependency added).

- [x] **CI's Node 18.x pin blocks newer Vite/plugin-react majors.**
  Done: this PR. Decision: stay on Vite 6 (`^6.4.3`) / `@vitejs/plugin-react`
  4 (`^4.7.0`) for now rather than bump CI's Node matrix. Reasoning: bumping
  `.github/workflows/node.js.yml`'s `build-and-test` matrix off
  `node-version: [18.x]` is itself a `.github/workflows/` edit, and every
  autonomous-cycle run's ground rules bar modifying `.github/workflows/`
  outright (not just "without it being the item's explicit scope" as this
  item's original text assumed) — so no autonomous PR can ever carry out
  the "bump" branch of this decision; only a human-driven change can. Given
  that, and that this item was already flagged low-priority with current
  pins "not blocking anything else in the migration steps already scoped,"
  staying put is the only option actually available to this loop, and
  nothing has since made Node 18 a practical blocker: CI's Node 18.x is
  still within `vite@6`'s (`^18.0.0 || ^20.0.0 || >=22.0.0`) and
  `@vitejs/plugin-react@4`'s (`^14.18.0 || >=16.0.0`) supported
  `engines.node` ranges (re-confirmed against the versions actually
  installed in `client/package.json`), and Node 18 itself is out of
  upstream LTS support as of 2025-04-30, which is a separate, larger
  concern (bumping the whole CI runtime, not just these two packages) than
  this item's narrow Vite-major framing. Filed that broader concern as its
  own follow-up item below rather than folding it in here.
  No source files changed — this is a documentation-only decision PR,
  consistent with the precedent set by the Vite migration step 6 item
  above ("No source files changed in this PR — the verification is the PR
  itself").

- [ ] **CI still pins Node 18.x, which is past upstream LTS
  (end-of-life 2025-04-30).** Discovered while documenting the Node
  18.x/Vite-major decision above: independent of any Vite version
  question, running CI against an unsupported Node line is a standing
  risk (no further security patches from upstream Node itself) and
  eventually a hard blocker once some dependency drops Node 18 support
  entirely. Bumping `.github/workflows/node.js.yml`'s `node-version:
  [18.x]` matrix (both the `build-and-test` job and the `deploy` job's
  `node-version: '18'`) requires editing `.github/workflows/`, so — same
  as the item above — no autonomous-cycle PR can carry this out under the
  current ground rules; it needs a human-driven change (and, at that
  point, revisiting whether to also bump Vite/plugin-react past their
  current Node-18-compatible pins, per the item above). Not urgent enough
  to block anything today, but should not be indefinitely deferred.
  Acceptance: CI's Node matrix bumped to an actively-supported LTS line
  (currently 20.x or 22.x); full suite (unit + Playwright) re-verified
  green under the new version; `client/package.json` engines/version pins
  revisited if the bump also permits newer Vite/plugin-react majors.

- [x] **Comment content renders raw markdown too.** Done: this PR. Wired
  the already-existing `renderMarkdown()` (from
  `client/src/utils/markdown.js`, added for post-content rendering; it
  runs `marked.parse()` then always `DOMPurify.sanitize()`s the result)
  into `client/src/pages/PostDetail.js`'s `.comment-content` block, same
  `dangerouslySetInnerHTML` pattern already used for `.post-content`. No
  new dependency or design decision needed — exactly as scoped.
  Tests: extended `client/src/pages/__tests__/PostDetail.test.js` with a
  new "PostDetail comment markdown rendering" describe block (+3 tests,
  written test-first — confirmed all 3 failing against the unmodified
  component: bold/link markdown showed as literal `**`/`[link](...)`
  syntax, and the `<script>`/`onerror` XSS payloads rendered as escaped
  literal text rather than being parsed and stripped), mirroring the
  existing post-content markdown tests in the same file. Full client Jest
  suite: 20 suites, 89 tests, all passing (up from 86 — the 3 new tests).
  `npm run lint`: same 4 pre-existing errors / 7 pre-existing warnings
  baseline, unaffected. `vite build` re-verified clean.
  Note: this PR's own ground rules bar modifying `.github/workflows/`, so
  it could not also take the two workflow-editing backlog items above
  (`CI=false` cleanup, Node 18.x bump) — those remain open, needing a
  human-driven change.

- [x] **Per-page document titles for authenticated/admin routes.** Done:
  this PR. Wired the existing `useDocumentTitle()` hook into all ten
  routes named by this item, mechanically as scoped: `Dashboard`
  ('Dashboard'), `EditProfile` ('Edit Profile'), `Categories` ('Forum
  Categories', matching its `<h1>`), `CreatePost` ('Create New Post'),
  `EditPost` ('Edit Post'), `AdminUsers` ('User Management'),
  `AdminDashboard` ('Admin Dashboard'), `ModeratorDashboard` ('Moderator
  Dashboard') all use a static string; `Profile` uses `user?.name` (the
  fetched-then-set pattern the earlier item used for `PostDetail`/
  `CategoryPosts`), so it reads the fallback site name until the profile
  loads, then the viewed user's name; `OAuthSuccess` (no page heading to
  match — a transient redirect screen) uses 'Signing In'.
  Found and worked around one test-only hazard, not a production bug:
  `OAuthSuccess`'s redirect effect depends on `location`, which gets a
  new identity on every `navigate()` call; in production this is safe
  because navigating away unmounts `OAuthSuccess` (the route no longer
  matches), but a test that renders it bare (no matching `<Routes>` to
  unmount it on redirect) never unmounts, so the effect refires on every
  new `location` and navigates in an infinite loop. Fixed by routing the
  test the same way the app does (matching `/oauth-success` and `/login`
  routes) rather than changing the component.
  Tests: new `client/src/pages/__tests__/{Dashboard,Profile,EditProfile,
  Categories,CreatePost,EditPost,AdminUsers,AdminDashboard,
  ModeratorDashboard}.test.js` (one `document.title` assertion each,
  none of these pages had a test file before), plus a new "OAuthSuccess
  document title" describe block in the existing
  `OAuthSuccess.test.js`. `EditPost`'s test mocks `useAuth()` directly
  rather than using a real `AuthProvider`, since `EditPost`'s own effect
  reads `user._id` unconditionally (no null guard) and would otherwise
  race a real `AuthProvider`'s async `/api/users/me` load on first
  mount — a separate, pre-existing latent bug filed as its own follow-up
  item below rather than fixed inline here (out of this item's scope).
  Full client Jest suite: 29 suites, 99 tests, all passing (up from 20/89
  — the 10 new suites above). `npm run lint`: same 4 pre-existing errors
  / 7 pre-existing warnings baseline, unaffected. `vite build`
  re-verified clean.

- [ ] **`client/src/App.css` has a duplicate `@media (max-width: 768px)`
  block.** Discovered while fixing mobile touch targets (see the item
  above). `.mobile-menu-toggle`, `.navbar-nav`, `.navbar-nav.show`, and
  `.nav-item` are each declared once in a first mobile media block
  (around the navbar styles) and again, redundantly, in a second one
  further down (the file's "Responsive styles" section). Not a bug today
  — the properties either match exactly or don't conflict, so the
  cascade produces the same result either way — but it's confusing to
  read and a trap for a future edit to one copy that should've gone to
  both. Low priority, purely a cleanup.
  Acceptance: the two blocks merged into one; full client Jest suite and
  `vite build` unchanged/still passing.

- [ ] **`EditPost` can crash-redirect a valid edit request away when the
  page is opened directly (a fresh load / hard refresh), before auth has
  finished loading.** Discovered while adding this page's document-title
  test (see the per-page document titles item above): `EditPost`'s
  data-fetch `useEffect` in `client/src/pages/EditPost.js` reads
  `user._id` unconditionally (`if (user._id !== postData.user._id && ...)`)
  with no null guard, and its dependency array includes `user`. On a
  direct navigation to `/posts/edit/:id` (not client-side nav from an
  already-authenticated session), `AuthContext`'s `user` is still `null`
  on first render while `/api/users/me` is in flight, so this effect's
  first run throws on `null._id`, which the surrounding `try/catch`
  turns into "Error fetching post data" plus `navigate('/')` — even
  though the user is in fact authorized. The effect does re-run once
  `user` resolves, but the redirect has already fired by then. Every
  other page that gates on `user` (`Dashboard`, `AdminUsers`,
  `AdminDashboard`, `ModeratorDashboard`) checks `!user`/`isAuthenticated`
  before dereferencing it; `EditPost` is the one exception.
  Acceptance: `EditPost` waits for auth to resolve (e.g. guard on
  `!user` the same way `Dashboard` does) before comparing
  `user._id`/`postData.user._id`; a regression test renders `EditPost`
  behind a real (not mocked) `AuthProvider` with a token set and asserts
  the edit form renders instead of redirecting to `/`.
