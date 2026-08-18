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

- [ ] **`GET /api/posts/:id` returns 400 for 29 of 32 live posts, making
  them unreadable.** Verified 2026-08-17: `curl
  https://aiml-forum.onrender.com/api/posts/6924f058f1be24e72e9fa294` →
  `{"success":false,"error":"Each tag must be 30 characters or fewer"}`.
  Fetching all 32 posts and filtering confirms 29 have at least one tag
  over 30 chars. Root cause: `server/controllers/posts.js:98–99` increments
  the view counter with `post.views += 1; await post.save()`, and
  `post.save()` triggers the Mongoose tag validators added in PR #33. Those
  validators were designed to enforce tag-length on *writes*; they also fire
  on any `save()` call, including this read-path view-count bump. Fix:
  replace the two-line increment with a targeted
  `Post.findByIdAndUpdate({ _id: post._id }, { $inc: { views: 1 } })` so
  validators are not invoked on the read path. Note: this unblocks the API;
  the existing oversized tags in the DB still need `scripts/cleanup-post-tags.js
  --apply` (the one-off from PR #33) to be run by a human against the live
  database — that step is outside this item's scope.
  Acceptance: `GET /api/posts/:id` for a post seeded with a tag > 30 chars
  returns 200 and the full post document; `POST /api/posts` and
  `PUT /api/posts/:id` with an oversized tag still return 4xx (validator
  still enforced on writes); existing integration tests remain green.

- [ ] **Vite migration step 5a: drop react-scripts, run client tests via
  plain Jest.** New prerequisite for step 5b below, split out of the
  original "step 5" item (see the "first slice" note above for why).
  `client/package.json`'s `"test"` script is still `react-scripts test`,
  and jest is not a direct client devDependency — it comes transitively
  from `react-scripts@5.0.1` (jest 27.5.1, an old major). Replacing it
  needs: `jest` + `jest-environment-jsdom` added as direct devDependencies
  (pick and document a target Jest major); `testEnvironment: 'jsdom'` and
  `setupFilesAfterEach: ['<rootDir>/src/setupTests.js']` added explicitly
  to `client/package.json`'s `"jest"` block (both currently supplied
  implicitly by react-scripts' CRA-flavored jest config); a CSS-import
  mock (e.g. `identity-obj-proxy` or an inline `moduleNameMapper` stub) —
  `src/` has 8 `.css` imports (`App.css`, `index.css`,
  `AnnouncementBanner.css`, `Footer.css`, `ReportModal.css`,
  `KeyboardShortcutsModal.css`, `AdminUsers.css`, plus one more) that
  react-scripts currently stubs automatically and plain Jest will not;
  and a check for any static asset imports (images/svgs) needing the same
  treatment. Once done, `react-scripts` can be dropped from
  `devDependencies` entirely.
  Acceptance: `client/package.json`'s `"test"` script no longer invokes
  `react-scripts`; `react-scripts` is removed from `devDependencies`;
  full client Jest suite passes with no test files changed; a design note
  in the PR documents the chosen Jest major and config additions.

- [ ] **Vite migration step 5b: prune CRA-only `overrides` and re-audit.**
  Blocked on step 5a above — only meaningful once react-scripts (and thus
  its vulnerable transitive `nth-check`/`postcss`/`svgo`/`@svgr/webpack`/
  `resolve-url-loader` deps) is actually out of the tree. From
  `docs/vite-migration-design.md`: `client/package.json`'s `overrides`
  exist to patch react-scripts's webpack/SVG transitive CVEs; once
  react-scripts is gone, drop whichever overrides no longer resolve to
  anything in the tree (verify with `npm ls <pkg> --all` before dropping
  each one, the way this item's first slice did for `formidable`) — keep
  `form-data` as long as `axios` still pulls it in.
  Acceptance: `cd client && npm audit --omit=dev` stays clean after
  pruning, and full `npm audit` vulnerability count does not increase
  relative to pre-pruning.

- [ ] **Vite migration step 6: CI workflow verification.** From
  `docs/vite-migration-design.md`: confirm `.github/workflows/node.js.yml`
  needs no structural changes beyond possibly dropping `CI=false` from the
  build step (a CRA-only convention); re-verify `build-and-test` (including
  Playwright against the Vite dev server) and `deploy` (Netlify
  `publish-dir: './client/build'`) end-to-end.
  Acceptance: full CI green on a PR built against the migrated client from
  the prior steps.

- [ ] **PostDetail crashes the entire React app when a post's author has
  been deleted (`post.user` is null).** Verified 2026-08-17: navigating to
  `https://cerulean-marshmallow-003d16.netlify.app/posts/6936910651a7c355b934d878`
  (a live post with `user: null`) produces `pageerror: Cannot read properties
  of null (reading '_id')` and unmounts the entire app — the page falls back
  to the `<noscript>` shell. Root cause: `client/src/pages/PostDetail.js`
  line 244 renders `<Link to={/profile/${post.user._id}}>{post.user.name}</Link>`
  without guarding `post.user`. The API already supports orphaned posts
  (populate returns `null` when the referenced user is deleted) and one such
  post is live in production now. Fix: guard the author block with
  `post.user ? <Link …/> : <span>Deleted user</span>` (or equivalent) so the
  component degrades gracefully instead of crashing.
  Acceptance: a unit test renders PostDetail with a post where `user` is
  `null`; the component mounts without throwing, shows a "Deleted user"
  placeholder or similar, and the rest of the post (content, comments,
  voting) is still visible.

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
