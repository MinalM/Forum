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

## Items

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

- [ ] **Fix dead footer social links.** The Twitter/LinkedIn/GitHub links in
  `client/src/components/layout/Footer.js` are `#!` placeholders. Point them
  at real destinations or remove them.
  Acceptance: no `#!` hrefs remain in the footer; test asserts targets.

- [ ] **Design doc: migrate client from CRA to Vite.** react-scripts is
  unmaintained; its dev tree carries unfixable advisories (webpack-dev-server
  4.x) and required custom Jest shims for ESM deps (axios, react-router 8).
  This item is the design/plan only: migration steps, test-runner choice
  (Vitest vs keeping Jest), env-var mapping (`REACT_APP_*`), proxy config,
  CI changes. Output: `docs/vite-migration-design.md` reviewed via PR.
  Implementation gets split into follow-up items from that doc.

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
  Done: #31.

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
