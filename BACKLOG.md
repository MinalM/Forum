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

The original batch of findings shipped as #93-#100 and is archived under
"Cycle 5". The items below come from a **second** sweep on 2026-09-01, run
locally against eleven authenticated routes at 1280px and 375px, which covered
the pages the first review did not reach: the Dashboard, the admin and
moderator surfaces, Categories, Profile, Create Post, Saved and Search. The
deployed site stays unreachable from the agent sandbox (its egress policy 403s
the Netlify host), so everything here was measured locally.

Running the stack locally is possible but not obvious — the Docker daemon is
not started in the sandbox, Docker Hub's blob CDN is 403 so `mongo:6.0` must be
pulled from `mirror.gcr.io/library/mongo:6.0` and retagged, and
`mongodb-memory-server` cannot fetch its binary. Once up, `npm run seed` creates
`admin@example.com` / `password123`. Worth capturing as a project run-skill.

One caveat for anyone reviewing screenshots from that rig: the Font Awesome CDN
is blocked too, so every `<i class="fas fa-*">` icon renders blank locally.
Icon-only controls therefore look like unlabelled coloured squares in local
screenshots — that is the sandbox, not the product.

- [ ] **Every control below the 44px minimum is only fixed at mobile widths —
  at desktop the same controls are 13-42px, and the tests cannot see it.**
  Measured on a local run at 1280px, logged in as admin, across eleven
  authenticated pages. The worst offenders, by rendered height:
  the navbar search **submit button at 13px** and its input at 29px (on every
  page); the moderator dashboard's `Pending` / `Resolved` / `Dismissed` tab
  buttons at **19px**; the category page's Solved/Unsolved `<select>` at
  **19px**; `/admin/users`' `Edit Role` / `Timeout` / `Ban` buttons at **26px**;
  the Dashboard's `Edit Profile` and `Create New Post` links at 29px; the
  admin user-search input and its Search button at 34px; the Create Post
  category and level `<select>`s at 37px; and a long tail of `.btn` links
  (`View All Discussions`, `Join the Community`, `New Post`, `Manage Users`) at
  42px. The same sweep at 375px reports **zero** controls under 44px on every
  one of those pages.
  That gap is the point: the 44px rules added by the archived touch-target
  items were written inside `@media (max-width: 768px)` blocks, so the desktop
  rendering was never covered, and `client/src/__tests__/mobileTouchTargets.test.js`
  asserts against the mobile CSS only — it passes while a 13px button ships.
  Pointer targets are not a mobile-only concern: WCAG 2.5.8 (AA, WCAG 2.2) sets
  a 24px floor regardless of input device, which the 13px and 19px controls
  fail outright, and touchscreen laptops hit exactly these controls.
  Scope: client CSS plus the test. Lift the target floor out of the mobile
  media queries so it applies at every width — the brand's own `.btn`,
  `.btn-sm`, `.form-control`, `<select>` and the navbar search should carry it
  by default rather than each page re-fixing it. Keep the visual density
  reasonable at desktop: a 44px minimum on `min-height` does not require
  changing font sizes or padding elsewhere.
  Acceptance: a test asserts the minimum applies **without** a
  `max-width` media query wrapper (extend `mobileTouchTargets.test.js`, or add
  a desktop-width sibling, so the mobile-only regression cannot come back); a
  jsdom or raw-CSS assertion covers the specific controls named above; a sweep
  at 1280px finds no interactive control under 44px on the eleven
  authenticated routes; the existing mobile assertions stay green.

- [ ] **The three dashboards have broken heading outlines, and the stat-card
  numbers are themselves headings.** Measured locally at 1280px. The Dashboard
  outline reads `H1 "Dashboard"` → `H3 "1"` → `H3 "3"` → `H3 "0"` →
  `H2 "Your Recent Posts"`; `/admin` reads `H1 "Admin Dashboard"` →
  `H3 "3"` → `H3 "5"` → `H3 "1"` → `H3 "0"` → `H2 "Recent Users"`; and
  `/moderator` reads `H1 "Moderator Dashboard"` → `H3 "Reports"` →
  `H2 "Reports (pending)"`. So all three skip H1→H3, `/moderator` additionally
  emits an H3 before its H2, and on the two stat dashboards the headings a
  screen-reader user navigates by are the bare numerals "1", "3", "0" — the
  count, not what it counts.
  This is the same defect class the archived items fixed on `/`, `/categories`,
  a category page and `/search`; that work never reached the authenticated
  dashboards, which were not part of those reviews.
  Scope: `client/src/pages/Dashboard.js`, `AdminDashboard.js`,
  `ModeratorDashboard.js`, client-only. The stat cards should not be headings
  at all — the number is data and its label is the caption, so a `<p>`/`<dl>`
  pairing is the right markup; if a heading is wanted per card it must carry
  the **label** text and sit at the correct level. Fix `/moderator`'s H3-before-H2
  ordering in the same pass.
  Acceptance: a test per page walks the rendered heading list and asserts no
  level is skipped and no heading's accessible name is a bare number, reusing
  the pattern from the archived heading-level tests
  (`HomeHeadingLevel.test.js` and its siblings); existing dashboard tests
  updated.

