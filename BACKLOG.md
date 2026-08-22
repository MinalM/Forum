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

**Current focus: the engagement redesign.** Items 1–13 below implement it in
dependency order — server counters first, then the feed, then the thread, then
personalisation, then mobile. Visual spec (all four screens, interactive):
<https://claude.ai/code/artifact/e5aeaaf9-6c4d-428f-938e-ca02f66a208f>

The redesign's thesis is that the forum has no *answering loop*: questions can
be asked but not answered without a page change, answers can't be accepted, and
nothing brings anyone back to a thread. Items 1–8 close that loop, 9–10 add the
return trigger, 11–12 personalise what the loop surfaces, 13 carries all of it
to mobile. Do not reorder personalisation ahead of the loop — ranking a feed
better does not help if answering is still a page change away.

Two standing constraints for every item below:
- Match the existing design tokens in `client/src/index.css` (`--primary-color`
  `#6200ea`, `--secondary-color` `#03dac6`, `--background-color` `#f5f5f5`, 8px
  card radius, `0 2px 10px rgba(0, 0, 0, 0.1)` shadow, the `body` font stack).
  This is a structural redesign, not a rebrand — do not introduce new brand
  colours or fonts.
- Every interactive control ships at 44×44 CSS px minimum (WCAG 2.5.5), and
  every new page/component gets the raw-CSS-source assertion used in
  `client/src/__tests__/mobileTouchTargets.test.js`.

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

- [ ] **Answer from the feed, without a page change.** The lurker-to-contributor
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

- [ ] **Accepted answers on the thread.** The mechanic that makes answering
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

- [ ] **Threaded replies on the thread.** `Comment.parentComment`,
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


- [ ] **Answer voting and "Most helpful" ordering.** `PUT /api/comments/:id/upvote`
  and `/downvote` exist and are unused. Add the per-answer vote control from
  `PostThread.dc.html` and the Most helpful / Newest sort toggle above the
  answer list, with the accepted answer pinned first under both orderings.
  Acceptance: tests for voting, retraction, the unauthenticated disabled
  state, both sort orders, and the accepted answer staying pinned; sorting is
  client-side over the already-fetched list unless the thread paginates.

- [ ] **Thread subscriptions (server).** Nothing in the app brings a member
  back: the only notification surface is the moderator-only pending-reports
  count polled by `client/src/components/layout/Navbar.js`. This is the largest
  new server surface in the redesign, so it lands on its own. Add a
  subscription model (user + post + createdAt, unique per pair), auto-subscribe
  a member to any post they author or comment on, and endpoints to
  subscribe/unsubscribe/list. Add a notification record written when a new
  answer or reply lands on a subscribed post, with an unread count endpoint and
  a mark-read endpoint. No email or push in this item — in-app only.
  Acceptance: integration tests for subscribe/unsubscribe idempotency,
  auto-subscribe on authoring and on commenting, no self-notification for your
  own answer, notifications written to every other subscriber, unread count,
  mark-read, and authorisation (a member only ever sees their own).

- [ ] **Notify-me control and a member notification bell (client).** Wires item
  9 into the UI: the "Notify me of answers" toggle on the thread per
  `PostThread.dc.html`, and the navbar bell showing a member's unread count
  rather than only a moderator's pending reports, with a dropdown listing
  recent notifications that link through to the answer.
  Acceptance: tests for toggling subscription, the bell reflecting the unread
  count for a plain member, moderators still seeing the reports count
  (distinguish the two, don't merge them), mark-read on open, and the polling
  interval not firing after unmount.

- [ ] **Ask for a member's track at signup, not on a profile page nobody
  visits.** `User.targetRole`, `User.aiMlExperience` and `User.skills` are
  collected today only by `client/src/pages/EditProfile.js` and are used by
  nothing at all. Per `Onboarding.dc.html`, add a step after registration
  capturing target role and skills as selectable chips, showing a live preview
  of what the resulting feed will contain, and skippable in one click.
  Acceptance: tests for chip selection, the mutually-exclusive "Nothing yet"
  option, the preview updating from the selection, skip going straight to the
  feed, values persisting to the existing `User` fields via the existing update
  endpoint, and the step not reappearing once completed or skipped.

- [ ] **"For you" ranking and the "You can answer these" rail.** Uses what item
  11 collects. Rank the default feed by relevance to the member's
  `targetRole`/`skills`/`aiMlExperience` (matching category, tags and
  `aiMlLevel`) rather than pure recency, and add the right-rail card from
  `Main.dc.html` surfacing unanswered questions matching their skills.
  Ranking stays simple and legible — a documented weighted score computed in
  the query, not a learned model.
  Acceptance: server tests for the ranking given fixture users and posts,
  including the cold-start case (a member with no skills set falls back to
  recency, never to an empty feed); client tests for the rail rendering,
  its empty state, and links through to the thread.

- [ ] **Mobile feed and bottom tab bar.** Per `Mobile.dc.html`: the feed at
  390px with compact cards and inline voting, and a bottom tab bar carrying
  Feed / Answer (badged with the unanswered count) / Ask / Saved / You.
  The `.post-meta` horizontal-overflow bug this item used to carry has since
  shipped on `main` (#53: `flex-wrap: wrap` on `.post-meta` in
  `client/src/App.css`, guarded by `client/src/__tests__/postMetaOverflow.test.js`).
  Do not redo it — but the redesigned meta rows must keep wrapping, and that
  test must still pass against whatever replaces the rule.
  Acceptance: no horizontal overflow (`scrollWidth <= clientWidth`) at 375px
  on the feed and on a post detail page, tested either with Playwright or, if
  no browser is available in the implementing environment, the raw-CSS-source
  assertion pattern from `mobileTouchTargets.test.js`; every tab-bar target at
  44px; the existing mobile menu still works.

### Carried over from the previous queue

Not part of the redesign, though the first CI item below directly affects
whether the redesign's own tests mean anything. The `EditPost` crash is a real
bug and sits below the redesign work only because the redesign was explicitly
prioritised; the three CI items all require editing `.github/workflows/`, which
the autonomous cycle cannot do under the current ground rules, so they wait for
a human-driven change — and since they touch the same file, they are probably
one PR rather than three.

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
