const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');

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

    it('includes a post exactly on the since window boundary', async () => {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const boundaryPost = await Post.create({
        title: 'On the boundary',
        content: 'content',
        user: user._id,
        category: category._id,
        score: 3,
        createdAt: new Date(now - 7 * DAY_MS)
      });

      const res = await request(server).get('/api/posts?feed=top&since=7d');

      const ids = res.body.data.map(p => p._id);
      expect(ids).toContain(boundaryPost._id.toString());
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