- [ ] **`/admin` and `/admin/users` overflow horizontally on mobile, and the
  user table is unusable at any width.** Measured locally: `/admin/users`
  reports `scrollWidth` 410 against `clientWidth` 375 with the offending node
  identified as `TABLE.table.users-table`, and `/admin` reports 432 against 375
  with `DIV.stat-card` — the admin surfaces were not part of the archived
  mobile-overflow work, which covered the public pages and left these two.
  `/moderator` is clean at 375px.
  At desktop the same table is a separate design problem, visible in the review
  screenshot: it renders inside roughly the left half of a 1280px viewport and
  leaves the rest empty, while its own columns are so tight that "Admin User"
  runs flush into "admin@example.com" with no cell padding and the Role badge
  abuts the Status column. Each row then repeats three full-weight buttons —
  `Edit Role`, `Timeout`, and a red `Ban` — so the most destructive action in
  the product is the most visually prominent element, on every row.
  Scope: `client/src/pages/AdminUsers.css` / `AdminUsers.js` and the admin
  dashboard's stat-card grid, client-only, no route or API changes. Give the
  table real cell padding and let it use the available width; wrap it in a
  horizontally scrollable container so narrow viewports scroll the table rather
  than the page (or switch to a stacked card layout under a breakpoint); make
  the stat cards reflow instead of overflowing; and demote `Timeout`/`Ban` to a
  quiet or overflow treatment so a destructive action is not the loudest thing
  on each row. Row heights should satisfy the target floor from the item above.
  Acceptance: a raw-CSS/jsdom assertion that neither `/admin` nor
  `/admin/users` produces an element wider than a 375px viewport (the pattern
  used by the archived overflow tests); a test asserts the table has non-zero
  horizontal cell padding and that the destructive row actions are not rendered
  with the same emphasis class as the primary one; existing `AdminUsers` tests
  updated.

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

- [ ] **`QAPage` + `Question`/`Answer` JSON-LD structured data on post
  pages.** Second half of the per-page metadata item above (#101 did the
  description/canonical/OG/Twitter half). On post pages emit `QAPage` +
  `Question` / `Answer` JSON-LD (the accepted answer as `acceptedAnswer`,
  the rest as `suggestedAnswer`, vote counts as `upvoteCount`) so Google
  can render a Q&A rich result — the JSON-LD must describe only what is
  visibly on the page. Build on `client/src/components/common/Seo.js`
  (e.g. an optional `jsonLd` prop, or a sibling component) rather than a
  second ad hoc `<script type="application/ld+json">` — `PostDetail`
  already computes `postStatus`/comment data the JSON-LD needs.
  Acceptance: a post-page test asserts the emitted JSON-LD parses, is
  `@type: QAPage`, and its `acceptedAnswer` / `upvoteCount` match the
  fixture; a post with no accepted answer omits `acceptedAnswer` rather
  than emitting a null/empty one.

- [ ] **Prerendering for crawlers.** Even with per-route tags (item
  above) and the sitemap/robots.txt item above, a crawler that does not
  execute JavaScript still receives `client/index.html`'s empty
  `<div id="root">` — the client has no SSR or prerender step, so post
  bodies are invisible to non-JS indexers. Add crawler prerendering
  (Netlify's built-in prerender service, or a build-time pass such as
  `react-snap` / `@prerenderer` over the static routes plus a sample of
  post URLs).
  Acceptance: an e2e/integration check fetches a post URL with a non-JS
  user agent (or inspects the prerendered artifact) and asserts the post
  title and body text are in the raw HTML; the existing Playwright suite
  against the live SPA still passes.

