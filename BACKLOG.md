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

Re-verified 2026-09-01 against a **local** run of the stack, logged in as
`admin@example.com`, at 1280px and 375px. The deployed site stays unreachable
from the agent sandbox (its egress policy 403s the Netlify host), so everything
below was re-measured locally instead; where a local number differs from the
original live one, the local number is noted inline.

Running the stack locally is possible but not obvious — the Docker daemon is
not started in the sandbox, Docker Hub's blob CDN is 403 so `mongo:6.0` must be
pulled from `mirror.gcr.io/library/mongo:6.0` and retagged, and
`mongodb-memory-server` cannot fetch its binary. Once up, `npm run seed` creates
`admin@example.com` / `password123`. Worth capturing as a project run-skill.

One caveat for anyone reviewing screenshots from that rig: the Font Awesome CDN
is blocked too, so every `<i class="fas fa-*">` icon renders blank locally.
Icon-only controls therefore look like unlabelled coloured squares in local
screenshots — that is the sandbox, not the product.

- [x] **The thread page and the feed disagree about "Needs an answer", and
  the thread's version is wrong on any post that already has answers.**
  Done in #94: added `client/src/utils/postStatus.js` as the single source
  of truth (`solved` / `needs-answer` / `null`, `null` covering both "has
  answers but unsolved" and "locked and unsolved"), and switched both
  `PostItem` and `PostDetail` to derive their badge from it instead of two
  independent expressions.
  Confirmed on the local stack 2026-09-01, logged in as admin. The seeded post
  "Online Courses for NLP Specialization" has one answer and `isSolved: false`.
  On the home feed its card renders badges `["Advanced","nlp","courses",
  "transformers","llm"]` — no status badge at all, and no
  `post-card--needs-answer` class. Open that same post and the thread renders
  `Needs an answer` in the status row, directly above the answer that already
  exists. Same post, same instant, two contradictory answers to "does this
  need an answer?". The two surfaces compute the badge from different things:
  `client/src/components/posts/PostItem.js:74` uses
  `!isSolved && commentCount === 0`, so a feed card only claims a post needs
  an answer when nobody has replied; `client/src/pages/PostDetail.js:428-432`
  renders `post.isSolved ? "Solved" : "Needs an answer"` with no reference to
  the answer count at all. So an unsolved post with seven answers shows no
  badge in the feed and a loud amber "Needs an answer" on its own thread —
  directly under the seven answers contradicting it. It also mislabels posts
  that are not questions (a Project Showcase entry, a resource list) and posts
  that are `isLocked`, where answering is impossible by design.
  This is distinct from the accept-answer 400 above, and outlives it: fixing
  that bug makes accept flip the badge on posts with clean tags, but does not
  make the badge mean the same thing on both surfaces. #79 fixed exactly this
  mismatch on the feed side and did not touch `PostDetail`.
  Scope: client-only, `PostDetail.js` plus whatever shared helper the two
  surfaces end up using. Give the badge one definition used by both — derive
  it once (a small exported helper, or a `needsAnswer` field the API already
  has the data to compute) rather than duplicating the expression a third
  time. Suggested semantics, but confirm against the product intent before
  building: `Solved` when `isSolved`; `Needs an answer` only when unsolved
  **and** there are no answers **and** the post is not locked; for an
  unsolved post that does have answers, either a quieter "No accepted answer"
  or no badge at all — do not leave two different amber states meaning
  different things.
  Note for the implementer: `client/src/pages/__tests__/PostDetail.test.js`
  currently asserts the buggy behaviour at lines 321, 345 and 381 (it expects
  "Needs an answer" on threads that have comments), so those assertions must
  be updated as part of the fix rather than worked around.
  Acceptance: a shared helper (or single source) is used by both `PostItem`
  and `PostDetail` — a test asserts the same post object produces the same
  badge state through both components; component tests cover the four cases
  (solved; unsolved with no answers; unsolved with answers; locked and
  unsolved) on both surfaces; the three `PostDetail.test.js` assertions above
  are updated to the corrected behaviour; existing accept-answer tests still
  pass.

- [x] **The signed-in navbar is overcrowded and has no visual
  hierarchy.** Done in #95: cut the top-level nav from ten items to at
  most six (brand · search · Home · Categories · a visually distinct
  "Create" button · notification bell · one user menu covering
  Dashboard/Saved/Profile/Logout · for staff, one "Admin" menu merging the
  old separate Admin + Moderator destinations). Dropdown contents are now
  conditionally rendered in JSX (genuinely unmounted until opened) instead
  of always sitting in the DOM with no CSS to hide them — there was no
  `.dropdown-menu`/`.dropdown-item` styling anywhere in the client before
  this PR added it. All new interactive controls meet the 44×44 touch
  target minimum unconditionally.

- [x] **The post-detail header and action row are dense, noisy, and
  overflow on mobile.** Done in #96: split the action row into reader
  actions (vote, Save, Notify) shown inline and author/moderator actions
  (Edit, Delete, Lock, Pin, Report) collapsed behind one quiet "More
  actions" toggle, all sharing one consistent style instead of four alert
  colours; moved the Pinned/Locked/Solved/Needs-an-answer badges out of the
  `<h1>` (which would otherwise leak into its accessible name) onto a
  `.post-title-row` alongside the title so they wrap onto the title's line
  instead of a separate full-width band; gave the answer-sort control
  ("Most helpful"/"Newest") its own bordered `.answers-toolbar`, separated
  from the comment composer's submit button it previously sat flush
  against.
  Measured logged in as admin on
  `/posts/6925386a…`: above the post body the page stacks five
  full-width bands — status badge, title, meta (author · category · date
  · views), a row of tag chips, then a **nine-button action row** (`↑/↓`
  vote, "Notify me of answers", "Save", "Edit", "Delete", "Lock", "Pin",
  "Report") in **four different colour variants** (`btn-danger`,
  `btn-outline-warning`, `btn-outline-info`, `btn-outline-danger`,
  plain). On desktop that row is one 44px line; at 375px it does not wrap
  cleanly — "Lock", "Pin", "Report" run past the right edge of the
  viewport (the `.post-header` block alone is 236px tall on mobile,
  pushing the body far down). The eight destructive/mod controls have the
  same weight as the two a reader needs.
  Re-measured locally 2026-09-01: the 375px overflow is confirmed and large —
  the thread page reports `scrollWidth` 578 against `clientWidth` 375, a 203px
  overflow, with the offending node identified as one of the `.btn.btn-sm`
  moderation buttons (Lock); `/` and `/dashboard` at the same width are clean,
  so this is specific to the post-detail action row. Two corrections to the
  original note: `Post Comment` now measures 44px, not 34px, so that part is
  already fixed — drop it from the work; but the answer-sort control
  ("Most helpful" / "Newest") sits **0px** below the `Post Comment` button,
  flush against it, so the control that sorts the answer list reads as part of
  the comment composer rather than as a header for the answers below it.
  Separate and label that group as part of this item.
  Scope: `PostDetail.js` / `App.css`, client-only. Split the action row
  into reader actions (vote, Save, Notify) shown inline and
  author/moderator actions (Edit, Delete, Lock, Pin, Report) collapsed
  into a single overflow "⋯" menu; give those buttons one consistent
  quiet style rather than four alert colours; tighten the header to
  title + one meta line + tags; guarantee the header and action area fit
  within 375px with no horizontal overflow; give the answer-sort control
  its own grouping, separated from the composer's submit button.
  Acceptance: a test renders `PostDetail` as the author (and as an
  admin) and asserts the inline action set is just vote/Save/Notify with
  the mod/author actions behind one toggle; a raw-CSS/jsdom check that at
  375px `.post-header` and `.post-actions` produce no element wider than
  the viewport (extend `postMetaOverflow.test.js`'s pattern); all
  post-detail controls assert `min-height >= 44px`; a test asserts the
  answer-sort control is not adjacent to the composer's submit button
  (a grouping/landmark or spacing assertion); existing `PostDetail` tests updated.

- [x] **"Accept this answer" renders as a loud full-size button on every
  comment.** Done in #98: the per-comment accept/unaccept control is now
  an icon-only outline toggle (`.accept-answer-toggle`), quiet gray by
  default and filling in success-green only on hover/focus or once its
  own comment is accepted; comments other than the accepted one get an
  extra `--muted` class once the post is solved. Delete/Report moved into
  their own labelled `.comment-moderation-actions` group, pushed to the
  far side of the row (`margin-left: auto`) so accept and remove no
  longer sit adjacent at equal weight.

- [x] **Comment and post-author avatars are broken images for every user
  on the default avatar.** Done in #99: added `client/src/utils/avatar.js`
  (`getAvatarUrl`) as the single place that normalises an avatar value —
  falsy or the legacy bare `'default-avatar.jpg'` resolve to the real
  `/images/default-avatar1.png` asset, an absolute URL passes through
  unchanged, any other bare filename resolves to `/images/<file>` — used
  by `Profile.js` and `PostDetail.js`'s comment/reply avatars instead of
  the `||` fallback that never fired against a truthy bare filename, with
  an `onError` handler kept as a second line of defense. `User.avatar`'s
  schema default and the Google OAuth no-photo fallback
  (`server/config/passport.js`) now default new accounts to the real
  asset path instead of the bare filename; existing accounts with the old
  value are covered by the client helper with no migration needed.
  `PostItem` and the navbar don't render an avatar and needed no change;
  `PostDetail`'s header text-links the author's name without an avatar
  image since #96, so that surface needed no change either.
  `User.avatar` defaults to the bare string
  `'default-avatar.jpg'` (`server/models/User.js:67`) and the API
  returns it verbatim. `PostDetail.js:594` / `:731` render
  `<img src={comment.user?.avatar || '/images/default-avatar1.png'}>` —
  the stored value is truthy so the `||` fallback never fires, and
  `"default-avatar.jpg"` resolves relative to the current route (e.g.
  `/posts/default-avatar.jpg`) → 404 → a broken-image icon on the post
  author and every comment/reply (visible in the review screenshot; the
  real fallback `client/public/images/default-avatar1.png` exists and is
  never used). Affects effectively every thread.
  Scope: pick one fix and apply it consistently — normalise `avatar` to
  a usable URL (default to `/images/default-avatar1.png`, or resolve a
  bare filename to `/images/<file>` at the API or a client helper),
  and/or add an `onError` fallback to the avatar `<img>`s. Cover
  `PostItem`, `PostDetail` (comments and replies), `Profile`, and the
  navbar user menu if it shows an avatar.
  Acceptance: a model/server test asserts a newly created user's
  `avatar` resolves to an existing asset path (not a bare filename); a
  client test renders a comment whose `user.avatar` is the default and
  asserts the `<img>` `src` is `/images/default-avatar1.png` (or that
  `onError` swaps to it); the Playwright run makes no failed request for
  the default avatar.

- [x] **`SavedPosts.js` has a third, independent copy of the status-badge
  logic.** Done in #100: switched `SavedPosts.js` to the shared
  `getPostStatus` helper (`client/src/utils/postStatus.js`) instead of its
  own inline `isSolved`/`commentCount` expression, and added `isLocked` to
  the `GET /api/saved-posts` payload so the helper has what it needs.
  Discovered while fixing the feed/thread "Needs an answer"
  mismatch above (#94): `client/src/pages/SavedPosts.js:70-74` renders its
  own `saved.post.isSolved ? "Solved" : saved.post.commentCount === 0 ?
  "Needs an answer" : null` inline, instead of using the new
  `client/src/utils/postStatus.js` helper `PostItem` and `PostDetail` now
  share. It also never looks at `isLocked`, so a locked-but-unsolved saved
  post with no comments would still show "Needs an answer" there while
  showing nothing on the feed and thread.
  Scope: client-only. Switch `SavedPosts.js` to `getPostStatus` (fetch or
  default `isLocked` on the saved-post payload if the endpoint doesn't
  already include it).
  Acceptance: a `SavedPosts` test covering the same four cases (solved;
  unsolved with no answers; unsolved with answers; locked and unsolved)
  used for the other two surfaces; existing `SavedPosts` badge tests
  updated if their fixtures change.

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

- [x] **Per-page metadata: description, canonical, Open Graph / Twitter
  tags.** Done in #101 (split from a combined "per-page metadata + QAPage
  structured data" item — the JSON-LD half is the next item below).
  `client/index.html` used to ship one static block of `<meta>`:
  `og:title`/`og:description`/`twitter:*` hard-coded to the generic site
  name and blurb, `og:url` resolving to the site root, and no `og:image`
  at all — so every shared link (a post, a category) unfurled identically
  as "AI/ML Career Forum" and every deep link pointed at `/`. Verified
  live: `/`, `/posts/:id` and `/categories/:id` returned byte-identical OG
  tags. `document.title` was already per-route via `useDocumentTitle`; the
  description and OG tags were not.
  Added `react-helmet-async` (v3, the first version with a React 19 peer
  range) and `client/src/components/common/Seo.js`, a shared component
  rendering `description`/canonical `<link>`/`og:*`/`twitter:*` (plus an
  opt-in `noindex` and an `image` for a large-image Twitter card), driven
  by the post/category/query actually being viewed. Deliberately does not
  touch `<title>` — `useDocumentTitle` keeps sole ownership of
  `document.title` so the two mechanisms don't race. `App.js` renders one
  default `<Seo />` for the site-wide fallback; `Home`, `PostDetail`,
  `CategoryPosts`, `SearchResults`, and `NotFound` each override it
  (`PostDetail` truncates the post body via the existing
  `markdownToPlainText` for its description; `SearchResults` and the
  category/post not-found states are `noindex`). `index.html`'s static
  `description`/`og:*`/`twitter:*` tags were removed — react-helmet-async
  only adds tags, it doesn't clean up ones it didn't render, so leaving
  the static block in place would have left two conflicting `og:title`
  tags in the DOM once React mounted.
  Acceptance: a test per route type (home, post, category, search, 404)
  in `Seo.test.js` and each page's own test file asserts the rendered
  `<head>` carries a route-specific `description` and `og:title`/`og:url`
  rather than the site default; the client suite runs with no
  helmet-provider warnings (react-helmet-async v3's React-19 dispatcher
  doesn't require a `HelmetProvider` ancestor, though `index.js` still
  wraps the app in one).

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

- [x] **`sitemap.xml` and `robots.txt`.** Split off the original
  "Prerendering for crawlers, `sitemap.xml`, and `robots.txt`" item below
  into this slice plus the prerendering item that follows it — the two
  are independent pieces of work (one a small dynamic route, the other a
  build-time crawl integration) and acceptance-testable separately.
  Done in #103: added `GET /sitemap.xml` and `GET /robots.txt` on the
  Express app (`server/src/routes/sitemap.ts`, mounted at the app root
  in `server/src/server.ts`, not under `/api`), generating a valid
  sitemap from the live `Post`/`Category` collections (home, `/categories`,
  every category, every post with a `<lastmod>` from `updatedAt`) plus a
  `robots.txt` allowing crawling and naming the sitemap. Because the
  client (Netlify) and API (Render) are separate domains in production —
  `client/.env.production`'s `REACT_APP_API_URL` names the API host — and
  crawlers fetch `robots.txt`/`sitemap.xml` from the page's own domain,
  `client/netlify.toml` proxies `/sitemap.xml` and `/robots.txt` to the
  Render API ahead of the SPA catch-all redirect, so both stay live at the
  site root and dynamic (no stale build-time file).
  Acceptance: `server/__tests__/integration/sitemap.test.js` covers valid
  XML structure, one `<url>` per seeded post/category with a count that
  grows when a post is added, a correct `<lastmod>`, and `robots.txt`
  content; existing server suite unaffected.

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
