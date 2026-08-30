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

- [ ] **Mobile horizontal overflow on every page — the navbar search box.**
  Found reviewing the live site at a 375px viewport with Playwright:
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

- [ ] **A third of live posts show a body that answers a different question
  than their own title — visible on the home feed, not just the thread.**
  Found reviewing the live site: `GET https://aiml-forum.onrender.com/api/posts?limit=100`
  returns 31 posts, and 10 of them have a `content` field that opens with a
  literal `Title: <different topic>` line naming a subject unrelated to the
  post's own `title` field. Example:
  `https://cerulean-marshmallow-003d16.netlify.app/posts/6925386a88cb7b8de046eddf`
  is titled "Implementing Efficient Attention Mechanisms in Transformers for
  Natural Language Processing" but its rendered body starts "Title: Exploring
  Transfer Learning in Deep Learning Models" and goes on to discuss transfer
  learning, never attention mechanisms — confirmed both via the API
  (`content` field) and via Playwright against the rendered page (`.post-content`
  text matches the API body verbatim). This is not confined to the thread
  page: `PostItem`'s excerpt renders the same mismatched content on the home
  feed itself, so a signed-out visitor sees a card titled "Building a Smart
  Home Automation System with Machine Learning" whose preview text opens
  "Title: Image Classification Model in Python" without opening anything —
  reproduced live on `/` for 3 of the top 5 feed cards. The paired comments
  read as if written against the *title*, not the *content* (e.g. the above
  post's top comment discusses "attention mechanisms in Transformers", not
  transfer learning), so this looks like a title/content pairing shuffle
  from however the live data was originally seeded — the same "seeded some
  other way, predates the versioned scripts" root cause the tag-pollution
  item (`docs/BACKLOG-ARCHIVE.md`, done #33) found for `Post.tags`, but
  affecting `title`/`content` pairing instead of tags, and not covered by
  that fix or its cleanup script. `server/seeder.js`, `scripts/generate-seed.js`
  and `scripts/seed-mongo.js` should be audited the same way #33 audited them
  for tags, to confirm current seed sources pair title/content correctly
  before deciding whether this needs a live-data cleanup script, a
  server-side invariant (e.g. reject/flag a `content` whose leading `Title:`
  line doesn't match `title`), or both.
  Acceptance: an audit of the three seed scripts confirms whether they can
  produce a title/content mismatch (fix them if so, matching #33's pattern);
  a regression test asserts the seed path never persists a `content` whose
  leading `Title:` line differs from the post's own `title`; a decision is
  documented on whether the 10 already-mismatched live rows need a one-off
  cleanup script (following the `scripts/cleanup-post-tags.js` precedent) or
  a human data fix, since — as with the tags item — an autonomous PR cannot
  itself touch the live database.

- [ ] **The home feed has no `<h1>` anywhere on the page, and its one
  heading jumps from nothing straight to `<h3>`.** Found reviewing the live
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

- [ ] **Login, Register and the footer ship interactive controls well
  below the 44px minimum the rest of the app now enforces.** Found
  reviewing the live site at a 375px viewport with Playwright
  (`getBoundingClientRect`/`getComputedStyle` — these are layout heights,
  re-checked after a settle so they are not transition artefacts). On
  `https://cerulean-marshmallow-003d16.netlify.app/login` and `/register`
  the primary submit buttons — `button.btn.btn-block` ("Login",
  "Register", "Login with Google", "Register with Google") — compute to
  **34px tall** with `min-height: 0`: `.btn` (`client/src/index.css:58-70`)
  only sets `padding: 0.5rem 1.5rem` and nothing in a `@media (max-width:
  768px)` block raises it. The `input.form-control` fields (email,
  password, name) compute to **42px** (`client/src/index.css:143-155`,
  same story). Every footer link — `.footer-link a`
  (`client/src/App.css:180`): Home, Categories, AI/ML Resources, Kaggle,
  Coursera, Udacity, Fast.ai — is a bare inline anchor **21px tall** with
  only `margin-bottom: 0.5rem` (8px) between rows, on every page. This is
  the same WCAG 2.5.5 / project-standard gap that
  `client/src/__tests__/mobileTouchTargets.test.js` already guards for the
  navbar, pagination, sidebar and feed-tab controls; the archived "Mobile
  touch targets below the 44px minimum" item fixed a named subset and
  explicitly left the rest. Login and Register are the two highest-value
  pages for a not-yet-signed-in visitor.
  Scope: mobile-scoped (`@media (max-width: 768px)`) `min-height: 44px` on
  `.btn`/`.btn-block` and `.form-control`, and on `.footer-link a` (an
  inline anchor ignores `min-height`, so it also needs `display: flex`/
  `block` plus alignment, the same treatment `.categories-sidebar
  .category-item a` got in the earlier item); no desktop layout change.
  The post-detail author/category/`.comment-username` links (21-23px) are
  the same defect if it is a small addition, but Login/Register/footer is
  the core of this item.
  Acceptance: `client/src/__tests__/mobileTouchTargets.test.js` gains
  raw-CSS-source assertions (its existing pattern) that `.btn`,
  `.form-control` and `.footer-link a` each declare `min-height >= 44px`
  within the mobile media block, and that `.footer-link a` declares a
  `display` that lets it take effect; a render-based check on `Login`/
  `Register` in the style of the archived `PostDetail` vote-button test
  (inject the real CSS as a `<style>` tag, assert computed `min-height >=
  44px` on the submit button); existing `mobileTouchTargets.test.js`
  assertions unchanged.

- [ ] **An unknown or deleted category id renders a raw "Error fetching
  category data" alert instead of a clean not-found page.** Found
  reviewing the live site:
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

- [ ] **The category-page "Filter" `<select>` and its `.btn-sm` siblings
  are interactive controls well below the 44px minimum the rest of the
  app now enforces.** Found reviewing the live site at a 375px viewport
  with Playwright (`getBoundingClientRect`/`getComputedStyle`, re-checked
  after a settle). On
  `https://cerulean-marshmallow-003d16.netlify.app/categories/67cbb5ca71e8be810c50104c`
  the Solved/Unsolved filter `<select id="post-filter">`
  (`client/src/pages/CategoryPosts.js:108`) computes to **78×19px** with
  `min-height: 0`, `padding: 0`, `font-size: 13.3px` — it carries no class
  and no rule anywhere raises it. The "All Categories" back link
  (`CategoryPosts.js:159`, `.btn.btn-secondary.btn-sm`) computes to
  **139×33px**, and the page's other `.btn-sm` links (create-post / login
  prompt, pagination) are the same height. Control case: a bare injected
  `<select>` with no app CSS also measured ~19px, so part of the height is
  the browser default — but the project standard (and the existing
  `client/src/__tests__/mobileTouchTargets.test.js` pattern) is that
  interactive controls get an explicit `min-height: 44px` plus padding,
  and this `<select>` gets neither. This is the same WCAG 2.5.5 /
  project-standard gap already guarded for the navbar, pagination, Home
  sidebar and feed-tab controls and filed for Login/Register/footer
  above; `mobileTouchTargets.test.js` does not currently cover any
  `CategoryPosts` control.
  Scope: `CategoryPosts.js` / `App.css`, client-only. Give `#post-filter`
  (or a class on it) and the page's `.btn-sm` controls a mobile-scoped
  (`@media (max-width: 768px)`) `min-height: 44px` with padding; a
  `<select>` respects `min-height` directly so no `display` change is
  needed there, unlike the inline-anchor footer links. No desktop layout
  change.
  Acceptance: `mobileTouchTargets.test.js` gains raw-CSS-source assertions
  (its existing pattern) that the category filter select and the
  `.btn-sm` rule each declare `min-height >= 44px` within the mobile media
  block; a render-based check on `CategoryPosts` (inject the real CSS as a
  `<style>` tag, assert computed `min-height >= 44px` on the filter
  `<select>`); existing `CategoryPosts.test.js` and
  `mobileTouchTargets.test.js` assertions unchanged.

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

- [ ] **Per-page metadata, Open Graph / Twitter tags, and `QAPage`
  structured data.** `client/index.html` ships one static block of
  `<meta>`: `og:title`/`og:description`/`twitter:*` hard-coded to the
  generic site name and blurb, `og:url` resolving to the site root, and
  no `og:image` at all — so every shared link (a post, a category)
  unfurls identically as "AI/ML Career Forum" and every deep link points
  at `/`. Verified live: `/`, `/posts/:id` and `/categories/:id` return
  byte-identical OG tags. `document.title` is already per-route via
  `useDocumentTitle`; the description and OG tags are not. For a Q&A site
  the search snippet and the social unfurl are the main acquisition
  surface and both are blind. Add per-route `<head>` management (e.g.
  `react-helmet-async`): `description`, `canonical`, `og:title` /
  `og:description` / `og:url` / `og:type`, `twitter:card` + image, all
  driven by the post or category actually being viewed. On post pages
  emit `QAPage` + `Question` / `Answer` JSON-LD (the accepted answer as
  `acceptedAnswer`, the rest as `suggestedAnswer`, vote counts as
  `upvoteCount`) so Google can render a Q&A rich result — the JSON-LD
  must describe only what is visibly on the page. Supersedes the static
  block from the archived "No Open Graph metadata" item.
  Acceptance: a test per route type (home, post, category, search, 404)
  asserts the rendered `<head>` carries a route-specific `description`
  and `og:title`/`og:url` rather than the site default; a post-page test
  asserts the emitted JSON-LD parses, is `@type: QAPage`, and its
  `acceptedAnswer` / `upvoteCount` match the fixture; the client suite
  runs with no helmet-provider warnings.

- [ ] **Prerendering for crawlers, `sitemap.xml`, and `robots.txt`.**
  Even with per-route tags (item above), a crawler that does not execute
  JavaScript still receives `client/index.html`'s empty
  `<div id="root">` — the client has no SSR or prerender step, so post
  bodies are invisible to non-JS indexers, and there is no `sitemap.xml`
  or `robots.txt` (`client/public/` holds only `images/` and
  `manifest.json`). Add crawler prerendering (Netlify's built-in
  prerender service, or a build-time pass such as `react-snap` /
  `@prerenderer` over the static routes plus a sample of post URLs) and
  serve a `sitemap.xml` covering every public post and category
  (generated at build, or a small `GET /sitemap.xml` route that streams
  from the collection) plus a `robots.txt` that allows crawling and
  names the sitemap.
  Acceptance: an e2e/integration check fetches a post URL with a non-JS
  user agent (or inspects the prerendered artifact) and asserts the post
  title and body text are in the raw HTML; `sitemap.xml` is valid XML,
  has one `<url>` per seeded post and category, and gains an entry when a
  post is added; `robots.txt` is served with a `Sitemap:` line; the
  existing Playwright suite against the live SPA still passes.

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