- [ ] **Email delivery, password reset, and welcome email.** The server
  has no email capability — no mail dependency, no `sendEmail`, no
  reset-token fields on `User`. Two consequences: a member who registered
  with a local password and forgets it is permanently locked out with no
  recovery path, and there is no channel to bring anyone back. Add a mail
  transport (a provider SDK — Resend / Postmark / SES — configured by
  env, a no-op logger transport under test/dev), `resetPasswordToken` +
  `resetPasswordExpire` on `User`, `POST /api/auth/forgot-password`
  (always 200; emails a time-boxed single-use link only when the address
  exists) and `POST /api/auth/reset-password/:token`, a "Forgot
  password?" flow off `/login`, and a welcome email on registration.
  Google-OAuth accounts (no local password) stay out of the reset path.
  Acceptance: integration tests for forgot-password (known and unknown
  email both 200; a token row is written only for the known one),
  reset-password (valid token sets the new password and clears the
  token; expired / used / blank token 400s; an OAuth-only account cannot
  reset), and that registration enqueues exactly one welcome send;
  delivery is asserted through a test double, never a real send; existing
  auth tests unchanged.

- [ ] **Weekly digest email and notification preferences.** Builds on
  the email item above. The in-app notification bell (#69) only fires
  while a tab is open, so a member who does not visit gets nothing. Add
  an opt-out weekly digest — new answers/replies on posts they authored
  or subscribed to since the last send, plus up to N unanswered
  questions matching their `skills` / `targetRole` (reusing
  `server/utils/feedRanking.js`) — sent by a scheduled job. Add a
  `notificationPrefs` object on `User` (`digest: 'weekly' | 'off'`,
  default `weekly`), a preferences screen, and a one-click unsubscribe
  link (signed token, no login required) in every digest footer.
  Acceptance: a test drives the digest builder against a fixture with a
  mix of subscribed / authored / skill-matching posts and asserts the
  recipient list and each recipient's contents (a member with
  `digest: 'off'` is skipped; one with nothing new is not emailed); the
  unsubscribe token flips `digest` to `off` with no session; the
  scheduled entry point is covered and sends no real mail in tests.

- [ ] **Follow a tag or topic.** `Subscription` is post-only
  (`user` + `post`, `server/models/Subscription.js`) — a member can be
  told about replies on one thread but cannot say "tell me about new
  questions tagged `pytorch`." Generalise it to an optional `tag` target
  (a `tag` field alongside `post`, exactly one of the two set, each with
  its own unique compound index — or a separate `TagSubscription` model
  if that reads cleaner), a follow/unfollow control on tag chips and
  category pages, and a hook in `createPost` that calls `notifySubscribers`
  for every follower of any of the new post's tags, never the author.
  Feeds the digest item above.
  Acceptance: integration tests for follow/unfollow idempotency, a new
  post notifying every tag follower except its author, no duplicate
  notification when a follower follows two of the post's tags, and
  per-user isolation on the "tags I follow" listing; the existing
  post-subscribe tests still pass.

- [ ] **Markdown composer with a preview tab and a formatting toolbar.**
  Post and comment bodies render Markdown now (archived items), but the
  composer is a bare `<textarea>` (`client/src/pages/CreatePost.js:127`,
  and the same in the inline answer/reply composers) with no formatting
  affordance and no preview — high friction on an AI/ML forum where
  answers are mostly code, error output and links. Add a lightweight
  editor: a small toolbar (bold, inline code, code block, link, list)
  that wraps the current selection, and a Write / Preview toggle that
  renders through the *same* Markdown renderer the display side already
  uses. Not a WYSIWYG — the stored value stays Markdown text.
  Acceptance: component tests for each toolbar action transforming the
  selection correctly, the preview toggle producing output identical to
  the post/comment display renderer for a sample document, and the field
  still submitting the raw Markdown string; applied to the create-post
  form and the inline answer/reply composers; keyboard focus and 44px
  targets on the toolbar buttons.

- [ ] **`@mentions` in posts and comments.** No way to pull a specific
  person into a thread. Parse `@username` tokens on post/comment save,
  resolve them to users, write a `mention`-type `Notification`
  (extending the model's `type` enum), and render the mention as a link
  to `/profile/:id`. Cap at a few mentions per body to prevent
  notification spam, and never notify someone mentioning themselves.
  Acceptance: tests for parsing (valid handle, unknown handle ignored,
  `@` mid-word ignored, self-mention produces nothing), a `mention`
  notification landing for each distinct valid handle up to the cap, and
  the rendered body linking the mention; the notification bell and
  unread count surface the new type with no further change.

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
