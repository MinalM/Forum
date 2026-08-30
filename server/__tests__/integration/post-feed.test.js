const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

describe('GET /api/posts feed parameter', () => {
  let user;
  let category;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5009);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    const userResult = await createTestUser();
    user = userResult.user;

    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('default / feed=recent', () => {
    let older, newer;

    beforeEach(async () => {
      older = await Post.create({
        title: 'Older Post',
        content: 'Older content',
        user: user._id,
        category: category._id,
        createdAt: new Date('2026-01-01')
      });
      newer = await Post.create({
        title: 'Newer Post',
        content: 'Newer content',
        user: user._id,
        category: category._id,
        createdAt: new Date('2026-06-01')
      });
    });

    it('defaults to newest first when feed is omitted', async () => {
      const res = await request(server).get('/api/posts');

      expect(res.status).toBe(200);
      expect(res.body.data[0]._id).toBe(newer._id.toString());
      expect(res.body.data[1]._id).toBe(older._id.toString());
    });

    it('behaves the same explicitly as feed=recent', async () => {
      const res = await request(server).get('/api/posts?feed=recent');

      expect(res.status).toBe(200);
      expect(res.body.data[0]._id).toBe(newer._id.toString());
      expect(res.body.data[1]._id).toBe(older._id.toString());
    });

    it('falls back to recent behaviour for an invalid feed value', async () => {
      const res = await request(server).get('/api/posts?feed=bogus');

      expect(res.status).toBe(200);
      expect(res.body.data[0]._id).toBe(newer._id.toString());
      expect(res.body.data[1]._id).toBe(older._id.toString());
    });
  });

  describe('feed=unanswered', () => {
    let unansweredOld, unansweredNew, answered;

    beforeEach(async () => {
      unansweredOld = await Post.create({
        title: 'Unanswered Old',
        content: 'content',
        user: user._id,
        category: category._id,
        commentCount: 0,
        createdAt: new Date('2026-01-01')
      });
      unansweredNew = await Post.create({
        title: 'Unanswered New',
        content: 'content',
        user: user._id,
        category: category._id,
        commentCount: 0,
        createdAt: new Date('2026-03-01')
      });
      answered = await Post.create({
        title: 'Answered',
        content: 'content',
        user: user._id,
        category: category._id,
        commentCount: 2,
        createdAt: new Date('2026-02-01')
      });
      // The "unanswered" set is resolved against real Comment documents
      // (see server/utils/postCounters.js), not the commentCount field
      // above, so this post needs actual comments to be excluded.
      await Comment.create({ content: 'First answer', user: user._id, post: answered._id });
      await Comment.create({ content: 'Second answer', user: user._id, post: answered._id });
    });

    it('filters to posts with no comments, oldest first', async () => {
      const res = await request(server).get('/api/posts?feed=unanswered');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.map(p => p._id)).toEqual([
        unansweredOld._id.toString(),
        unansweredNew._id.toString()
      ]);
      const ids = res.body.data.map(p => p._id);
      expect(ids).not.toContain(answered._id.toString());
    });

    it('interacts with pagination', async () => {
      const res = await request(server).get('/api/posts?feed=unanswered&limit=1&page=2');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(unansweredNew._id.toString());
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('returns the total unanswered count in the envelope regardless of the active feed', async () => {
      const res = await request(server).get('/api/posts?feed=recent');

      expect(res.status).toBe(200);
      expect(res.body.unansweredCount).toBe(2);
    });
  });

  // BACKLOG.md: "The 'Unanswered' feed tab returns zero posts in
  // production ... `?feed=unanswered` returns {"count":0,...}, while
  // `?feed=recent&limit=50` on the same live data returns 31 posts, every
  // one with `commentCount:0`". scripts/seed-mongo.js and
  // scripts/generate-seed.js write posts via the raw MongoDB driver
  // (`db.posts.insertMany`), bypassing the Post model — so `commentCount`
  // never gets its schema default and is simply absent from the stored
  // document, not literally 0. `Post.find({ commentCount: 0 })` only
  // matches an explicit 0, so it silently drops these posts. Reproduce
  // that here with a fixture inserted the same way, not via Post.create.
  describe('feed=unanswered against posts seeded outside Mongoose', () => {
    async function insertRawPost(overrides = {}) {
      const { insertedId } = await Post.collection.insertOne({
        title: 'Raw seeded post',
        slug: `raw-seeded-post-${new mongoose.Types.ObjectId()}`,
        content: 'content',
        user: user._id,
        category: category._id,
        createdAt: new Date('2026-01-01'),
        ...overrides
      });
      return insertedId;
    }

    it('reproduces feed=unanswered wrongly returning nothing for a raw-inserted post with no commentCount field', async () => {
      const rawId = await insertRawPost();

      // Confirms the raw insert actually reproduces the missing-field
      // shape (a plain `{ commentCount: 0 }` match would find nothing).
      const stored = await Post.collection.findOne({ _id: rawId });
      expect(Object.prototype.hasOwnProperty.call(stored, 'commentCount')).toBe(false);

      const res = await request(server).get('/api/posts?feed=unanswered');

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).toContain(rawId.toString());
    });

    it('counts a raw-inserted, actually-unanswered post in unansweredCount too', async () => {
      await insertRawPost();

      const res = await request(server).get('/api/posts?feed=recent');

      expect(res.status).toBe(200);
      expect(res.body.unansweredCount).toBe(1);
    });

    it('excludes a raw-inserted post that genuinely has comments, even with commentCount missing', async () => {
      const rawId = await insertRawPost();
      await Comment.create({ content: 'A real answer', user: user._id, post: rawId });

      const res = await request(server).get('/api/posts?feed=unanswered');

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).not.toContain(rawId.toString());
      expect(res.body.unansweredCount).toBe(0);
    });

    it('excludes a post whose stored commentCount is stale/wrong but genuinely has comments', async () => {
      // e.g. a post created through the app whose counter later drifted —
      // covered separately by scripts/backfill-post-counters.js, but the
      // unanswered feed itself must not trust the stale field either.
      const staleAnswered = await Post.create({
        title: 'Stale but answered',
        content: 'content',
        user: user._id,
        category: category._id,
        commentCount: 0,
        createdAt: new Date('2026-01-01')
      });
      await Comment.create({ content: 'A real answer', user: user._id, post: staleAnswered._id });

      const res = await request(server).get('/api/posts?feed=unanswered');

      expect(res.body.data.map(p => p._id)).not.toContain(staleAnswered._id.toString());
    });
  });

  describe('feed=top', () => {
    let inWindowLow, inWindowHigh, outsideWindow;

    beforeEach(async () => {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      inWindowLow = await Post.create({
        title: 'In window, low score',
        content: 'content',
        user: user._id,
        category: category._id,
        score: 1,
        createdAt: new Date(now - 2 * DAY_MS)
      });
      inWindowHigh = await Post.create({
        title: 'In window, high score',
        content: 'content',
        user: user._id,
        category: category._id,
        score: 5,
        createdAt: new Date(now - 1 * DAY_MS)
      });
      outsideWindow = await Post.create({
        title: 'Outside window',
        content: 'content',
        user: user._id,
        category: category._id,
        score: 100,
        createdAt: new Date(now - 10 * DAY_MS)
      });
    });

    it('ranks by score descending within the since window', async () => {
      const res = await request(server).get('/api/posts?feed=top&since=7d');

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).toEqual([
        inWindowHigh._id.toString(),
        inWindowLow._id.toString()
      ]);
      const ids = res.body.data.map(p => p._id);
      expect(ids).not.toContain(outsideWindow._id.toString());
    });

    it('includes a post just inside the since window boundary', async () => {
      // A few seconds of slack rather than an exact millisecond boundary —
      // the server computes its own $gte cutoff from Date.now() at request
      // time, a moment after this test computes `now`, so an exact-boundary
      // post would flake by falling just outside the server's cutoff.
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const justInsidePost = await Post.create({
        title: 'Just inside the boundary',
        content: 'content',
        user: user._id,
        category: category._id,
        score: 3,
        createdAt: new Date(now - 7 * DAY_MS + 60 * 1000)
      });
      const justOutsidePost = await Post.create({
        title: 'Just outside the boundary',
        content: 'content',
        user: user._id,
        category: category._id,
        score: 3,
        createdAt: new Date(now - 7 * DAY_MS - 60 * 1000)
      });

      const res = await request(server).get('/api/posts?feed=top&since=7d');

      const ids = res.body.data.map(p => p._id);
      expect(ids).toContain(justInsidePost._id.toString());
      expect(ids).not.toContain(justOutsidePost._id.toString());
    });

    it('defaults the window to 7 days when since is omitted', async () => {
      const res = await request(server).get('/api/posts?feed=top');

      const ids = res.body.data.map(p => p._id);
      expect(ids).toContain(inWindowHigh._id.toString());
      expect(ids).not.toContain(outsideWindow._id.toString());
    });
  });

  describe('unaffected callers', () => {
    it('still honours sort/page/limit/search when feed is not passed', async () => {
      await Post.create([
        { title: 'Alpha', content: 'x', user: user._id, category: category._id },
        { title: 'Beta', content: 'y', user: user._id, category: category._id }
      ]);

      const res = await request(server).get('/api/posts?sort=title&limit=1&page=1');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Alpha');
    });
  });
});
