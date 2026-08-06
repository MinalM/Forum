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

- [ ] **Navbar search UI.** Add a search input to the navbar that hits the
  search endpoint and renders results as a page reusing `PostItem`.
  Acceptance: component tests for input → results → empty state; works
  logged-in and logged-out; keyboard accessible (Enter submits).

- [ ] **Newest-first sorting and a Solved/Unsolved filter on category pages.**
  Category post lists currently render oldest-first. Default to newest-first
  and add a filter using the existing `isSolved` concept.
  Acceptance: tests for sort order and filter; UI control reflects state.

- [x] **Session-aware homepage hero.** Logged-in users still see
  "Join the Community" / Register CTAs. Show "Create Post" and a Dashboard
  link instead when authenticated.
  Acceptance: component tests for both auth states.
  Done: #26.

- [ ] **Server survives MongoDB connection blips.** The server exits on any
  mongoose monitor timeout (observed when Docker Desktop restarted), killing
  the API instead of letting the driver reconnect. Remove the fatal handler
  for post-startup connection errors; rely on mongoose auto-reconnect and
  surface state via `/api/health` `dbState`.
  Acceptance: unit test for the health endpoint under disconnected state;
  manual repro note in the PR (stop/start mongo container).

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

- [ ] **`npm run install-all` doesn't install `server/`'s dependencies.**
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
