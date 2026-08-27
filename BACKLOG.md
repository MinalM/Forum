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

- [ ] **`PostDetail`'s standalone "Mark as Solved" button can now diverge
  from the accepted-answer state.** Discovered while implementing accepted
  answers (item above): `handleSolve` in `client/src/pages/PostDetail.js`
  calls `PUT /api/posts/:id/solve` (`solvePost` in
  `server/controllers/posts.js`), a manual toggle of `post.isSolved`
  completely independent of any comment's `isAnswer` flag. Now that
  accepting an answer also sets `post.isSolved` (and un-accepting clears
  it), a post can end up "Solved" with no accepted answer (asker clicked
  the standalone button) or "Needs an answer" while a comment still shows
  the green "Accepted by" state (asker un-solved the post directly instead
  of un-accepting the answer). Low priority - not a regression from this
  item, the two controls already both wrote `isSolved` before it, but the
  new accepted-answer UI makes the split more visible. Worth resolving by
  either removing the standalone button in favour of accept-driven solving,
  or having each path clear the other's state.
  Acceptance: decide and document which control owns `isSolved`; a test
  demonstrates the two paths can no longer disagree.

### Carried over from the previous queue

Not part of the redesign, though the first CI item below directly affects
whether the redesign's own tests mean anything. The `EditPost` crash is a real
bug and sits below the redesign work only because the redesign was explicitly
prioritised; the three CI items all require editing `.github/workflows/`, which
the autonomous cycle cannot do under the current ground rules, so they wait for
a human-driven change — and since they touch the same file, they are probably
one PR rather than three.

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

- [ ] **`Post`/`Comment` populated with a partial `select` crash on response
  serialization if `upvotes`/`downvotes` are excluded.** Discovered while
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

- [ ] **Build a real "Saved posts" feature.** Discovered while implementing
  the mobile bottom tab bar (item above): `Mobile.dc.html`'s tab bar has a
  Saved tab, but nothing in this app lets a member bookmark a post — no
  model, no endpoint, no UI anywhere else either. The tab bar ships a
  "Saved posts are coming soon" alert in place of a dead link
  (`MobileTabBar.js`'s `handleSavedClick`) rather than inventing the
  feature inline in that PR. Needs a `SavedPost` (or similar) model keyed
  on user + post with a unique compound index (same shape as
  `Subscription`), `POST`/`DELETE`/`GET /api/posts/:id/save` endpoints, a
  save toggle on `PostItem`/`PostDetail`, and a listing page or view the
  mobile tab bar's Saved link (and a desktop equivalent) can point to.
  Acceptance: TBD once scoped - likely two items (server model +
  endpoints, then the client toggle/listing), each with its own
  acceptance criteria and tests.
