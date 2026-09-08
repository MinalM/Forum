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
**The engagement redesign has shipped.** All 13 items of that queue merged as
#60–#72 and are archived in `docs/BACKLOG-ARCHIVE.md` under "Cycle 4", together
with the live-site defects the shipped UI exposed once real data ran through it
(#73–#91). The visual spec those items were built against is still the
reference for anything that touches those screens:
<https://claude.ai/code/artifact/e5aeaaf9-6c4d-428f-938e-ca02f66a208f>

What remains here, in priority order: defects and design debt found by
reviewing the signed-in experience of the shipped UI, then growth work, then
infrastructure carried over from the previous queue. Take the topmost unchecked
item as always — the review findings come first because they are the shipped
product misbehaving, not new capability.

Two standing constraints for every item below:
- Match the existing design tokens in `client/src/index.css` (`--primary-color`
  `#6200ea`, `--secondary-color` `#03dac6`, `--background-color` `#f5f5f5`, 8px
  card radius, `0 2px 10px rgba(0, 0, 0, 0.1)` shadow, the `body` font stack).
  Extend that vocabulary — do not introduce new brand colours or fonts.
- Every interactive control ships at 44×44 CSS px minimum (WCAG 2.5.5), and
  every new page/component gets the raw-CSS-source assertion used in
  `client/src/__tests__/mobileTouchTargets.test.js`.

### Logged-in experience: review findings

From a review of the signed-in experience (logged in as an admin account)
on the live site at desktop and 375px with Playwright — navigation, the
post-detail layout, and the accept-answer flow. Bug first, then design.

The first two batches of findings shipped as #93-#100 and #105-#108 and are
archived under "Cycle 5" and "Cycle 6". A **third** sweep on 2026-09-06, run
locally logged in as `admin@example.com`, found the navbar, dashboard
headings, and admin/mobile overflow all still fixed (no regression) and two
new items below. The deployed site stays unreachable from the agent sandbox
(its egress policy 403s the Netlify host), so everything here was measured
locally.

Three post-level bugs also found in this sweep - upvote/lock/pin clobbering
the post's populated user/category fields, lock and pin 404ing because their
routes were never mounted, and all four (plus upvote/downvote) 400ing on
posts with legacy oversized tags - were fixed directly rather than filed
here; see the commit fixing them for the detail. They are the reason lock and
pin never appeared broken to any test: `PostDetail.test.js` and
`PostDetailActionRow.test.js` mock `axios` entirely, so a route that was
never wired into Express, or a response that silently dropped populated
fields, was never exercised end to end.

Running the stack locally is possible but not obvious — the Docker daemon is
not started in the sandbox, Docker Hub's blob CDN is 403 so `mongo:6.0` must be
pulled from `mirror.gcr.io/library/mongo:6.0` and retagged, and
`mongodb-memory-server` cannot fetch its binary. Once up, `npm run seed` creates
`admin@example.com` / `password123`. Worth capturing as a project run-skill.

One caveat for anyone reviewing screenshots from that rig: the Font Awesome CDN
is blocked too, so every `<i class="fas fa-*">` icon renders blank locally.
Icon-only controls therefore look like unlabelled coloured squares in local
screenshots — that is the sandbox, not the product.

- [x] **The post view's tag chips and action controls have no `gap` —
  wrapped tag rows touch, and the tag block sits flush on the action row.**
  Done in #122: `.post-tags` got a real `gap` and bottom margin, and
  `.comment-actions` got a `gap` (its old spacing depended on a
  `.comment-action` rule that no rendered element actually carried - removed
  as dead CSS). Regression coverage in
  `client/src/__tests__/tagActionGaps.test.js`, same raw-CSS-source pattern
  as `mobileTouchTargets.test.js`.
  Filed once before (2026-09-02) and lost when that work's branch was
  rebased before a PR was opened for it — re-verified live 2026-09-06,
  still present, unchanged. Three separate spacings, all zero, at both
  1280px and 375px:
  1. `.post-tags` (`client/src/App.css:367`) is `display: flex; flex-wrap:
     wrap` with **no `gap`**. Its horizontal spacing comes entirely from the
     legacy `.badge { margin-right: 0.5rem }` in `client/src/index.css`
     (still applied — `TagChip`'s follow-toggle button keeps the `badge
     badge-primary` classes alongside `tag-chip-btn`, per
     `client/src/components/common/TagChip.js:53`), which does nothing
     between *rows*. Measured on a post with 8 tags: 2 rows, same-row gaps
     of 8px each (the margin), **row gap 0px** — the two rows touch and read
     as one solid purple block.
  2. `.post-tags` has no bottom margin, so the measured vertical gap from
     the tag block to `.post-actions` is **0px**.
  3. `.comment-actions` (`App.css:830`) is `display: flex` with no `gap`;
     spacing relies on `.comment-action { margin-right: 1rem }`, which the
     `<button>` children do not carry — two of its buttons measure **0px**
     apart.
  This affects `PostItem`'s feed/list cards too, not only the thread page —
  `PostItem.js:279` renders tags through the same `.post-tags` class, so any
  card whose tags wrap to two lines has the identical touching rows.
  Scope: `client/src/App.css`, client-only, no markup or route changes
  needed. Put a real `gap` on each of these flex containers (`.post-actions`
  already does this correctly with `gap: 0.75rem` — follow it), give
  `.post-tags` a row gap and a bottom margin, and stop relying on
  `.badge`'s `margin-right` for spacing inside a flex row — it does not
  survive wrapping, `gap` does.
  Acceptance: a raw-CSS assertion that `.post-tags`, `.comment-actions` and
  the feed card's tag row each declare a non-zero `gap` and do not depend on
  `.badge`'s `margin-right` for separation; a jsdom/rendered check on a post
  with enough tags to wrap asserts a non-zero vertical gap between tag rows
  and between the tag block and `.post-actions`; existing `PostDetail` and
  `PostItem` tests updated.

- [x] **`moveThread` (move a post to a different category) has no UI and is
  dead code end to end.** Done in #123: added a "Move to category" item to
  the post-detail overflow menu (moderator/admin only, gated on the
  existing `moveThread` permission), backed by a new `MoveThreadModal`
  (`client/src/components/posts/MoveThreadModal.js`) that fetches
  `/api/categories`, excludes the post's current category from the picker,
  and calls the existing `PUT /api/posts/:id/move` endpoint on submit. The
  move endpoint's response carries a raw unpopulated `category` id (same
  class of issue as the upvote/lock/pin fix above), so the modal hands its
  caller the already-fetched, populated category object to merge in,
  following the merge-not-replace pattern used by
  `handleLockThread`/`handlePinThread`. Regression coverage in
  `client/src/components/posts/__tests__/MoveThreadModal.test.js` (the
  modal in isolation) and `client/src/pages/__tests__/PostDetailActionRow.test.js`
  (menu visibility per role, and the end-to-end move keeping the author
  link intact).

### Growth: adoption and engagement

Net-new features, not part of the engagement redesign above or the
carried-over queue below. They target two gaps the redesign did not
touch: the app has almost no organic discoverability (the SPA serves an
empty shell — no prerender, no per-page metadata, no sitemap), and
nothing reaches a member when they are not on the site (no email at all;
the notification bell only works in an open tab). Ordered by priority.
Do the review-found data bugs above (the `title`/`content` mismatch, the
empty `feed=unanswered`) before the two SEO items — indexing broken
content is worse than not indexing it. The last item
(reputation/leaderboard) is deliberately parked until the forum has
enough traffic for it to work.

- [ ] **Wire the crawler-prerender pass into the deploy pipeline.** Split
  off the item above: `scripts/prerender.js` exists and is proven against a
  live build+API in its own e2e test, but nothing runs it as part of an
  actual deploy yet. `.github/workflows/node.js.yml`'s `deploy` job builds
  `client/build` and publishes it via `nwtgck/actions-netlify` without ever
  calling `npm run prerender` — and even if it did, that job doesn't install
  Playwright's browser binaries (only `build-and-test` runs
  `npx playwright install chromium`), so the crawl would fail immediately.
  `client/netlify.toml`'s own `[build] command` is not the live path either:
  the GitHub Actions `deploy` job builds the client itself and hands
  `nwtgck/actions-netlify` the pre-built `client/build` folder to publish,
  bypassing Netlify's own build system (and thus its `netlify.toml`
  `command`) entirely. Needs a `.github/workflows/node.js.yml` edit — add a
  `npx playwright install chromium` step and an `npm run prerender` step
  (with `REACT_APP_API_URL` pointed at the deployed Render API) to the
  `deploy` job before the Netlify publish step — which per this repo's
  autonomous-cycle rules requires its own explicitly-scoped, human-driven
  PR, same as the three CI items under "Carried over" below.
  Acceptance: the `deploy` job's build step is followed by a prerender step
  that does not fail the job when the API is briefly unreachable; a
  post-merge check against the live site (`curl` with a non-JS user agent,
  or the deployed sitemap's post URLs) shows real post title/body content
  in the raw HTML; `build-and-test` and the rest of `deploy` unchanged.

- [x] **"Related questions" on the post thread.** Done in #124: a new
  `GET /api/posts/:id/related` endpoint ranks other posts by tag overlap
  (weighted) and title/content similarity (the same escaped-regex approach
  `searchPosts` uses, built from the source post's own title — `searchPosts`
  itself has no tag-aware or scored "relevance" to reuse beyond that regex
  strategy, so this is net-new ranking logic, not a thin wrapper).
  `PostDetail.js` fetches it in a `useEffect` keyed only on the post `id`
  (never on `post`/`comments`, which get new object/array references on
  every vote or new comment) and renders a "Related questions" list below
  the tags, capped at 5, with a plain-text empty state. Regression coverage
  in `server/__tests__/integration/posts.test.js` (`describe('Related
  Posts', ...)`, 6 cases) and `client/src/pages/__tests__/PostDetail.test.js`
  (distinct links excluding the current post, empty state, no re-fetch on
  an in-page upvote), plus a `mobileTouchTargets.test.js` entry for the new
  `.related-questions-item a` 44px link. The server suite could not be run
  in the sandbox that implemented this (`mongodb-memory-server` can't reach
  its binary host there, and the Docker daemon isn't running either) — see
  #124 for the caveat and lean on CI to confirm it.

- [x] **Draft autosave for the composer.** Done in #126: added a
  shared `useDraftAutosave(key, value, { isEmpty })` hook
  (`client/src/hooks/useDraftAutosave.js`) that debounces (800ms) writing
  `value` to `localStorage` under `key`, surfaces any previously-saved,
  non-empty draft as `restoredDraft` on mount, and exposes `clearDraft` for
  a discard action or a successful submit; every `localStorage` call is
  wrapped in try/catch so a storage-disabled browser silently gets no
  autosave instead of a thrown error. Wired into the two primary composers:
  `CreatePost.js` (`draft:create-post`, saving `{ title, content }`) and
  `PostDetail.js`'s top-level comment form (`` draft:post:${id}:comment ``,
  saving the comment text). Both show a "Draft restored — Discard" banner
  (`.alert.alert-info` + an existing `.btn.btn-sm`, already unconditionally
  44px per the existing touch-target rule, so no new CSS was needed) when a
  draft is restored.
  Not covered by this slice - same pattern, smaller composers, split out
  to keep this PR to one slice: `PostDetail.js`'s reply-to-comment form
  (`replyText`/`replyingTo`) and `PostItem.js`'s inline feed-card answer
  composer (`draftText`). Filed as a new item below.
  Acceptance: `client/src/hooks/__tests__/useDraftAutosave.test.js` (9
  cases: no draft on mount, debounced save, no save while empty, restore,
  ignoring an empty stored draft, discard clearing storage, clearing after
  a simulated submit, and both `getItem`/`setItem` throwing degrading to a
  no-op) plus `CreatePost.draftAutosave.test.js` and
  `PostDetail.draftAutosave.test.js` (4 cases each: debounced save,
  restore-on-mount populating the field, discard clearing the field and
  storage, successful submit clearing the key). Full client suite (74
  suites / 421 tests) and lint run clean locally - see PR #126 for
  the actual output.

- [x] **Extend draft autosave to the reply-to-comment and feed-card
  quick-answer composers.** Done in #127: `PostDetail.js`'s reply form
  now autosaves `replyText` under `` draft:post:${id}:reply:${parentId} ``
  (a single shared field, since only one reply box is open at a time) and
  `PostItem.js`'s inline feed-card composer autosaves `draftText` under
  `` draft:post:${_id}:quick-answer `` (a distinct key from `PostDetail`'s
  own top-level `` draft:post:${id}:comment `` key, kept separate rather
  than shared since they are different component instances). Both reuse
  `useDraftAutosave` as-is, following the shipped pattern: a "Draft
  restored — Discard" banner inside the composer, the draft cleared on
  discard or a successful submit, and left intact in storage when the
  composer is merely closed/cancelled (so reopening it - the reply form
  for the same comment, or the feed card's composer - restores it).
  Regression coverage in
  `client/src/pages/__tests__/PostDetail.replyDraftAutosave.test.js` (5
  cases, including that two comments' reply drafts are kept in separate
  storage keys) and
  `client/src/components/posts/__tests__/PostItem.draftAutosave.test.js`
  (4 cases). Full client suite (76 suites / 431 tests) and lint run clean
  locally - see PR #127 for the actual output; the server suite is
  unaffected by this client-only change and was not run.

- [x] **RSS / Atom feeds.** Done in #128: added `GET /api/feed.xml`
  (sitewide) and `GET /api/categories/:id/feed.xml`, each a hand-built
  Atom document (following `server/src/routes/sitemap.ts`'s existing
  precedent for XML responses built from the plain-JS models, rather than
  pulling in a new dependency) of the 20 most recent posts — title,
  author name, a Markdown-stripped summary (`server/src/utils/feedSummary.ts`,
  a small server-only equivalent of the client's DOM-dependent
  `markdownToPlainText`), permalink, and `<published>`/`<updated>`
  timestamps, sorted `-createdAt` to match `feed=recent`'s own anonymous
  default order (`server/middleware/advancedResults.js`). The category
  feed 404s for both an unknown and a malformed id (a `CastError` flows
  through the existing global error handler, same as `getCategory`).
  Both routes are owned by one new file, `server/src/routes/feed.ts`,
  mounted at `/api` — despite categories' own CRUD living in plain JS
  (`routes/categories.js`), the two-segment `/:id/feed.xml` path never
  collides with that router's own routes (`/:id`, `/:categoryId/posts`),
  which fall through to the next matching middleware when nothing inside
  them matches. `client/src/components/common/Seo.js` gained a `feedUrl`
  prop rendering the `<link rel="alternate" type="application/atom+xml">`
  tag; `Home.js` and `CategoryPosts.js` pass their respective feed URLs.
  Regression coverage in `server/__tests__/integration/feed.test.js` (7
  cases: empty feed, ordering/content, order parity with `feed=recent`,
  the 20-post cap, category scoping, and both 404 cases) plus
  `Seo.test.js`/`Home.test.js`/`CategoryPosts.test.js` additions for the
  alternate link. Full client suite (76 suites / 434 tests) and lint ran
  clean locally. The server suite could not be run in this sandbox —
  same known constraint as #124/#126 (`mongodb-memory-server` can't reach
  its binary host, and the Docker daemon won't start either); `npm run
  build` in `server/` compiled cleanly and the compiled `server/dist/`
  output is committed alongside the source. See #128 for the caveat and
  lean on CI to confirm the server suite.

- [ ] **Reputation, badges, and a leaderboard. (Parked — not yet.)** A
  Q&A community's contribution incentive: points for upvotes received and
  accepted answers, a small fixed badge set (first answer, first accepted
  answer, N upvotes, …), a reputation number on profiles and post/answer
  author rows, and a `/leaderboard`. The vote and accept mechanics it
  builds on already exist (#65, #67). **Deliberately not queued yet** —
  on a forum with ~30 posts and few active members a leaderboard is
  hollow and can discourage newcomers; revisit once the SEO and email
  items above have grown daily actives enough that a ranking means
  something. When picked up: a denormalised `reputation` on `User`
  maintained in the vote/accept controllers, a backfill script following
  `scripts/cleanup-post-tags.js`'s dry-run-by-default pattern, and
  Statsig gating so it can ship as an experiment.
  Acceptance (when unparked): unit tests for the points formula,
  integration tests that each rep-changing event (upvote, retraction,
  accept, un-accept) moves the author's stored `reputation` and that a
  fetch reflects it, a backfill test reconciling deliberately-wrong
  values against seeded data, badge-award idempotency, and the
  leaderboard endpoint's ordering and pagination.

### Carried over from the previous queue

Not part of the redesign, though the first CI item below directly affects
whether the redesign's own tests mean anything. The `EditPost` crash is a real
bug and sits below the redesign work only because the redesign was explicitly
prioritised; the three CI items all require editing `.github/workflows/`, which
the autonomous cycle cannot do under the current ground rules, so they wait for
a human-driven change — and since they touch the same file, they are probably
one PR rather than three.

- [ ] **Run the client unit tests in CI — they have never run there.** CI's
  only unit-test step is `npm test` at the repo root, which resolves to
  `jest --config server/jest.config.js` (server suites only). Nothing in
  `.github/workflows/` has ever invoked the client's Jest — not
  `cd client && npm test`, and not the `react-scripts test` that preceded it —
  so the 32 client suites under `client/src/` are not a merge gate. CI does run
  `vite build` and Playwright against a live stack, so client code is compiled
  and smoke-tested end to end, but its unit tests are unenforced. This matters
  most for the redesign queue above: 9 of its 13 items are primarily client
  work whose acceptance criteria are component tests, and as things stand a PR
  can break every one of them with CI green. The fix is a step in
  `build-and-test` alongside the existing server one:
  `- name: Run client unit tests` / `run: cd client && npm test`.
  Consider gating `cd client && npm run lint` in the same PR, but only after
  clearing the existing lint baseline — #53's notes report 4 errors and 7
  warnings already present on `main` (re-verify before relying on that count),
  so adding the step as-is lands the job red. Never paper over that with
  `|| true`.
  Acceptance: `build-and-test` runs the client suite on every push/PR to
  `main`; a deliberately failing client test is demonstrated to fail the job
  (then reverted); the server unit-test step, the build step and the Playwright
  job are unchanged; if lint gating is included, the pre-existing lint errors
  are fixed in the same PR so the step lands green.

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

- [x] **The `security` CI job is red on `main` right now — root `npm audit`
  fails on a moderate `qs` advisory.** Already fixed, checkbox just never
  updated: PR #102 (merged 2026-09-02) added `"qs": "^6.16.0"` to the root
  `overrides` block and regenerated `package-lock.json`, exactly the fix
  this item called for. PR #103, in flight around the same time, ported
  the identical override into its own branch independently (its commit
  message cites #102 as already carrying the fix) so it wasn't blocked
  waiting on #102 to merge first — either way, `main` has carried the fix
  since 2026-09-02 and this item was simply never checked off.
  Re-verified 2026-09-08 on `main` at `c275ce7`: root `npm audit` → 0
  vulnerabilities, `cd client && npm audit --omit=dev` → 0 vulnerabilities,
  `package-lock.json` resolves `qs` to `6.16.0` at the top level, and the
  `security` job on `main`'s latest CI run
  (https://github.com/MinalM/Forum/actions/runs/34173981817/job/101899631516)
  is green. Per the original acceptance criteria's ask to check whether the
  override is still needed: no — `body-parser@2.3.0` still declares
  `qs: ^6.15.2` and `superagent@10.2.3` still declares `qs: ^6.11.2`,
  neither has bumped its own floor past the vulnerable `6.15.3`, so the
  override remains load-bearing.

- [ ] **`server/.env.production` is committed to the repo with live
  secrets.** Discovered while checking existing env-var conventions for
  the weekly digest's unsubscribe link: `.gitignore` only ignores the
  literal `.env`, not `.env.production`, so `server/.env.production` —
  containing a real MongoDB Atlas connection string with credentials,
  `JWT_SECRET`, and `SESSION_SECRET` — has been committed since PR #65
  and sits in the repo's git history on every clone. This is a live
  secrets leak, not a hypothetical one.
  Needs a human: rotate the Atlas credentials, `JWT_SECRET`, and
  `SESSION_SECRET` in Render's actual environment config, then remove
  the file from the working tree going forward (add `.env.production` to
  `.gitignore`, `git rm --cached` it) — and, since rotation alone doesn't
  un-leak already-published history, decide whether the exposed commits
  need scrubbing (e.g. a filtered history rewrite), given this is a
  private repo that's already been cloned into at least this sandbox.
  Deliberately not fixed inline: rotating live production credentials
  needs a human with Render/Atlas access, and rewriting git history is
  exactly the kind of destructive, hard-to-reverse operation these
  autonomous-cycle ground rules keep off-limits without a human driving.
  Acceptance: `server/.env.production` no longer trackable going forward;
  the Atlas/JWT/session secrets it contained are rotated; a fresh clone
  can no longer read the old credentials.
