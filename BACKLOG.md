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

**Email delivery, password reset, and welcome email.** Split into slices —
the original item bundled a mail transport, the forgot/reset-password API,
a client UI flow, and a welcome send into one PR, which is bigger than the
one-PR-or-less rule allows.

- [ ] **"Related questions" on the post thread.** A thread is a dead end
  once read. Below the post (or beside the comments) show 3–5 other
  questions by tag overlap and title/body similarity, reusing the
  existing `GET /api/posts/search` relevance, excluding the current
  post. Interlinks content for crawlers as well as readers.
  Acceptance: a test renders `PostDetail` with the related endpoint
  mocked and asserts 3–5 distinct links excluding the current post, an
  empty state when there are no matches, and that each links into a
  thread; the query is capped and does not re-fire on in-page
  vote/comment updates.

- [ ] **Draft autosave for the composer.** A long answer lost to an
  accidental navigation or refresh is a silent contribution killed.
  Autosave the create-post and answer/reply composer contents to
  `localStorage` (debounced, keyed by route/target), restore on return
  behind a visible "Draft restored — discard?" affordance, and clear the
  key on successful submit or explicit discard.
  Acceptance: tests for debounced save-on-change, restore-on-mount
  populating the field, the discard control clearing storage, and a
  successful submit clearing the key; storage access is wrapped so a
  storage-disabled browser degrades to no autosave rather than throwing.

- [ ] **RSS / Atom feeds.** Power users and aggregators cannot follow the
  forum without an account. Add `GET /api/feed.xml` (newest questions)
  and `GET /api/categories/:id/feed.xml`, each a valid Atom document of
  the N most recent posts (title, author, summary, link, timestamp),
  linked with `<link rel="alternate" type="application/atom+xml">` in the
  relevant page `<head>`.
  Acceptance: integration tests assert each endpoint returns valid Atom
  (parses; required elements present), the item set and order match
  `feed=recent` for the same scope, and the category feed 404s for an
  unknown id; the `<head>` alternate link is present on the home and
  category pages.

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

- [ ] **The `security` CI job is red on `main` right now — root `npm audit`
  fails on a moderate `qs` advisory.** Discovered while driving #101's CI
  to green: the `security` job's root `npm audit` step (which runs before
  the client-specific `npm audit --omit=dev` step) fails on
  [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx)
  (array-limit bypass via bracket-key comma parsing) and
  [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g)
  (DoS via attacker-controlled `isBuffer`), both in `qs@6.15.3`. `qs` is
  pulled in transitively at the root (server) level via
  `express@5.2.1` → `body-parser@2.3.0`, and via
  `supertest@7.1.4` → `superagent@10.2.3` — nothing client-side. Confirmed
  reproducing on an unmodified checkout of `main` at `3ebd1e4` (the same
  commit whose own CI run, ~3.5h earlier, was green on this exact
  lockfile) — this is a newly-surfaced advisory, not something any
  particular PR introduced. Priority: high — every open and future PR's
  `security` check will be red until this is fixed, which blocks this
  autonomous cycle's merge gate for unrelated work.
  Scope: root `package.json`/`package-lock.json` only. Likely fix:
  add a `qs` entry to the root `overrides` block (matching the existing
  `brace-expansion` pattern) pinning to a patched version (>=6.16.0 once
  published, or whatever version resolves both advisories), then
  regenerate the lockfile and confirm `npm run build`/`npm test` and
  `express`/`body-parser`/`supertest` still behave correctly.
  Acceptance: root `npm audit` (and `npm run ci` end to end) is clean;
  server test suite still passes; note in the PR whether `express`/
  `body-parser`/`superagent` have since published their own fix
  upstream (in which case the override may already be unnecessary).

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
