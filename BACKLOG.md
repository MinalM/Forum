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
  Done: PR TBD. `server/seeder.js`, `scripts/generate-seed.js`, and
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

- [ ] **Vite migration step 1: add Vite tooling and dev/build scripts.**
  From `docs/vite-migration-design.md`: add `vite` + `@vitejs/plugin-react`
  as client devDeps, add `client/vite.config.js` (proxy `/api` →
  `localhost:2000`, port 3000, `build.outDir: 'build'`,
  `envPrefix: 'REACT_APP_'`), move `client/public/index.html` to
  `client/index.html` and drop `%PUBLIC_URL%` templating, replace
  `start`/`build` scripts (`vite` / `vite build`), drop `eject`.
  Acceptance: `npm run client` serves the app on port 3000 with `/api`
  proxying working; `cd client && npm run build` produces `client/build/`.
  Client test suite not expected to pass yet (Jest config untouched by this
  item, dealt with in the next item) — note actual state in the PR.

- [ ] **Vite migration step 2: env vars.** From
  `docs/vite-migration-design.md`: update `client/src/config.js` and
  `client/src/index.js` from `process.env.REACT_APP_*` /`process.env.CI` to
  `import.meta.env.REACT_APP_*`; resolve the CI-branch API URL logic without
  `process.env.CI` (Vite doesn't expose it under a `REACT_APP_`/custom
  prefix). Depends on the previous item's `vite.config.js` existing.
  Acceptance: app resolves the correct API URL in dev, CI, and production
  builds; existing `.env.production` and the CI workflow's
  `client/.env` injection keep working unmodified.

- [ ] **Vite migration step 3: Jest under the post-CRA transform chain.**
  From `docs/vite-migration-design.md`: `client/jest.babelTransform.js`
  currently builds on `babel-preset-react-app` (a react-scripts package).
  Replace with direct `@babel/preset-env` + `@babel/preset-react` (or
  equivalent), keeping the existing `import.meta`→`({})` strip plugin
  (react-router 8 needs it under Jest regardless of bundler) and the
  `axios` `moduleNameMapper`/`transformIgnorePatterns` allowlist as-is.
  Acceptance: full client Jest suite green without `react-scripts` in the
  transform path.

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
