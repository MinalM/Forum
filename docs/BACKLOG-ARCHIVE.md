# Backlog archive

Completed items moved out of `BACKLOG.md`, newest section last. Kept for the
decision history — the "Done" notes explain *why* several items were resolved
the way they were, which is easy to lose once the checkbox is ticked.

The nightly agent reads `BACKLOG.md` only; this file exists for humans (and
for any future run that needs the rationale behind a past decision).

## Cycle 1 — initial queue (Aug 2026)

- [x] **Backend search endpoint for posts.** Add `GET /api/posts/search?q=`
  performing a case-insensitive search over post title/content (MongoDB text
  index or regex), returning the standard post list shape with pagination.
  Acceptance: integration tests cover match, no-match, pagination, and
  injection-safety (regex escaping); documented in the route file.
  Done: #23.

- [x] **Navbar search UI.** Add a search input to the navbar that hits the
  search endpoint and renders results as a page reusing `PostItem`.
  Acceptance: component tests for input → results → empty state; works
  logged-in and logged-out; keyboard accessible (Enter submits).
  Done: #24.

- [x] **Newest-first sorting and a Solved/Unsolved filter on category pages.**
  Category post lists currently render oldest-first. Default to newest-first
  and add a filter using the existing `isSolved` concept.
  Acceptance: tests for sort order and filter; UI control reflects state.
  Done: #25.

- [x] **Session-aware homepage hero.** Logged-in users still see
  "Join the Community" / Register CTAs. Show "Create Post" and a Dashboard
  link instead when authenticated.
  Acceptance: component tests for both auth states.
  Done: #26.

- [x] **Server survives MongoDB connection blips.** The server exits on any
  mongoose monitor timeout (observed when Docker Desktop restarted), killing
  the API instead of letting the driver reconnect. Remove the fatal handler
  for post-startup connection errors; rely on mongoose auto-reconnect and
  surface state via `/api/health` `dbState`.
  Acceptance: unit test for the health endpoint under disconnected state;
  manual repro note in the PR (stop/start mongo container).
  Done: #27.

- [x] **Fix dead footer social links.** The Twitter/LinkedIn/GitHub links in
  `client/src/components/layout/Footer.js` are `#!` placeholders. Point them
  at real destinations or remove them.
  Acceptance: no `#!` hrefs remain in the footer; test asserts targets.
  Done: #29 (removed the "Connect" section — this project has no real
  Twitter/LinkedIn/GitHub accounts to link to, so a placeholder would be
  as misleading as `#!`).

- [x] **Design doc: migrate client from CRA to Vite.** react-scripts is
  unmaintained; its dev tree carries unfixable advisories (webpack-dev-server
  4.x) and required custom Jest shims for ESM deps (axios, react-router 8).
  This item is the design/plan only: migration steps, test-runner choice
  (Vitest vs keeping Jest), env-var mapping (`REACT_APP_*`), proxy config,
  CI changes. Output: `docs/vite-migration-design.md` reviewed via PR.
  Implementation gets split into follow-up items from that doc.
  Done: #30 (`docs/vite-migration-design.md`). Follow-up implementation
  items were appended to `BACKLOG.md` as Vite migration steps 1–6.

- [x] **`npm run install-all` doesn't install `server/`'s dependencies.**
  `install-all` runs `npm install` (root) then `npm run prepare`
  (`cd client && npm install`), but never installs `server/`'s own
  `package.json` deps (e.g. `connect-mongo`, required directly by
  `dist/server.js`). The documented `ci` script does install them
  (`cd server && npm ci`), so this only bites local/manual setup, but a
  fresh clone following CLAUDE.md's "Running locally" steps with
  `install-all` fails to start the server or run `npm test`.
  Acceptance: `install-all` (or an equivalent documented step) installs
  `server/`'s deps too; a fresh clone can run `npm run server` and
  `npm test` without a manual `cd server && npm install`.
  Done: #31. (Discovered by the agent during the #23 cycle and logged
  rather than fixed inline — the intended discovery workflow.)

- [x] **Root `brace-expansion` override breaks `nodemon` and fails a new
  audit advisory.** Root `package.json`'s `overrides` pins
  `brace-expansion@^5.0.8` globally (added to fix an earlier CVE). npm
  overrides apply everywhere, including under `minimatch@3.1.5` (a
  `nodemon` dependency), which expects the old brace-expansion API
  (`module.exports = function expand(...)`); v5 doesn't export that,
  so `nodemon`'s file watcher throws `TypeError: expand is not a
  function` and kills the dev server the moment it processes a
  filesystem event. Observed in CI (PR #24): the server crashed ~30s
  into the Playwright run and `tests/e2e/login.test.ts` timed out
  waiting on `/api/users/login`. Separately, `cd client && npm audit
  --omit=dev` now flags `brace-expansion` 4.0.0–5.0.8 as high severity
  (GHSA-rgw5-rvv9-x895), a newly-disclosed bypass of the CVE the pin
  was meant to fix — so `^5.0.8` no longer satisfies the security job
  either. Needs a version that satisfies both old- and new-API
  consumers (or scoping the override away from `minimatch`/`nodemon`)
  and re-verification of the client audit.
  Acceptance: `npm run server` survives nodemon restarts/file events
  without crashing; root `npm audit` and `cd client && npm audit
  --omit=dev` both pass in CI; Playwright e2e suite green.
  Done: #28 (also fixed the js-yaml item below in the same PR at the
  user's request; root `npm audit` and client `npm audit --omit=dev`
  both clean now).

- [x] **`js-yaml` 3.x high-severity advisory via `jest` (root `npm audit`
  still red).** Discovered while verifying #28: root's plain `npm audit`
  flags `js-yaml` 3.0.0–3.15.0 as high severity ("Quadratic CPU
  consumption in `!!omap` resolution", GHSA-5p4m-2wfm-xmqj, "CVE-2026-59870
  fix not backported"), resolved via `jest > @jest/core > @jest/reporters
  > @istanbuljs/load-nyc-config > js-yaml@3.15.0`. It's a transitive dev
  dependency of `jest` with no direct top-level requirement to bump, and a
  patched `3.15.1` exists upstream but isn't reachable without an
  override. This is unrelated to brace-expansion/nodemon and wasn't fixed
  in #28 to keep that PR scoped — it still leaves the `security` CI job
  red (`npm audit` at root fails on this finding even with brace-expansion
  fixed, since `bash -e` aborts the step before reaching the client audit
  line).
  Acceptance: root `npm audit` passes in CI without breaking `jest`
  itself; test suite still green.
  Done: #28 (added directly to that PR at the user's request instead of a
  separate PR — `js-yaml` has exactly one consumer in the tree,
  `@istanbuljs/load-nyc-config`, which already declares `^3.13.1`, so
  `js-yaml: "^3.15.1"` needed no nested scoping; root `npm audit` now
  reports 0 vulnerabilities).

## Cycle 2 — Vite migration, live-site bug sweep, accessibility (Aug 2026)

Archived 2026-08-22 when the backlog was re-pointed at the engagement
redesign. Three threads run through this batch: finishing the CRA → Vite
migration (steps 1–6), a sweep of bugs found by reviewing the deployed
site rather than the source, and the accessibility/mobile fixes that came
out of the same reviews.

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

- [x] **Clicking a post from the Dashboard gives a 404 for logged-in
  users.** Done: #57. Audited the full chain: `Dashboard.js` fetches
  `GET /api/users/:userId/posts` (`server/routes/users.js`), passes each
  post straight through to `PostItem`, whose `title` link is
  `` `/posts/${_id}` `` — the same `_id` `PostDetail` reads via
  `useParams()` and fetches with `GET /api/posts/:id`
  (`server/controllers/posts.js`). No `slug`/`_id` mismatch or other
  field misuse found anywhere in that path (also checked
  `AdminDashboard.js`/`ModeratorDashboard.js` and the Dashboard's
  "recent comments" `comment.post` links — all consistent). Added
  `client/src/pages/__tests__/DashboardPostLink.test.js`, a
  render-Dashboard-inside-real-`<Routes>`-and-click integration test
  matching this item's acceptance criteria exactly (login, load
  Dashboard, click the first post link, assert the H1 on the post detail
  page matches the post title, no "Post not found" alert); it passes
  against current `main` with no code change needed, so the reported
  flow does not reproduce with well-formed data. Could not additionally
  verify a real server round-trip (`GET /api/users/:id/posts` →
  `GET /api/posts/:id`) in this sandbox: `mongodb-memory-server` can't
  download its binary here (no egress to `fastdl.mongodb.org`). If this
  is still observed on the live site, it's likely a demo-data race (a
  post deleted between page load and click) rather than a code defect —
  next time it's seen, capture the exact post `_id`/URL that 404s for a
  targeted repro.

- [x] **`Navbar.css` is never imported — the mobile touch-target fix for
  the navbar search box shipped dead and never reached production.** Done:
  this PR. Added `import './Navbar.css';` to
  `client/src/components/layout/Navbar.js`. Verified the actual production
  bug is fixed, not just the source: `npm run build` (Vite) now emits
  `navbar-search` rules into the compiled CSS bundle (`grep -c
  navbar-search build/assets/*.css` → 1; it was 0 before this change).
  Root cause was as originally diagnosed: the file existed and had correct
  rules, but nothing imported it, so bundlers correctly tree-shook it out.
  Tests, in line with this item's acceptance criteria that a test render
  `<Navbar />` rather than only read CSS source as text: new
  `client/src/components/__tests__/NavbarStylesheet.test.js` (written
  test-first — confirmed both failing before the import was added) mocks
  `../layout/Navbar.css` to record when it's actually imported (rather than
  merely present on disk) and renders `<Navbar />` to prove the import
  fires, plus injects the real CSS source as a `<style>` tag and asserts an
  unconditional rule (not gated behind `@media`) is applied via
  `getComputedStyle()` in a real DOM. Note: jsdom in this repo's Jest setup
  has no `window.matchMedia` and does not evaluate `@media` conditions in
  `getComputedStyle()` (confirmed empirically — a minimal repro rule inside
  `@media (max-width: 768px)` never applied, with or without setting
  `window.innerWidth`), so the mobile-only 44px rules themselves still rely
  on `mobileTouchTargets.test.js`'s raw-CSS-source assertions for their
  pixel values — this is a hard jsdom limitation, not something this PR
  chose to skip. To close that gap per the acceptance criteria ("corrected
  so it can no longer pass against CSS that isn't actually loaded"),
  `mobileTouchTargets.test.js` gained a new assertion (also written
  test-first) that `Navbar.js`'s source actually contains
  `import './Navbar.css'`, so the file's existing 44px assertions can no
  longer pass silently against an orphaned stylesheet. Full client Jest
  suite: 30 suites, 102 tests, all passing (up from 29/99 — the 3 new
  tests: 2 in `NavbarStylesheet.test.js`, 1 in
  `mobileTouchTargets.test.js`). `npm run lint`: same 4 pre-existing errors
  / 7 pre-existing warnings baseline, unaffected. `npm audit --omit=dev`:
  0 vulnerabilities (unaffected, no new dependency).

- [x] **Post upvote/downvote buttons have no CSS at all — a 14×19px touch
  target on every post detail page, desktop and mobile alike.** Done: this
  PR. Added `.vote-btn` (`min-width`/`min-height: 44px`, flex-centered
  icon) and a `.vote-buttons` flex container to `client/src/App.css`,
  applied unconditionally (not mobile-gated) since the bug was confirmed
  at both a 1280px and a 375px viewport — matching the existing
  `.pagination button` styling (background, border-radius, hover/disabled
  states) for visual consistency, plus an `.active` state for the
  already-voted case neither of which previously had any styling at all.
  No missing-import bug here (unlike the `Navbar.css` item): `App.css` is
  already globally imported via `client/src/App.js`, so the only gap was
  the missing rule itself.
  Test: extended `client/src/pages/__tests__/PostDetail.test.js` with a
  "PostDetail vote button touch targets" describe block, written
  test-first (confirmed failing — `NaN >= 44` — against the unmodified
  CSS). Following the `Navbar.css` item's lesson, it renders the real
  `PostDetail` component and injects the actual `App.css` source as a
  `<style>` tag so `getComputedStyle()` reflects real rule matching
  (not the CSS-module stub Jest normally substitutes), then asserts both
  vote buttons' computed `min-height`/`min-width` are `>= 44px` — a
  render-based check rather than only parsing CSS source text. Queried
  via `screen.getAllByRole('button')` filtered by class name rather than
  `container.querySelector`, since the latter trips this repo's
  `testing-library/no-node-access`/`no-container` lint rules (caught by
  running `npm run lint` after the first draft).
  Full client Jest suite: 30 suites, 103 tests, all passing (up from 102
  — the 1 new test). `npm run lint`: same 4 pre-existing errors / 7
  pre-existing warnings baseline, unaffected. `vite build` re-verified
  clean.

- [x] **Every page skips from `<h1>` straight to `<h3>` — the footer's
  three headings have no `<h2>` anywhere above them.** Done: this PR.
  Chose the "non-heading element" branch of this item's acceptance
  criteria rather than inserting an `<h2>`: the footer's three section
  titles ("AI/ML Career Forum", "Quick Links", "Career Resources") aren't
  part of any single page's content outline (the footer is a
  sitewide/global region, not page-specific content), and page heading
  structures vary too much (some pages have their own `<h2>`s already,
  e.g. `Home`/`Dashboard`; some have none at all, e.g. `Login`/`Register`)
  for one shared `<h2>` insertion point to make sense everywhere. Changed
  `client/src/components/layout/Footer.js`'s three
  `<h3 className="footer-heading">` elements to
  `<p className="footer-heading">`, keeping the class so `.footer-heading`
  styling in `client/src/App.css` (font-size/weight/color — a plain
  class-based rule, not tag-scoped) is unaffected.
  Tests: new `client/src/components/__tests__/FooterHeadingLevel.test.js`,
  written test-first (confirmed failing against the unmodified `<h3>`s —
  3 headings found where 0 were expected, and a 2-level jump from `h1` to
  `h3` on a real page). Asserts `<Footer>` alone renders zero elements
  with `role="heading"`, that the three section titles still render with
  the `.footer-heading` class, and — rendering `Login` + `Footer` together
  behind real `AuthProvider`/`AlertProvider`s, mirroring the pattern in
  `Login.test.js` — that the full page's heading level sequence never
  jumps by more than 1. Full client Jest suite: 31 suites, 106 tests, all
  passing (up from 30/103 — the 3 new tests). `npm run lint`: same 4
  pre-existing errors / 7 pre-existing warnings baseline, unaffected.
  `vite build` re-verified clean.

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

## Dropped 2026-08-22 — superseded by the engagement redesign

Not completed. This was an open UX item that the redesign's own work will
rewrite the same code for, so implementing it first would be work thrown
away. Recorded here so the underlying defect is not lost.

(A second item was listed here originally — the `.post-meta` mobile overflow.
It turned out not to be superseded at all: `main` shipped the fix in #53 while
this queue was being written, so it has moved to the completed section below.)

- **`client/src/App.css` has a duplicate `@media (max-width: 768px)` block.**
  Real but cosmetic: `.mobile-menu-toggle`, `.navbar-nav`, `.navbar-nav.show`
  and `.nav-item` are each declared in two mobile media blocks, with matching
  or non-conflicting properties, so the cascade result is unchanged today.
  Dropped rather than folded in: the redesign's feed, thread and mobile items
  rewrite these navbar and responsive rules directly, and de-duplicating them
  first would only create merge conflicts against that work. If the duplication
  survives the redesign, re-file it then.

## Cycle 3 — shipped on main alongside the redesign queue (Aug 2026)

Completed on `main` after the redesign queue was written, and merged into the
redesign branch. Archived here rather than left ticked in `BACKLOG.md`, per the
rule that the working file holds only open items.

- [x] **Post detail pages overflow horizontally on mobile — `.post-meta`
  never wraps.** Done: this PR. Added `flex-wrap: wrap;` to `.post-meta`
  in `client/src/App.css` (unscoped, not mobile-only — the rule has no
  desktop-specific layout to preserve, and wrapping is a no-op on wide
  viewports where the row already fits on one line).
  Verified with a real browser wasn't possible in this environment (ground
  rules: no Playwright, no live app). Used the raw-CSS-source-assertion
  pattern already established in `mobileTouchTargets.test.js`: new
  `client/src/__tests__/postMetaOverflow.test.js` parses `App.css` and
  asserts `.post-meta` declares `flex-wrap: wrap` — written test-first,
  confirmed failing against the unmodified CSS before the change. Full
  client Jest suite: 30 suites, 100 tests, all passing (up from 29/99 —
  the 1 new test). `npm run lint`: same 4 pre-existing errors / 7
  pre-existing warnings baseline, unaffected. `vite build` re-verified
  clean.

## Cycle 4 — the engagement redesign, shipped (Aug–Sep 2026)

Archived 2026-09-01. The whole 13-item redesign queue (#60–#72), plus the
live-site defects the shipped UI exposed once real data ran through it
(#73–#91) — counter drift, tag pollution, mobile overflow, touch targets,
heading structure and landmarks — and the saved-posts pair (#76, #77).

Two recurring notes worth keeping: several items could not run the server
suite in-sandbox because `mongodb-memory-server` cannot download its binary
(egress policy blocks `fastdl.mongodb.org`), and more than one bug here traces
to `scripts/seed-mongo.js` writing posts through the raw driver, bypassing the
Post model and its schema defaults.

- [x] **Denormalise `commentCount` and `score` onto `Post`.** Done: #60.
  The feed's
  Unanswered tab and the "needs an answer" card state both need "posts with no
  comments" as a *query filter*, and the Top tab needs a real ranking. Neither
  is expressible today: `Post.comments` is a reverse-populate virtual
  (`server/models/Post.js`) and `voteCount` is a getter virtual, and
  `advancedResults` builds a plain `Model.find()` that cannot filter or sort on
  either. Worse, the existing `sort=-upvotes` used by `client/src/pages/Home.js`
  is silently meaningless — MongoDB sorts an array field by its extreme element,
  not its length, so the current "most upvoted" experiment variant does not
  rank by votes at all. Add `commentCount` and `score` (`upvotes.length -
  downvotes.length`) as real indexed Number fields, maintained in
  `server/controllers/comments.js` (`addComment`, `addReply`, `deleteComment`)
  and `server/controllers/posts.js` (`upvotePost`, `downvotePost`). Add a
  backfill script following the established one-off pattern of
  `scripts/cleanup-post-tags.js` (dry run by default, `--apply` to persist,
  documented, never auto-run).
  Acceptance: integration tests prove each counter moves on comment add /
  reply add / comment delete / upvote / downvote / vote retraction, and that
  the values survive a post fetch; a test runs the backfill against seeded
  data and asserts it reconciles deliberately-wrong counters; both fields are
  indexed; existing server suite green.

- [x] **Feed query parameters on `GET /api/posts`.** Done: #61. Backs the three feed tabs
  with one endpoint, on top of the counters from the item above. Add
  `?feed=recent` (default, newest first), `?feed=unanswered`
  (`commentCount: 0`, **oldest first** — the oldest unanswered question is the
  one most at risk of never being answered), and `?feed=top&since=7d` (by
  `score` desc, restricted to `createdAt` within the window). Keep the existing
  `sort`/`page`/`limit`/`search` behaviour of `advancedResults` working
  unchanged for every other caller. Return the total unanswered count in the
  response envelope so the UI can badge the tab without a second request.
  Acceptance: integration tests for each `feed` value covering ordering,
  filtering, the `since` window boundary, pagination interaction, and an
  invalid `feed` value falling back to the default rather than erroring;
  existing `/api/posts` consumers (`Home`, `CategoryPosts`, `SearchResults`)
  still pass their current tests untouched.

- [x] **Rebuild `PostItem` as the feed card.** Done: #62. Currently
  `client/src/components/posts/PostItem.js` renders the comment, view and vote
  counts as inert `<div>`s — a member must open a post to vote on it, which is
  the single largest source of friction in the current UI. Rebuild it per the
  `Main.dc.html` artboard: a vote column on the left wired to the existing
  `PUT /api/posts/:id/upvote` / `downvote`, the title, an author row carrying
  the `aiMlLevel` badge (a field the app stores and has never displayed), the
  excerpt, tag chips, and a right-aligned action row. A post with
  `commentCount: 0` gets the amber left border and "Needs an answer" badge.
  Note the active vote state must be visible: `.vote-btn.active` in
  `client/src/App.css` is currently `rgba(255, 255, 255, 0.2)` over a white
  card, i.e. invisible — use a tint of the brand purple as the artboard does.
  Acceptance: component tests for vote → optimistic count change → server
  call, vote retraction, the unauthenticated case (controls disabled, not
  hidden), the solved / needs-an-answer / neutral states, and 44px targets;
  `Home`, `CategoryPosts` and `SearchResults` still render it correctly.

- [x] **Replace the Home marketing page with the feed.** Done: #63.
  `client/src/pages/Home.js`
  shows every signed-in member the "Welcome to the AI/ML Career Transition
  Forum" hero and the "Why Join Our Community?" feature cards before five
  hard-coded posts (`limit=5`) — a brochure served to people who have already
  converted. Per `Main.dc.html`: authenticated members get the feed directly,
  with a tab row (For you / Unanswered / Top this week) driving the `feed`
  parameter from item 2 and the tab counts from its envelope; anonymous
  visitors get a two-line value bar above **the same live feed** rather than a
  full-page brochure. Keep the left rail (categories, unanswered count) and the
  right rail scoped to this item; the "You can answer these" rail is item 12.
  Retire the `default_sort_order` Statsig experiment wiring in this file — its
  `-upvotes` variant never sorted by votes (see item 1) so its results are not
  meaningful.
  Acceptance: tests for both auth states, tab switching issuing the right
  request, tab counts rendering from the envelope, empty-feed and
  failed-fetch states; the `trending_posts_section` feature flag still gates
  `TrendingPosts`; no `setAlert` identity churn in effect deps (see the
  `AlertContext` note in `CLAUDE.md`).

- [x] **Answer from the feed, without a page change.** Done: #64. The lurker-to-contributor
  step. Per `Main.dc.html`, the feed card's Answer button expands an inline
  composer that posts to the existing `POST /api/posts/:id/comments`; on
  success the new answer appears and the card leaves its "needs an answer"
  state without a reload. Questions (`commentCount: 0`) get a filled "Answer"
  button and "Post answer"; posts that already have discussion get an outline
  "Reply" and "Post reply".
  Acceptance: component tests for open → type → submit → card state change,
  cancel discarding the draft, submit failure leaving the draft intact and
  surfacing an alert, unauthenticated users seeing a sign-in prompt instead of
  the composer, and only one composer open at a time.

- [x] **Accepted answers on the thread.** Done: #65. The mechanic that makes answering
  worth doing, and it is almost entirely built already: `Comment.isAnswer`
  exists in the schema, and `PUT /api/comments/:id/answer`
  (`markAsAnswer` in `server/controllers/comments.js`) already authorises to
  the post author / moderator / admin, toggles the flag, and sets
  `post.isSolved`. There is no UI for any of it — `client/src/pages/PostDetail.js`
  only ever *displays* an "Answer" badge it gives no one a way to set. Per
  `PostThread.dc.html`: an "Accept this answer" control visible to the asker
  (and moderators), the accepted answer's green left border and "Accepted by
  {asker}" line, and the question's status badge flipping from "Needs an
  answer" to "Solved".
  Acceptance: tests for the asker seeing and using the control, a non-asker
  not seeing it, accepting flipping both the answer card and the question
  badge, un-accepting reverting them, and moderators retaining access; server
  behaviour unchanged (no controller edits expected — if one proves necessary,
  cover it with an integration test).

- [x] **Threaded replies on the thread.** Done: #66. `Comment.parentComment`,
  `GET /api/comments/:id/replies` and `POST /api/comments/:id/replies` all
  exist and are unused by the client — `PostDetail` renders one flat list, and
  `client/src/App.css` even carries an unused `.comment-replies` rule with a
  3rem indent. Wire one level of nesting per `PostThread.dc.html`: a Reply
  control on each answer, replies rendered indented under their parent, and the
  asker's own replies marked with an "Asker" chip. One level only — deeper
  nesting is out of scope for this item.
  Acceptance: tests for loading existing replies, posting a reply appearing
  under the right parent, the locked-thread case (the server already rejects
  replies on a locked post — the UI must not offer the control), the "Asker"
  chip, and reply targets at 44px.

- [x] **Answer voting and "Most helpful" ordering.** Done: #67. `PUT /api/comments/:id/upvote`
  and `/downvote` exist and are unused. Add the per-answer vote control from
  `PostThread.dc.html` and the Most helpful / Newest sort toggle above the
  answer list, with the accepted answer pinned first under both orderings.
  Acceptance: tests for voting, retraction, the unauthenticated disabled
  state, both sort orders, and the accepted answer staying pinned; sorting is
  client-side over the already-fetched list unless the thread paginates.

- [x] **Thread subscriptions (server).** Done: #68. Added `Subscription`
  (`user` + `post` + `createdAt`, unique compound index) and `Notification`
  (`user`, `post`, `comment`, `actor`, `type: 'answer'|'reply'`, `read`)
  models, plus `server/utils/subscriptions.js` with two idempotent helpers —
  `subscribeUserToPost` (upsert) and `notifySubscribers` (writes one
  `Notification` per subscriber excluding the acting user). Wired
  auto-subscribe into `createPost` (author) and `addComment`/`addReply`
  (commenter/replier), and `notifySubscribers` into the same two comment
  paths so every other subscriber to a post gets notified on a new
  answer/reply, never the actor themselves. New endpoints:
  `POST`/`DELETE`/`GET /api/posts/:id/subscribe` (subscribe, unsubscribe,
  status — all idempotent), `GET /api/subscriptions` (list mine), and
  `GET /api/notifications`, `GET /api/notifications/unread/count`,
  `PUT /api/notifications/read-all`, all `protect`-scoped to `req.user.id`
  so a member only ever sees their own. No email/push — in-app only, as
  scoped.
  Acceptance: new `server/__tests__/integration/subscriptions.test.js`
  covers subscribe/unsubscribe idempotency, auto-subscribe on authoring and
  on commenting/replying, no self-notification, notifications fanning out to
  every other subscriber (both `answer` and `reply` types), unread count,
  mark-read, and per-user authorisation on both subscriptions and
  notifications listings.
  Caveat: could not run the server suite in this environment —
  `mongodb-memory-server`'s binary download is blocked by this sandbox's
  egress policy (`fastdl.mongodb.org` → 403), which fails every existing
  integration suite identically (verified against `comments.test.js`
  unmodified), not something introduced by this change. Verified instead by
  booting the compiled app in-process (`NODE_ENV=test`) and confirming it
  loads without error with both new routers mounted at their expected paths.

- [x] **Notify-me control and a member notification bell (client).** Done: #69.
  Wires item 9 into the UI: a "Notify me of answers" / "Notified" toggle on
  `PostDetail` (`GET`/`POST`/`DELETE /api/posts/:id/subscribe`), and a new
  `NotificationBell` component in the navbar for every authenticated member,
  entirely separate from the existing moderator reports badge/dropdown
  (`hasPermission(user, 'viewReports')`) - the two counts are never merged.
  The bell polls `GET /api/notifications/unread/count` every 60s (cleared on
  unmount), and opening its dropdown fetches `GET /api/notifications` and
  calls `PUT /api/notifications/read-all` to mark them read.
  Acceptance: tests for toggling subscription (both directions, and hidden
  for signed-out visitors), the bell's badge reflecting the unread count,
  moderators still seeing the reports count unaffected, the dropdown listing
  notifications and marking them read on open, an empty state, the polling
  interval not firing after unmount, and 44px targets on the bell button,
  dropdown items and the subscribe toggle.

- [x] **Ask for a member's track at signup, not on a profile page nobody
  visits.** Done: #70. Added a
  `/onboarding` step (`client/src/pages/Onboarding.js`), per
  `Onboarding.dc.html`: role and skill chips, a "Nothing yet" option
  mutually exclusive with any real skill pick, a feed preview that updates
  with the selected role, and a one-click skip. Both paths PUT through the
  existing `/api/users/updatedetails` and set the new `User.onboardingCompleted`
  field so the step never reappears once completed or skipped (it defaults
  `true`, so existing accounts are unaffected; only a fresh local
  registration or Google-OAuth signup starts `false`). Registering (and
  Google OAuth signup) now routes into `/onboarding` instead of straight to
  `/dashboard`. Also dropped `currentRole`/`targetRole`/`aiMlExperience`
  from the register form itself - `registerUser` never read them from
  `req.body`, so they were silently discarded on every signup and
  duplicated (uselessly) what onboarding now asks.
  Acceptance: covered by `client/src/pages/__tests__/Onboarding.test.js`
  (chip selection incl. role swap and multi-skill, "Nothing yet"
  mutual-exclusivity both directions, preview placeholder/update/swap,
  skip persisting only `onboardingCompleted`, submit persisting the picked
  role/skills, and no re-show once `onboardingCompleted` is already true),
  `OnboardingTouchTargets.test.js` (44px chips/submit/skip), and new server
  tests in `auth.test.js` (fresh registration starts `onboardingCompleted:
  false`; `updatedetails` persists it plus `targetRole`/`skills`) and
  `User.test.js` (schema default `true`).
  Caveat: could not run the server suite in this environment -
  `mongodb-memory-server`'s binary download is blocked by this sandbox's
  egress policy (`fastdl.mongodb.org` → 403), which fails every existing
  integration suite identically (verified against `comments.test.js`
  unmodified), not something introduced by this change. Verified instead
  by loading the edited modules directly (`models/User.js`,
  `controllers/users.js`, `config/passport.js`) and booting the compiled
  app in-process, both without error. Client suite ran clean: 38 suites,
  182 tests.

- [x] **The "Unanswered" feed tab returns zero posts in production, and
  every post — answered or not — shows the "Needs an answer" badge.**
  Done: #79. Root cause confirmed as two separate bugs, both traced to
  `scripts/seed-mongo.js`/`scripts/generate-seed.js` writing posts via the
  raw MongoDB driver (`db.posts.insertMany`), bypassing the Post model
  entirely — those documents never get `commentCount`'s schema default
  applied, so the field is simply *absent*, not `0`:
  1. `Model.find({ commentCount: 0 })`/`countDocuments({ commentCount: 0 })`
     is a raw match that only finds an explicit `0` and silently skips a
     document where the field is missing, which is why `feed=unanswered`
     and `unansweredCount` returned nothing against live data.
  2. `client/src/components/posts/PostItem.js` computed its badge/count
     from `post.commentCount` whenever it was a number — which it always
     is, because Mongoose applies the schema default on *read* even for a
     genuinely-missing field — so it never fell back to the real,
     already-populated `comments` array, even though every endpoint that
     renders `PostItem` populates `comments` for exactly this purpose.
  Fixed by resolving "no comments yet" against the `Comment` collection
  directly (`server/utils/postCounters.js`'s `findUnansweredPostIds`, an
  aggregation with a `$lookup`), used by `feed=unanswered`, the envelope's
  `unansweredCount`, and `getRecommendedUnanswered` — robust regardless of
  whether `commentCount` is missing, stale, or simply wrong, not just
  robust to the missing-field case. `getPost` now also self-heals a
  drifted `commentCount`/`score` against the data it already loaded on
  every single-post fetch, so a visited thread's counters converge without
  a human running `scripts/backfill-post-counters.js`. `PostItem` now
  prefers the real `comments` array over `commentCount` when populated,
  fixing the "Needs an answer" mismatch outright.
  Acceptance: `server/__tests__/integration/post-feed.test.js` reproduces
  `feed=unanswered` wrongly returning nothing against a fixture inserted
  the same way as `scripts/seed-mongo.js` (raw `Post.collection.insertOne`,
  not `Post.create`), then asserts the fix includes it — and, separately,
  that a raw-inserted or stale-but-genuinely-answered post is correctly
  *excluded*, which a simpler "treat missing as 0" filter would have
  gotten wrong; `server/__tests__/integration/post-operations.test.js`
  covers the `getPost` self-heal (missing field, drifted counters, and an
  already-correct post left untouched); `PostItem.test.js` covers the
  client precedence fix, including the optimistic post-answer update
  keeping `comments`/`commentCount` in sync. Two pre-existing fixtures
  (`server/__tests__/integration/post-feed.test.js`'s original
  `feed=unanswered` block and `forYouRanking.test.js`'s recommended-posts
  block) set `commentCount` to a non-zero value without ever creating a
  matching `Comment` document — a shorthand valid under the old
  trust-the-field behaviour but not the new source-of-truth check — so
  those two fixtures got a real `Comment.create` added; their assertions
  are unchanged.
  Caveat: could not run the server suite in this environment —
  `mongodb-memory-server`'s binary download is blocked by this sandbox's
  egress policy (`fastdl.mongodb.org` → 403), the same limitation noted
  against item 9. Verified instead by full client suite (43 suites/224
  tests green) and `node --check` on every changed/added server file.

- [x] **Mobile horizontal overflow on every page — the navbar search box.**
  Done: #80. Found reviewing the live site at a 375px viewport with Playwright:
  `document.documentElement` has `scrollWidth: 418` against
  `clientWidth: 375` on every page checked (`/`, `/categories`, `/search`,
  `/login`, `/register`, a category page, a post detail page, the 404
  page) — a 43px horizontal scrollbar on first load, no interaction
  needed. The offending element is the same everywhere:
  `.navbar-search` (`client/src/components/layout/Navbar.css:2-6`,
  `display: flex; margin: 0 1rem;`) has no rule at any narrow-viewport
  breakpoint that hides or restacks it — the file's only mobile media
  block (`Navbar.css:130-139`, `@media (max-width: 768px)`) just adds
  `min-height`/`min-width: 44px` to the search input/button for the
  touch-target fix, so the search form stays at its full desktop width
  and gets pushed off the right edge of a 375px screen (measured:
  `.navbar-search` at `left: 173, right: 418`). This is a different bug
  from the mobile overflow items already fixed on `main` (`.post-meta`
  wrapping, #53; the `Navbar.css` import fix; `.post-header`/`.post-footer`
  wrapping, #72) — re-verified `.post-header` specifically while filing
  this: on `/posts/6925386a88cb7b8de046eddf` at 375px it now computes
  `flex-wrap: wrap` and every `.post-meta-item` sits within the viewport
  (max `right: 335.97` against `clientWidth: 375`), so that part is
  already fixed and not re-filed here — the only remaining overflow
  source, on every page, is `.navbar-search`.
  Acceptance: at 375px, `scrollWidth <= clientWidth` (the existing
  `document.documentElement` measurement approach, or the raw-CSS-source
  assertion pattern from `mobileTouchTargets.test.js` if no browser is
  available in the implementing environment) on the home page, a category
  page, and a post detail page; `.navbar-search` either hides, collapses
  into the existing mobile menu, or restacks below the brand row at
  narrow widths; the existing `postMetaOverflow.test.js` and
  `mobileTouchTargets.test.js` assertions keep passing against whatever
  CSS replaces the rule.

- [x] **A third of live posts show a body that answers a different question
  than their own title — visible on the home feed, not just the thread.**
  Done: #82. Audited `server/seeder.js`, `scripts/generate-seed.js`, and
  `scripts/seed-mongo.js` the same way #33 audited them for tags: all three
  already pair `title`/`content` correctly, so no code change was needed
  there — matching #33's pattern, the mismatched live rows predate these
  scripts and were seeded some other way. Added the server-side invariant
  instead: a `Post.content` schema validator (`server/utils/titleContentMismatch.js`'s
  `isTitleContentMismatch`) now rejects a `content` whose leading `Title:`
  line names a different subject than the post's own `title`, going forward.
  Note this only covers writes that go through the Mongoose model — item 79
  found `scripts/seed-mongo.js` writes via the raw driver
  (`db.posts.insertMany`), which bypasses Mongoose validation entirely, so a
  future raw-driver seed script could still reintroduce the shuffle; that's
  an existing, accepted gap shared with the tags/counters validators, not
  something this item widens.
  For the 10 already-mismatched live rows: unlike tag pollution, there is no
  mechanical fix — a polluted tag can be dropped by a length rule, but a
  mismatched post's correct content isn't derivable from its title (it's
  presumably paired with some *other* post's title elsewhere in the data, or
  missing entirely). Decision: this needs a human data fix, not a
  `--apply`-style cleanup script. Added `scripts/audit-post-title-mismatch.js`,
  a read-only one-off (no `--apply` mode, matching the "cannot itself touch
  the live database" constraint) that reports mismatched posts for a human
  to review and re-pair or delete by hand.
  Acceptance: `server/__tests__/utils/titleContentMismatch.test.js` covers
  the util directly; `server/__tests__/models/Post.test.js` covers the
  schema validator rejecting a mismatched `Title:` line, accepting a
  matching one, and accepting content with no `Title:` line at all;
  `server/__tests__/tooling/auditPostTitleMismatch.test.js` covers the audit
  script reporting a mismatched row, leaving it unwritten, and leaving a
  correctly-paired post unreported.
  Caveat: could not run the server suite in this environment —
  `mongodb-memory-server`'s binary download is blocked by this sandbox's
  egress policy (`fastdl.mongodb.org` → 403), the same limitation noted
  against items 9 and 15. Verified the validator directly instead, via a
  standalone script constructing `Post` documents and calling `.validate()`
  (no DB connection required for schema-level custom validators): confirmed
  it rejects a mismatched `Title:` line, accepts a matching one, and accepts
  content with no `Title:` line.

- [x] **The home feed has no `<h1>` anywhere on the page, and its one
  heading jumps from nothing straight to `<h3>`.** Done: see PR for this
  item. Added a visually-hidden `<h1>Home</h1>` at the top of `Home.js`
  (rendered before the value bar in the anonymous state and before the feed
  tabs in the authenticated state, so it is always the first heading in both
  cases), plus a new `.visually-hidden` clip-technique utility class in
  `client/src/index.css` for it. That alone would still leave a level-2 skip
  from `h1` straight to the `<h3>` post-card titles, so also added a
  visually-hidden `<h2>Feed</h2>` immediately before the feed tabs to bridge
  it — the full sequence is now `h1, h2 (Feed), h3 × N (post titles), h2
  (Popular Categories)`, which never increases by more than one level.
  Acceptance covered by new `client/src/pages/__tests__/HomeHeadingLevel.test.js`
  (style of `FooterHeadingLevel.test.js`), for both the anonymous and
  authenticated states; existing `Home.test.js` assertions unaffected; full
  client suite green (45 suites, 228 tests).
  Original finding, reviewing the live
  site with Playwright: on `https://cerulean-marshmallow-003d16.netlify.app/`
  (both signed-out and signed-in), `document.querySelectorAll('h1')` returns
  zero matches, and the page's only headings are five-plus `<h3>` feed-card
  titles (`.post-title` in `client/src/components/posts/PostItem.js:192`)
  followed by an `<h2>Popular Categories</h2>` (`client/src/pages/Home.js:160`)
  — so the sequence is `h3, h3, h3, h3, h3, h2`: no `h1`, and a heading level
  that goes *up* after a run of `h3`s instead of the page ever establishing
  a top-level heading first. Every other page checked (`/categories`,
  `/search`, `/login`, `/register`, a category page, a post detail page, the
  404 page) has exactly one `h1` as its first heading, matching the pattern
  the earlier footer-heading fix assumed held everywhere
  (`docs/BACKLOG-ARCHIVE.md`, "Every page skips from `<h1>` straight to
  `<h3>`" item, whose own regression test only covers `Login` + `Footer`
  together) — Home is the one page that no longer has an `h1` at all, most
  likely lost when the marketing hero (which presumably carried one) was
  replaced by the feed (item "Replace the Home marketing page with the
  feed", done #63). This affects screen-reader users navigating by heading
  (no page landmark heading to jump to) and is a plain heading-order
  violation (WCAG 2.4.6 / 1.3.1) on the single highest-traffic page in the
  app.
  Acceptance: `Home.js` renders exactly one `h1` before any `h3`/`h2` content
  for both the authenticated-feed and anonymous-value-bar states; a
  regression test in the style of `client/src/components/__tests__/FooterHeadingLevel.test.js`
  renders `Home` and asserts the full heading sequence never skips a level
  and starts with `h1`; existing `Home.test.js` assertions unaffected.

- [x] **Login, Register and the footer ship interactive controls well
  below the 44px minimum the rest of the app now enforces.** Done: see PR
  for this item. Added a mobile-scoped (`@media (max-width: 768px)`)
  `min-height: 44px` to `.btn` and `.form-control` in `client/src/index.css`
  (covering the Login/Register submit buttons and every form input built
  on those two classes), and to `.footer-link a` in `client/src/App.css`
  (which, being a bare inline anchor, also needed `display: flex` +
  `align-items: center` for `min-height` to take effect — the same
  treatment `.categories-sidebar .category-item a` already got). No
  desktop layout change.
  Acceptance covered by new assertions in
  `client/src/__tests__/mobileTouchTargets.test.js` (raw-CSS-source checks
  that `.btn`, `.form-control` and `.footer-link a` each declare
  `min-height >= 44px` within a mobile media block, and that `.footer-link
  a` declares a `display` that lets it apply) and a new
  `client/src/pages/__tests__/LoginRegisterTouchTargets.test.js`
  (render-based: injects the actual mobile-block declarations for `.btn`/
  `.form-control` pulled from source, in the style of the archived
  `PostDetail` vote-button test, and asserts computed `min-height >= 44px`
  on the Login/Register submit buttons and every input). Deviation from
  that archived pattern's literal "inject the real CSS as-is": jsdom does
  not evaluate `@media` conditions when computing style (verified directly
  — a scoped rule never wins over an unscoped one for the same selector,
  regardless of `window.innerWidth`), so the real stylesheet's `@media`
  wrapper had to be stripped for the render check to exercise the actual
  declared values; the source-based assertions in `mobileTouchTargets.test.js`
  still guard that the rule is genuinely mobile-scoped. Full client suite
  green (46 suites, 233 tests); `npm run lint` shows only pre-existing
  warnings/errors in files this PR does not touch.
  Not in scope for this item (left as-is, matching the item's own carve-out):
  the post-detail author/category/`.comment-username` links.

- [x] **An unknown or deleted category id renders a raw "Error fetching
  category data" alert instead of a clean not-found page.** Done: #85.
  `CategoryPosts.js`'s fetch `catch` now checks `err.response?.status`: a
  404 sets a `notFound` flag instead of firing the alert, which renders an
  inline not-found state (`<h1>Category Not Found</h1>`, explanatory copy,
  a link back to `/categories`) and drives `useDocumentTitle` to "Category
  Not Found" rather than leaving it at the bare site name; any other
  failure (500, network error) is unchanged — same danger alert, same
  "Category not found" text. Client-only, `CategoryPosts.js` alone.
  Acceptance covered by new tests in
  `client/src/pages/__tests__/CategoryPosts.test.js`'s `CategoryPosts 404
  handling` block (404 renders the heading with no alert and a non-default
  title; a non-404 failure still surfaces the alert); full client suite
  green (46 suites, 235 tests); no new lint issues.
  Original finding, reviewing the live site:
  `https://cerulean-marshmallow-003d16.netlify.app/categories/000000000000000000000000`
  (a well-formed but non-existent ObjectId — the shape a stale bookmark or
  a since-deleted category produces) shows a red error toast reading
  "Error fetching category data" stacked above a persistent red
  "Category not found" bar, with no `<h1>` and `document.title` left at the
  bare "AI/ML Career Forum" (contrast `/a-route-that-does-not-exist`,
  which renders the proper `NotFound` page titled "Page Not Found | AI/ML
  Career Forum"). The API is correct — `GET
  https://aiml-forum.onrender.com/api/categories/000000000000000000000000`
  returns 404 — so this is purely `client/src/pages/CategoryPosts.js`'s
  single `catch` (`CategoryPosts.js:51-56`) firing
  `setAlert('Error fetching category data', 'danger')` unconditionally and
  not distinguishing a 404 ("this category does not exist") from a real
  transport failure, then falling through to the `!category` branch
  (`CategoryPosts.js:82-88`) which has no heading and leaves
  `useDocumentTitle(category?.name)` with nothing to set. No console
  error, no crash — just an ugly dead end with a developer-sounding
  message.
  Scope: `CategoryPosts.js`, client-only. On a 404 from the category (or
  its posts) fetch, render the app's existing not-found treatment (reuse
  `NotFound`, or an inline empty state with a real heading) and set a
  sensible `useDocumentTitle`; reserve the red `setAlert` for genuine
  non-404 failures.
  Acceptance: a test renders `CategoryPosts` with the category fetch
  mocked to 404 and asserts no `alert`-role error is shown, a not-found
  message with a heading renders, and `document.title` is not the bare
  site name; a second test with a 500/network failure still surfaces the
  danger alert; existing `CategoryPosts.test.js` assertions unaffected.

- [x] **The category-page "Filter" `<select>` and its `.btn-sm` siblings
  are interactive controls well below the 44px minimum the rest of the
  app now enforces.** Done: see PR for this item.
  Investigation found the `.btn-sm` half of this item was already fixed as
  a side effect of the immediately-preceding item (#84): every `.btn-sm`
  control on this page (`create-post`/`login` prompt, pagination, the
  "All Categories" back link) also carries the base `.btn` class, and #84
  added a mobile-scoped `min-height: 44px` to `.btn` itself in
  `index.css`, so those links already compute to >= 44px today — confirmed
  with a render-based test rather than assumed. The `<select
  id="post-filter">` had no such rule (it carries no `.btn` class), so it
  remained the one real gap: added `#post-filter { min-height: 44px;
  padding: 0 0.75rem; }` to the existing mobile touch-target block in
  `client/src/App.css`, next to `.footer-link a`. No desktop layout
  change.
  Acceptance: `mobileTouchTargets.test.js` gained a raw-CSS-source
  assertion that `#post-filter` declares `min-height >= 44px` within the
  mobile media block; new
  `client/src/pages/__tests__/CategoryPostsTouchTargets.test.js` renders
  `CategoryPosts` with the real mobile CSS declarations injected (the
  `LoginRegisterTouchTargets.test.js` pattern, since jsdom doesn't
  evaluate `@media` conditions) and asserts computed `min-height >= 44px`
  on the filter select and on the empty-state/back-link `.btn-sm`
  controls; existing `CategoryPosts.test.js` and `mobileTouchTargets.test.js`
  assertions unchanged. Full client suite green: 47 suites, 238 tests.

- [x] **`/posts/<id>` for a deleted or never-existent post id shows a raw
  "Error fetching post data" alert over a bare "Post not found", with no
  heading, the wrong `document.title`, and a console error — the same dead
  end the unknown-category item above describes, on the higher-traffic post
  route.** Done: see PR for this item.
  `PostDetail.js`'s fetch `catch` now checks `err.response?.status`: a 404
  sets a `notFound` flag instead of firing the alert, which renders an
  inline not-found state (`<h1>Post Not Found</h1>`, explanatory copy, a
  link back to `/`) and drives `useDocumentTitle` to "Post Not Found"
  rather than leaving it at the bare site name; any other failure (500,
  network error) is unchanged — same danger alert, same "Post not found"
  text. Client-only, `PostDetail.js` alone, mirroring the `CategoryPosts.js`
  fix from the item above (#85).
  Acceptance covered by new tests in `client/src/pages/__tests__/PostDetail.test.js`'s
  `PostDetail 404 handling` block (404 renders the heading with no alert
  and a non-default title; a non-404 failure still surfaces the alert);
  full client suite green (47 suites, 240 tests); no new lint issues.
  Original finding, reviewing the live site:
  `https://cerulean-marshmallow-003d16.netlify.app/posts/000000000000000000000000`
  (a well-formed but non-existent ObjectId — what a stale bookmark, a shared
  link to a since-deleted post, or a search hit on removed content produces)
  renders a red "Error fetching post data" toast stacked above a persistent
  "Post not found" line, logs `Failed to load resource: the server responded
  with a status of 404` to the console, renders no `<h1>`, and leaves
  `document.title` at the bare "AI/ML Career Forum". Contrast
  `/a-route-that-does-not-exist`, which renders the proper `NotFound` page
  (`<h1>404</h1>`, title "Page Not Found | AI/ML Career Forum"). The API is
  correct — `GET
  https://aiml-forum.onrender.com/api/posts/000000000000000000000000`
  returns 404 — so this is `client/src/pages/PostDetail.js`'s fetch `catch`
  firing `setAlert('Error fetching post data', 'danger')` unconditionally,
  not distinguishing a 404 from a real transport failure, then falling
  through to a `!post` branch with no heading and a
  `useDocumentTitle(post?.title)` that never receives a value. This is the
  same defect already filed for `CategoryPosts.js` ("An unknown or deleted
  category id renders a raw 'Error fetching category data' alert…") but on
  `PostDetail.js`, which that item's scope ("`CategoryPosts.js`,
  client-only") explicitly excludes — and post links are the primary
  shareable surface of a forum, so a stale post link is the more common dead
  end of the two.
  Scope: `PostDetail.js`, client-only. On a 404 from the post fetch, render
  the app's existing not-found treatment (reuse `NotFound`, or an inline
  empty state with a real heading) and set a sensible `useDocumentTitle`;
  reserve the red `setAlert` for genuine non-404 failures. Keep it
  consistent with whatever the `CategoryPosts.js` item lands.
  Acceptance: a test renders `PostDetail` with the post fetch mocked to 404
  and asserts no `alert`-role error is shown, a not-found message with a
  heading renders, and `document.title` is not the bare site name; a second
  test with a 500/network failure still surfaces the danger alert; existing
  `PostDetail.test.js` assertions unaffected.

- [x] **No page has a `<main>` landmark or a skip link — every keyboard and
  screen-reader user re-traverses the navbar and search box before reaching
  content on every page.** Done: see PR for this item.
  `client/src/App.js` now wraps `<Routes>` in `<main id="main-content"
  tabIndex={-1}>` and renders a `.skip-link` anchor (`href="#main-content"`)
  as the very first element in the tree, before `AnnouncementBanner` and
  `Navbar` — so it is the first Tab stop on every page. `tabIndex={-1}` lets
  the browser's default fragment-navigation focus the region when the link
  is activated, without pulling `<main>` itself into the normal tab order.
  Styled in `client/src/App.css` with the standard clip-off-screen-until-
  focus technique (`top: -60px` at rest, `top: 0` on `:focus`) using the
  existing `--primary-color` token, and a 44px `min-height` so the focused
  state itself meets the touch-target minimum. No visual change at rest;
  every page already had its own inner `.main-content` div for
  padding/spacing, unaffected by the new landmark wrapping it.
  Acceptance: new `client/src/__tests__/App.test.js` — `main landmark`
  covers exactly one `role="main"` element wrapping the routed content on
  both `/login` and `/register`; `skip link` covers the link being the
  first of `screen.getAllByRole('link')` and its `href` targeting the
  rendered `<main>`'s `id`. Verified the tests fail against the pre-fix
  `App.js` (`role="main"` never found) before implementing, then pass
  after. Full client suite green (48 suites, 243 tests, up from 47/240);
  `npm run lint` shows only pre-existing warnings/errors in files this PR
  does not touch.
  Not run: the server suite — this PR touches no server files.

- [x] **`/categories`, a category page, and `/search` jump straight from
  `<h1>` to `<h3>` — the card and result lists have no `<h2>` and
  `PostItem`/the category card use `<h3>` titles.** Done: #89.
  Added a visually-hidden `<h2>` (the same `.visually-hidden` clip-technique
  utility class the Home no-`h1` fix introduced) between each page's `h1`
  and its first card `h3`: "Categories" before `Categories.js`'s
  `.categories-grid`, "Discussions" before `CategoryPosts.js`'s
  `.post-list`, and "Results" before `SearchResults.js`'s `.post-list` —
  chosen over promoting the existing "Showing results for …" `<p>` to keep
  this a pure heading-order fix with no visual change on any of the three
  pages, consistent with how the Home item bridged its own `h1`-to-`h3` gap.
  Acceptance covered by new
  `client/src/pages/__tests__/{Categories,CategoryPosts,SearchResults}HeadingLevel.test.js`
  (one per page, in the style of `HomeHeadingLevel.test.js`): each renders
  the page with a non-empty list fixture and asserts the heading sequence
  never increases by more than one level and that an `h2` sits between the
  `h1` and the first card `h3`. Full client suite green (51 suites, 246
  tests, up from 48/243); existing `Categories`/`CategoryPosts`/
  `SearchResults` assertions unaffected. Did not touch the server — no
  server files changed.
  Original finding, reviewing the live
  site with Playwright: on
  `https://cerulean-marshmallow-003d16.netlify.app/categories` the heading
  sequence is `h1` ("Forum Categories") then six `h3`s (category-card names
  plus the sidebar promo); on a category page
  (`/categories/67cbb5ca71e8be810c50104c`) it is `h1` ("Learning Resources")
  then `h3` × N (`.post-title` feed-card titles,
  `client/src/components/posts/PostItem.js`); on `/search?q=learning` it is
  `h1` ("Search Results") then `h3` × 10. Each skips the `h2` level (a
  measured max jump of 2 on all three) — a WCAG 1.3.1 / 2.4.6 heading-order
  violation on three of the app's main browsing surfaces. This is distinct
  from the filed Home item (Home has *no* `h1` at all) and from the archived
  footer-heading fix (which only demoted the footer's own `<h3>`s and whose
  regression test pairs `Login` + `Footer`, neither of which renders a card
  list): these three pages have a correct `h1` but nothing bridges it to the
  `h3` titles.
  Scope: client-only. Give each list a real section heading at `h2` (the
  "Showing results for …" line already rendered as a `<p>` on `/search`
  could become the `h2`; `/categories` and the category page need a
  "Categories" / "Discussions" `h2`), or demote the card titles to the level
  the surrounding structure implies — one consistent approach across the
  three pages, coordinated with the `PostItem` heading level the Home
  no-`h1` item settles on so the two don't contradict.
  Acceptance: a test per page (`Categories`, `CategoryPosts`,
  `SearchResults`) renders it with a non-empty list fixture and asserts the
  heading-level sequence never increases by more than one and that an `h2`
  sits between the `h1` and the first card `h3`; existing
  `Categories`/`CategoryPosts`/`SearchResults` assertions unaffected.

- [x] **Every live post shows category-name/description fragments and the
  literal words "discussion" and "help" as tag chips — and
  `scripts/cleanup-post-tags.js` (the #33 remediation) cannot remove them.**
  Done: see PR for this item.
  Added `server/utils/tagPollution.js`: rather than a length/word-count
  heuristic (which #33 already showed is too broad in both directions —
  short fragments like "algorithms" survive it, genuine multi-word tags
  like "machine learning engineer" would be at risk from a stricter one),
  it builds a pollution set directly from the *live* Category collection —
  each category's full name, full description, every comma-split fragment
  of the description, and the name+first-fragment combination the seeding
  bug concatenated into one string — and drops any tag matching it
  (whitespace/case-insensitively, since the live examples show the
  name+fragment tag with inconsistent internal spacing), plus any bare
  "and …" connector fragment as a safety net for wording the current
  category text no longer matches, plus the two fixed junk tokens
  "discussion"/"help". New `scripts/cleanup-post-tag-pollution.js` follows
  `cleanup-post-tags.js`'s dry-run-by-default / `--apply` pattern, composing
  this with the existing `normalizeTags`/`MAX_TAG_LENGTH`/`MAX_TAGS` so one
  run does the full cleanup. `cleanup-post-tags.js` itself is untouched.
  Client-side defensive cap: `.post-tags .badge` in `client/src/App.css` now
  overrides `.badge`'s global `white-space: nowrap` (the actual overflow
  source — flex-wrap on `.post-tags` only lets *chips* wrap to a new line,
  it doesn't let a single nowrap chip's own text wrap) with `white-space:
  normal` + `overflow-wrap: break-word` + `max-width: 100%`, and
  `PostItem.js` caps rendered chips at `MAX_VISIBLE_TAGS = 10` (matching the
  server's `MAX_TAGS`) so a raw-driver-inserted row that bypasses Mongoose
  validation (see #79) still can't flood a card.
  Acceptance: `server/__tests__/utils/tagPollution.test.js` and
  `server/__tests__/tooling/cleanupPostTagPollution.test.js` cover the real
  live tag arrays quoted below, category-text fragment matching, the "and …"
  fallback, preservation of genuine tags (including ones the seed scripts
  actually use, like "machine learning engineer"), and the pre-existing
  length/count caps still applying; `client/src/__tests__/postTagsOverflow.test.js`
  (raw-CSS-source assertion, no browser available in this environment) and
  new `PostItem.test.js` cases (chip count cap, normal tags unaffected)
  cover the client side. Full client suite green (52 suites, 251 tests, up
  from 51/246); `npm run lint` shows only the same pre-existing
  warnings/errors on files this PR does not touch.
  Caveat: could not run the server suite in this environment — this
  sandbox fails every server suite before even reaching
  `mongodb-memory-server`'s already-documented download block (#68's
  caveat): `jest.setup.js` requires `connect-mongo`, which isn't installed
  (confirmed pre-existing and unrelated to this change by running an
  untouched suite, `Comment.test.js`, and seeing the identical failure).
  Verified the new utility and script logic instead via `node -e` against
  every case in both new test files (all passing) before writing them as
  Jest suites, matching the pattern of prior PRs' `node -e` verification
  under the same constraint.
  Original finding, reviewing the live site: `GET
  https://aiml-forum.onrender.com/api/posts?limit=100` returns 31 posts and
  **every one** carries polluted `tags`, rendered as purple chips in
  `.post-tags` on the home feed, `/search`, category pages and `/posts/:id`
  (`client/src/components/posts/PostItem.js`, `PostDetail.js`). Two shapes:
  a whole category name+description stored as one tag — `"deep learning
  topics related to neural networks"` (48 chars), `"project showcase  share
  and discuss your ai/ml projects and portfolios"` (69 chars), `"machine
  learning fundamentals  discussions about core machine learning concepts"`
  — and the same descriptions comma-split into standalone fragment tags:
  `"learning resources  recommendations for courses"`, `"books"`,
  `"tutorials"`, `"and other learning materials"`; `"deep learning
  frameworks"`, `"and applications"`; `"algorithms"`, `"and techniques"`.
  On top of that, the literal tokens `"discussion"` and `"help"` are present
  on all 31 posts. Rendered example, home feed first card
  (`https://cerulean-marshmallow-003d16.netlify.app/`): the chips read
  "deep learning topics related to neural networks", "deep learning
  frameworks", "and applications", "discussion", "help" — confirmed via
  Playwright against the live DOM. At a 375px viewport the long
  single-phrase chips run off the feed card's right edge (`.post-tags`
  measured `right ≈ 511` against `clientWidth 375`; the card clips it, so
  this is a chip-overflow-within-the-card defect, separate from and not
  fixed by the already-filed document-level `.navbar-search` scrollbar
  item).
  This is the pollution the archived tags item
  (`docs/BACKLOG-ARCHIVE.md`, done #33) describes, but that fix does not
  reach it. #33 added `normalizeTags()` + Post schema validators (≤10 tags,
  ≤30 chars each) and `scripts/cleanup-post-tags.js` for the live rows, and
  its Done note asserts the length filter "is what removes the
  category-description fragments — they're all far longer than a real tag."
  That is false for this data: `cleanup-post-tags.js` (read in full) only
  drops tags with `length > MAX_TAG_LENGTH` (30) and caps the count at
  `MAX_TAGS` (10), so the comma-split fragments and the `discussion`/`help`
  tokens — all ≤30 chars, ≤6 tags per post — survive it untouched. Running
  `--apply` against live would strip one or two strings per post and leave
  every card still showing 3–5 meaningless chips. The three versioned seed
  scripts (`server/seeder.js`, `scripts/generate-seed.js`,
  `scripts/seed-mongo.js`) all emit clean short tags (`beginner`, `pytorch`,
  `nlp`, …) and never `discussion`/`help`, consistent with #33's conclusion
  that these rows were seeded some other way.
  Scope: a live-data cleanup that handles this shape — a new one-off
  following `scripts/cleanup-post-tags.js`'s dry-run-by-default / `--apply`
  pattern that drops multi-word category-name/description phrases and the
  fixed `discussion`/`help` junk rather than only length-filtering (an
  autonomous PR cannot touch the live DB, so this ships as a documented
  script a human runs) — plus a defensive cap on `.post-tags` chip width /
  count in `PostItem` so a future bad row cannot run off the card. Server
  enforcement from #33 stays as-is.
  Acceptance: a test feeds the new cleanup routine a fixture built from the
  real live tag arrays above and asserts the result contains no multi-word
  category-description phrase, no bare `and …` / `discussion` / `help`
  fragment, and preserves any genuine short tag it is given; a `.post-tags`
  render test asserts a card given an over-long tag string keeps every chip
  within the card box at 375px; existing `cleanup-post-tags` /
  `normalizeTags` / `PostItem` assertions unaffected.

- [x] **The post's own up/down vote buttons on `/posts/:id` have no
  accessible name — a screen reader announces them as bare "button".**
  Done: see PR for this item. Added `aria-label="Upvote question"` /
  `aria-label="Downvote question"` to the post's two `.vote-btn` controls
  in `client/src/pages/PostDetail.js`, matching the pattern already used
  for the per-answer vote buttons (`"Upvote answer"` / `"Downvote answer"`,
  #67).
  Acceptance: a new `PostDetail` test (`PostDetail vote button accessible
  names (WCAG 4.1.2)`) asserts both of the post's vote buttons resolve via
  `getByRole('button', { name: ... })`, i.e. have a non-empty accessible
  name; full client suite green (52 suites, 252 tests) and the existing
  per-answer vote-button `aria-label` assertions from #67 are unaffected.

- [x] **"For you" ranking and the "You can answer these" rail.** Done: #71.
  Added `server/utils/feedRanking.js`: a documented weighted score
  (`TAG_WEIGHT` per matching `skills`/`tags`, `LEVEL_WEIGHT` for an
  `aiMlLevel`/`aiMlExperience` match, `CATEGORY_WEIGHT` for a `targetRole`/
  category-name word overlap, since `targetRole` is free text with no
  structured link to `Category`), applied to `GET /api/posts`'s default/
  `feed=recent` path via a new `optionalAuth` middleware
  (`server/middleware/auth.js`) so a signed-in member's request can be
  personalized without requiring one. Cold-start members (no `skills`, no
  `targetRole`) and anonymous visitors fall back to plain recency, as do
  every other feed value, an explicit `sort`/`select`, and `search` (whose
  own regex relevance takes priority) - all unaffected by this change.
  Ranking is bounded to the 200 most-recent matching posts before scoring
  (`PERSONALIZATION_CANDIDATE_POOL`) rather than scanning the full
  collection on every request. Added `GET /api/posts/recommended`
  (protected), reusing the same scoring over unanswered posts with the
  same cold-start fallback (oldest-first), and a new `RecommendedForYou`
  right-rail component wired into `Home` for authenticated members.
  Acceptance: covered by `server/__tests__/utils/feedRanking.test.js` (the
  scoring formula in isolation) and
  `server/__tests__/integration/forYouRanking.test.js` (ranking overriding
  recency, cold-start and anonymous fallback, non-interference with
  explicit sort/search/`feed=unanswered`, and `/recommended`'s auth
  requirement, ranking, exclusion of answered posts, and cold-start
  fallback); client coverage in
  `client/src/components/__tests__/RecommendedForYou.test.js` (rendering,
  empty state, thread links, hidden/no-fetch for signed-out visitors) and
  `Home.test.js`/`mobileTouchTargets.test.js` for the rail's wiring and
  44px link targets.
  Caveat: could not run the server suite in this environment -
  `mongodb-memory-server`'s binary download is blocked by this sandbox's
  egress policy (`fastdl.mongodb.org` → 403), the same limitation noted on
  #68/#70, not something introduced by this change (it fails the new
  pure-unit `feedRanking.test.js` identically, since jest's global setup
  boots the memory server for every file regardless of whether that file
  touches the DB). Verified instead by running the scoring logic directly
  via `node -e` against the same cases the unit test covers, and by
  requiring the changed modules standalone plus booting the compiled app
  in-process without error. Client suite ran clean: 39 suites, 190 tests.

- [x] **Mobile feed and bottom tab bar.** Done: #72. Per
  `Mobile.dc.html`: a new `MobileTabBar` component (`client/src/components/
  layout/MobileTabBar.js`), fixed to the viewport and shown only at
  `<=768px` (`.mobile-tab-bar` in `App.css`, hidden by default, `display:
  flex` inside the existing mobile media query — same pattern as
  `.mobile-menu-toggle`), rendered in `App.js` alongside `Navbar`/`Footer`.
  Feed links to `/`; Answer links to `/?feed=unanswered` and carries the
  unanswered count as a badge, polled every 60s from the same `GET
  /api/posts?feed=unanswered` envelope `Home` already reads (`Home` now
  seeds its `activeTab` from a `?feed=` query param on mount so the deep
  link lands on the right tab, falling back to `recent` for anything it
  doesn't recognise); Ask and You link to the existing `/create-post` and
  `/dashboard` routes and rely on `PrivateRoute`'s existing sign-in
  redirect for guests. Saved has no backing feature yet — nothing in this
  app persists a member's bookmarks — so it surfaces a "Saved posts are
  coming soon" alert instead of a dead link; see the new backlog item
  below.
  Fixed two real overflow sources at 375-390px along the way: `.post-header`
  (PostDetail's title/badges/meta row) and `.post-footer` (the feed card's
  tags/comment-count/Answer-button row) were both unwrapped flex rows with
  no wrap, so a narrow viewport pushed them wider than the screen; both now
  `flex-wrap: wrap`, covered by new regression tests alongside the existing
  `.post-meta` one in `postMetaOverflow.test.js`. Card padding is also
  reduced on mobile (`.card-body` 1.5rem → 1rem) for the "compact cards"
  half of this item, and the fixed tab bar's own height is cleared with
  bottom padding on `.footer` so it never sits over page content.
  Acceptance: `postMetaOverflow.test.js` covers the `.post-header`/
  `.post-footer` wrap fix (raw-CSS-source assertion, no browser available in
  this environment); `MobileTabBarTouchTargets.test.js` covers the 44px
  minimum on every tab and the raised Ask button; `MobileTabBar.test.js`
  covers all five links/targets, the unanswered-count badge (including the
  no-badge-at-zero case), active-tab highlighting on all four routes, the
  Saved "coming soon" alert, and the polling interval clearing on unmount;
  `Home.test.js` covers the new `?feed=` deep link and its fallback. Did not
  touch `Navbar.js`/`Navbar.css`, so the existing mobile hamburger menu is
  unchanged.

- [x] **`PostDetail`'s standalone "Mark as Solved" button can now diverge
  from the accepted-answer state.** Done: #73.
  Removed the standalone control (`handleSolve`
  and its button in `client/src/pages/PostDetail.js`) rather than
  reconciling two writers: the accept-answer flow is now the sole owner of
  `post.isSolved` in the UI, which is what the redesign's answering-loop
  thesis already implies — solving is meant to be a consequence of an
  accepted answer, not a separate asker action. `PUT /api/posts/:id/solve`
  (`solvePost` in `server/controllers/posts.js`) is left in place
  unchanged since it is covered by pre-existing server tests
  (`server/__tests__/integration/post-operations.test.js`) and removing it
  was out of scope for a client-only divergence fix.
  Acceptance: a regression test asserts no "Mark as Solved" control is
  rendered for the asker, and a second test asserts accepting an answer is
  the only path that flips `isSolved` in the UI (no call to the `/solve`
  endpoint); full client suite green (39 suites, 192 tests). Could not run
  the server suite in this environment — `mongodb-memory-server`'s binary
  download is blocked by this sandbox's egress policy
  (`fastdl.mongodb.org` → 403), a pre-existing environment limitation (see
  #68's caveat), not something this change triggers; no server files were
  touched by this PR.

- [x] **`EditPost` can crash-redirect a valid edit request away when the
  page is opened directly (a fresh load / hard refresh), before auth has
  finished loading.** Done: #74. Discovered while adding this page's document-title
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

- [x] **`Post`/`Comment` populated with a partial `select` crash on response
  serialization if `upvotes`/`downvotes` are excluded.** Done: #75. Discovered while
  building thread subscriptions (#68), across two rounds of CI failures:
  both `PostSchema.virtual('voteCount')` (`server/models/Post.js`) and
  `CommentSchema.virtual('voteCount')` (`server/models/Comment.js`)
  compute `this.upvotes.length - this.downvotes.length`, and both schemas
  set `toJSON: { virtuals: true }`, so that getter runs on *every*
  serialization of the document — populated subdocuments included. A
  `.populate({ path: 'post'|'comment', select: '...' })` that omits
  `upvotes`/`downvotes` leaves them `undefined` on the populated doc, so
  `res.json()` throws `Cannot read properties of undefined (reading
  'length')` — a 500 with no useful error surfaced (CI's job logs don't
  capture the server's `console.log`-based error middleware output
  either, which cost real debugging time on #68).
  `server/controllers/reports.js`'s `getReports`/`getReport` have the
  identical pattern on *both* models today — `.populate({ path: 'post',
  select: 'title content' })` / `select: 'title content user'` and
  `.populate({ path: 'comment', select: 'content' })` / `select: 'content
  user'` — none of the four selects include `upvotes`/`downvotes`, and
  none is covered by a test (no `server/__tests__/integration/
  reports.test.js` exists), so this is live and simply never triggered.
  Fix options: always include `upvotes downvotes` in any partial
  `Post`/`Comment` select (what #68 does locally, in both
  `server/controllers/subscriptions.js` and
  `server/controllers/notifications.js`), or make both `voteCount`
  getters defensive (`(this.upvotes || []).length - (this.downvotes ||
  []).length`) so a partial projection degrades gracefully instead of
  throwing — the second is more robust since it protects every future
  partial-select call site on either model, not just the ones an author
  remembers to patch.
  Acceptance: a regression test populates a `Post` and a `Comment` each
  with a `select` that excludes `upvotes`/`downvotes` and asserts
  serialization succeeds (`voteCount` either omitted or `0`, not a
  thrown error); `reports.js`'s four affected populates fixed or
  covered; existing server suite green.

- [x] **Saved posts: server model + endpoints.** Done: #76.
  First slice of "Build a real Saved posts feature" — that item was too
  large for one PR, so it's split into this item and the client one below
  it. Added `SavedPost` (`user` +
  `post` + `createdAt`, unique compound index — same shape as
  `Subscription`) and `server/controllers/savedPosts.js` with
  `POST`/`DELETE`/`GET /api/posts/:id/save` (save, unsave, status — all
  idempotent, matching the `subscribeUserToPost` upsert pattern in
  `server/utils/subscriptions.js`) plus `GET /api/saved-posts` (list mine,
  newest first, `protect`-scoped to `req.user.id`). No UI yet — that's the
  item below.
  Acceptance: new `server/__tests__/integration/savedPosts.test.js` covers
  the unique index, save/unsave idempotency, save status for the owner vs.
  another user, 404 on a non-existent post, listing only the current
  user's saved posts (newest first, no leakage across users), and
  per-endpoint auth requirements.
  Caveat: could not run the server suite in this environment —
  `mongodb-memory-server`'s binary download is blocked by this sandbox's
  egress policy (`fastdl.mongodb.org` → 403), which fails every existing
  integration suite identically (verified against `comments.test.js`
  unmodified), not something introduced by this change — the same
  limitation noted on #68/#70/#71/#73. Verified instead by confirming the
  test fails correctly before the implementation existed (missing
  `SavedPost` module), then after implementing: requiring the new modules
  standalone, booting the compiled app in-process (`NODE_ENV=test`) with
  the new router mounted, and confirming `POST /api/posts/:id/save`
  returns 401 without a token.

- [x] **Saved posts: client save toggle + listing view.** Done: #77. Second slice of
  "Build a real Saved posts feature," now unblocked by the server item
  above. Needs a save toggle on `PostItem`/`PostDetail` wired to
  `POST`/`DELETE`/`GET /api/posts/:id/save`, and a listing page or view
  (desktop nav + the mobile tab bar's existing Saved link, which currently
  shows a "Saved posts are coming soon" alert via `MobileTabBar.js`'s
  `handleSavedClick`) backed by `GET /api/saved-posts`.
  Acceptance: component tests for the toggle (saved/unsaved states,
  optimistic update, unauthenticated case disabled-not-hidden, 44px
  target) on both `PostItem` and `PostDetail`, and for the listing view
  (renders saved posts, empty state, links into the thread); the mobile
  tab bar's Saved link points at the new view instead of the "coming
  soon" alert, with `MobileTabBarTouchTargets.test.js`/
  `MobileTabBar.test.js` updated accordingly.

## Cycle 5 — logged-in experience review findings (Sep 2026)

- [x] **Accepting an answer leaves the post on "Needs an answer" and
  returns 400, on any post whose stored `tags` exceed the #33 caps.**
  Done: #93. `markAsAnswer` (`server/controllers/comments.js`) saved the
  comment's `isAnswer` flip first (succeeds), then set
  `post.isSolved` and called `post.save()` — which full-document-validates
  `tags`, throwing on any post carrying a legacy tag longer than
  `MAX_TAG_LENGTH`/over `MAX_TAGS` (#33). `asyncHandler` turned that into a
  400 after the comment flag had already persisted, so the comment and post
  went out of sync and the UI never left "Needs an answer". Same
  `post.save()`-hits-tag-validator failure the archived `GET /api/posts/:id`
  400 item fixed with `$inc`, just in a different code path. Fixed by
  replacing `post.isSolved = ...; await post.save()` with a targeted
  `Post.findByIdAndUpdate(comment.post, { isSolved: comment.isAnswer })`,
  which Mongoose does not validate by default.
  Acceptance: `server/__tests__/integration/comments.test.js` adds a case
  that writes an over-cap tag straight through the driver
  (`Post.collection.updateOne`, bypassing schema validation the way
  `scripts/seed-mongo.js` does), confirmed failing with the same 400 before
  the fix, then asserts `PUT /api/comments/:id/answer` returns 200 and
  `comment.isAnswer`/`post.isSolved` both flip and stay in lockstep;
  existing `markAsAnswer` tests unchanged and still pass. Client-side: no
  code change was needed (the client already trusts the API response, so
  this was a pure server bug) — the existing `PostDetail.test.js` coverage
  of the accept/un-accept "Solved" badge flow (added when #73 made
  accept-answer the sole owner of `isSolved`) still passes unmodified. A
  direct `.comment--accepted`-class assertion was attempted but dropped:
  every DOM-traversal approach available (`container.querySelector`,
  `.closest()`) trips this repo's `testing-library/no-node-access`/
  `no-container` ESLint rules, and there is no existing precedent here for
  asserting raw CSS classes in RTL tests.
  Caveat: `mongodb-memory-server`'s binary download is blocked by this
  sandbox's egress policy (`fastdl.mongodb.org` → 403), same as prior
  cycles — worked around this time by starting the Docker daemon manually
  and running a local `mongo:6.0` container (via
  `mirror.gcr.io/library/mongo:6.0`, retagged, per `CLAUDE.md`), so the
  full suites ran for real rather than being skipped: server 28 suites/295
  tests, client 52 suites/252 tests, both green; `cd client && npm run
  lint` unaffected (same pre-existing baseline).

## Cycle 5 — logged-in review findings and SEO metadata (Sep 2026)

Archived 2026-09-01. The signed-in-experience findings from the admin-account
review (#93-#100) — the accept-answer split write, the navbar and post-detail
density, the badge that disagreed between feed and thread, the broken default
avatars — plus the first slice of the growth queue's SEO work.

- [x] **The thread page and the feed disagree about "Needs an answer", and
  the thread's version is wrong on any post that already has answers.**
  Done in #94: added `client/src/utils/postStatus.js` as the single source
  of truth (`solved` / `needs-answer` / `null`, `null` covering both "has
  answers but unsolved" and "locked and unsolved"), and switched both
  `PostItem` and `PostDetail` to derive their badge from it instead of two
  independent expressions.
  Confirmed on the local stack 2026-09-01, logged in as admin. The seeded post
  "Online Courses for NLP Specialization" has one answer and `isSolved: false`.
  On the home feed its card renders badges `["Advanced","nlp","courses",
  "transformers","llm"]` — no status badge at all, and no
  `post-card--needs-answer` class. Open that same post and the thread renders
  `Needs an answer` in the status row, directly above the answer that already
  exists. Same post, same instant, two contradictory answers to "does this
  need an answer?". The two surfaces compute the badge from different things:
  `client/src/components/posts/PostItem.js:74` uses
  `!isSolved && commentCount === 0`, so a feed card only claims a post needs
  an answer when nobody has replied; `client/src/pages/PostDetail.js:428-432`
  renders `post.isSolved ? "Solved" : "Needs an answer"` with no reference to
  the answer count at all. So an unsolved post with seven answers shows no
  badge in the feed and a loud amber "Needs an answer" on its own thread —
  directly under the seven answers contradicting it. It also mislabels posts
  that are not questions (a Project Showcase entry, a resource list) and posts
  that are `isLocked`, where answering is impossible by design.
  This is distinct from the accept-answer 400 above, and outlives it: fixing
  that bug makes accept flip the badge on posts with clean tags, but does not
  make the badge mean the same thing on both surfaces. #79 fixed exactly this
  mismatch on the feed side and did not touch `PostDetail`.
  Scope: client-only, `PostDetail.js` plus whatever shared helper the two
  surfaces end up using. Give the badge one definition used by both — derive
  it once (a small exported helper, or a `needsAnswer` field the API already
  has the data to compute) rather than duplicating the expression a third
  time. Suggested semantics, but confirm against the product intent before
  building: `Solved` when `isSolved`; `Needs an answer` only when unsolved
  **and** there are no answers **and** the post is not locked; for an
  unsolved post that does have answers, either a quieter "No accepted answer"
  or no badge at all — do not leave two different amber states meaning
  different things.
  Note for the implementer: `client/src/pages/__tests__/PostDetail.test.js`
  currently asserts the buggy behaviour at lines 321, 345 and 381 (it expects
  "Needs an answer" on threads that have comments), so those assertions must
  be updated as part of the fix rather than worked around.
  Acceptance: a shared helper (or single source) is used by both `PostItem`
  and `PostDetail` — a test asserts the same post object produces the same
  badge state through both components; component tests cover the four cases
  (solved; unsolved with no answers; unsolved with answers; locked and
  unsolved) on both surfaces; the three `PostDetail.test.js` assertions above
  are updated to the corrected behaviour; existing accept-answer tests still
  pass.

- [x] **The signed-in navbar is overcrowded and has no visual
  hierarchy.** Done in #95: cut the top-level nav from ten items to at
  most six (brand · search · Home · Categories · a visually distinct
  "Create" button · notification bell · one user menu covering
  Dashboard/Saved/Profile/Logout · for staff, one "Admin" menu merging the
  old separate Admin + Moderator destinations). Dropdown contents are now
  conditionally rendered in JSX (genuinely unmounted until opened) instead
  of always sitting in the DOM with no CSS to hide them — there was no
  `.dropdown-menu`/`.dropdown-item` styling anywhere in the client before
  this PR added it. All new interactive controls meet the 44×44 touch
  target minimum unconditionally.

- [x] **The post-detail header and action row are dense, noisy, and
  overflow on mobile.** Done in #96: split the action row into reader
  actions (vote, Save, Notify) shown inline and author/moderator actions
  (Edit, Delete, Lock, Pin, Report) collapsed behind one quiet "More
  actions" toggle, all sharing one consistent style instead of four alert
  colours; moved the Pinned/Locked/Solved/Needs-an-answer badges out of the
  `<h1>` (which would otherwise leak into its accessible name) onto a
  `.post-title-row` alongside the title so they wrap onto the title's line
  instead of a separate full-width band; gave the answer-sort control
  ("Most helpful"/"Newest") its own bordered `.answers-toolbar`, separated
  from the comment composer's submit button it previously sat flush
  against.
  Measured logged in as admin on
  `/posts/6925386a…`: above the post body the page stacks five
  full-width bands — status badge, title, meta (author · category · date
  · views), a row of tag chips, then a **nine-button action row** (`↑/↓`
  vote, "Notify me of answers", "Save", "Edit", "Delete", "Lock", "Pin",
  "Report") in **four different colour variants** (`btn-danger`,
  `btn-outline-warning`, `btn-outline-info`, `btn-outline-danger`,
  plain). On desktop that row is one 44px line; at 375px it does not wrap
  cleanly — "Lock", "Pin", "Report" run past the right edge of the
  viewport (the `.post-header` block alone is 236px tall on mobile,
  pushing the body far down). The eight destructive/mod controls have the
  same weight as the two a reader needs.
  Re-measured locally 2026-09-01: the 375px overflow is confirmed and large —
  the thread page reports `scrollWidth` 578 against `clientWidth` 375, a 203px
  overflow, with the offending node identified as one of the `.btn.btn-sm`
  moderation buttons (Lock); `/` and `/dashboard` at the same width are clean,
  so this is specific to the post-detail action row. Two corrections to the
  original note: `Post Comment` now measures 44px, not 34px, so that part is
  already fixed — drop it from the work; but the answer-sort control
  ("Most helpful" / "Newest") sits **0px** below the `Post Comment` button,
  flush against it, so the control that sorts the answer list reads as part of
  the comment composer rather than as a header for the answers below it.
  Separate and label that group as part of this item.
  Scope: `PostDetail.js` / `App.css`, client-only. Split the action row
  into reader actions (vote, Save, Notify) shown inline and
  author/moderator actions (Edit, Delete, Lock, Pin, Report) collapsed
  into a single overflow "⋯" menu; give those buttons one consistent
  quiet style rather than four alert colours; tighten the header to
  title + one meta line + tags; guarantee the header and action area fit
  within 375px with no horizontal overflow; give the answer-sort control
  its own grouping, separated from the composer's submit button.
  Acceptance: a test renders `PostDetail` as the author (and as an
  admin) and asserts the inline action set is just vote/Save/Notify with
  the mod/author actions behind one toggle; a raw-CSS/jsdom check that at
  375px `.post-header` and `.post-actions` produce no element wider than
  the viewport (extend `postMetaOverflow.test.js`'s pattern); all
  post-detail controls assert `min-height >= 44px`; a test asserts the
  answer-sort control is not adjacent to the composer's submit button
  (a grouping/landmark or spacing assertion); existing `PostDetail` tests updated.

- [x] **"Accept this answer" renders as a loud full-size button on every
  comment.** Done in #98: the per-comment accept/unaccept control is now
  an icon-only outline toggle (`.accept-answer-toggle`), quiet gray by
  default and filling in success-green only on hover/focus or once its
  own comment is accepted; comments other than the accepted one get an
  extra `--muted` class once the post is solved. Delete/Report moved into
  their own labelled `.comment-moderation-actions` group, pushed to the
  far side of the row (`margin-left: auto`) so accept and remove no
  longer sit adjacent at equal weight.

- [x] **Comment and post-author avatars are broken images for every user
  on the default avatar.** Done in #99: added `client/src/utils/avatar.js`
  (`getAvatarUrl`) as the single place that normalises an avatar value —
  falsy or the legacy bare `'default-avatar.jpg'` resolve to the real
  `/images/default-avatar1.png` asset, an absolute URL passes through
  unchanged, any other bare filename resolves to `/images/<file>` — used
  by `Profile.js` and `PostDetail.js`'s comment/reply avatars instead of
  the `||` fallback that never fired against a truthy bare filename, with
  an `onError` handler kept as a second line of defense. `User.avatar`'s
  schema default and the Google OAuth no-photo fallback
  (`server/config/passport.js`) now default new accounts to the real
  asset path instead of the bare filename; existing accounts with the old
  value are covered by the client helper with no migration needed.
  `PostItem` and the navbar don't render an avatar and needed no change;
  `PostDetail`'s header text-links the author's name without an avatar
  image since #96, so that surface needed no change either.
  `User.avatar` defaults to the bare string
  `'default-avatar.jpg'` (`server/models/User.js:67`) and the API
  returns it verbatim. `PostDetail.js:594` / `:731` render
  `<img src={comment.user?.avatar || '/images/default-avatar1.png'}>` —
  the stored value is truthy so the `||` fallback never fires, and
  `"default-avatar.jpg"` resolves relative to the current route (e.g.
  `/posts/default-avatar.jpg`) → 404 → a broken-image icon on the post
  author and every comment/reply (visible in the review screenshot; the
  real fallback `client/public/images/default-avatar1.png` exists and is
  never used). Affects effectively every thread.
  Scope: pick one fix and apply it consistently — normalise `avatar` to
  a usable URL (default to `/images/default-avatar1.png`, or resolve a
  bare filename to `/images/<file>` at the API or a client helper),
  and/or add an `onError` fallback to the avatar `<img>`s. Cover
  `PostItem`, `PostDetail` (comments and replies), `Profile`, and the
  navbar user menu if it shows an avatar.
  Acceptance: a model/server test asserts a newly created user's
  `avatar` resolves to an existing asset path (not a bare filename); a
  client test renders a comment whose `user.avatar` is the default and
  asserts the `<img>` `src` is `/images/default-avatar1.png` (or that
  `onError` swaps to it); the Playwright run makes no failed request for
  the default avatar.

- [x] **`SavedPosts.js` has a third, independent copy of the status-badge
  logic.** Done in #100: switched `SavedPosts.js` to the shared
  `getPostStatus` helper (`client/src/utils/postStatus.js`) instead of its
  own inline `isSolved`/`commentCount` expression, and added `isLocked` to
  the `GET /api/saved-posts` payload so the helper has what it needs.
  Discovered while fixing the feed/thread "Needs an answer"
  mismatch above (#94): `client/src/pages/SavedPosts.js:70-74` renders its
  own `saved.post.isSolved ? "Solved" : saved.post.commentCount === 0 ?
  "Needs an answer" : null` inline, instead of using the new
  `client/src/utils/postStatus.js` helper `PostItem` and `PostDetail` now
  share. It also never looks at `isLocked`, so a locked-but-unsolved saved
  post with no comments would still show "Needs an answer" there while
  showing nothing on the feed and thread.
  Scope: client-only. Switch `SavedPosts.js` to `getPostStatus` (fetch or
  default `isLocked` on the saved-post payload if the endpoint doesn't
  already include it).
  Acceptance: a `SavedPosts` test covering the same four cases (solved;
  unsolved with no answers; unsolved with answers; locked and unsolved)
  used for the other two surfaces; existing `SavedPosts` badge tests
  updated if their fixtures change.

- [x] **Per-page metadata: description, canonical, Open Graph / Twitter
  tags.** Done in #101 (split from a combined "per-page metadata + QAPage
  structured data" item — the JSON-LD half is the next item below).
  `client/index.html` used to ship one static block of `<meta>`:
  `og:title`/`og:description`/`twitter:*` hard-coded to the generic site
  name and blurb, `og:url` resolving to the site root, and no `og:image`
  at all — so every shared link (a post, a category) unfurled identically
  as "AI/ML Career Forum" and every deep link pointed at `/`. Verified
  live: `/`, `/posts/:id` and `/categories/:id` returned byte-identical OG
  tags. `document.title` was already per-route via `useDocumentTitle`; the
  description and OG tags were not.
  Added `react-helmet-async` (v3, the first version with a React 19 peer
  range) and `client/src/components/common/Seo.js`, a shared component
  rendering `description`/canonical `<link>`/`og:*`/`twitter:*` (plus an
  opt-in `noindex` and an `image` for a large-image Twitter card), driven
  by the post/category/query actually being viewed. Deliberately does not
  touch `<title>` — `useDocumentTitle` keeps sole ownership of
  `document.title` so the two mechanisms don't race. `App.js` renders one
  default `<Seo />` for the site-wide fallback; `Home`, `PostDetail`,
  `CategoryPosts`, `SearchResults`, and `NotFound` each override it
  (`PostDetail` truncates the post body via the existing
  `markdownToPlainText` for its description; `SearchResults` and the
  category/post not-found states are `noindex`). `index.html`'s static
  `description`/`og:*`/`twitter:*` tags were removed — react-helmet-async
  only adds tags, it doesn't clean up ones it didn't render, so leaving
  the static block in place would have left two conflicting `og:title`
  tags in the DOM once React mounted.
  Acceptance: a test per route type (home, post, category, search, 404)
  in `Seo.test.js` and each page's own test file asserts the rendered
  `<head>` carries a route-specific `description` and `og:title`/`og:url`
  rather than the site default; the client suite runs with no
  helmet-provider warnings (react-helmet-async v3's React-19 dispatcher
  doesn't require a `HelmetProvider` ancestor, though `index.js` still
  wraps the app in one).

- [x] **`sitemap.xml` and `robots.txt`.** Split off the original
  "Prerendering for crawlers, `sitemap.xml`, and `robots.txt`" item below
  into this slice plus the prerendering item that follows it — the two
  are independent pieces of work (one a small dynamic route, the other a
  build-time crawl integration) and acceptance-testable separately.
  Done in #103: added `GET /sitemap.xml` and `GET /robots.txt` on the
  Express app (`server/src/routes/sitemap.ts`, mounted at the app root
  in `server/src/server.ts`, not under `/api`), generating a valid
  sitemap from the live `Post`/`Category` collections (home, `/categories`,
  every category, every post with a `<lastmod>` from `updatedAt`) plus a
  `robots.txt` allowing crawling and naming the sitemap. Because the
  client (Netlify) and API (Render) are separate domains in production —
  `client/.env.production`'s `REACT_APP_API_URL` names the API host — and
  crawlers fetch `robots.txt`/`sitemap.xml` from the page's own domain,
  `client/netlify.toml` proxies `/sitemap.xml` and `/robots.txt` to the
  Render API ahead of the SPA catch-all redirect, so both stay live at the
  site root and dynamic (no stale build-time file).
  Acceptance: `server/__tests__/integration/sitemap.test.js` covers valid
  XML structure, one `<url>` per seeded post/category with a count that
  grows when a post is added, a correct `<lastmod>`, and `robots.txt`
  content; existing server suite unaffected.
