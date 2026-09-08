const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');

describe('GET /api/feed.xml and GET /api/categories/:id/feed.xml', () => {
  let user;
  let category;
  let otherCategory;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5016);
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

    otherCategory = await Category.create({
      name: 'Other Category',
      description: 'Other Description'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/feed.xml', () => {
    it('returns a valid empty Atom feed when there are no posts', async () => {
      const res = await request(server).get('/api/feed.xml');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/xml/);
      expect(res.text).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
      expect(res.text).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
      expect(res.text).toContain('</feed>');
      expect((res.text.match(/<entry>/g) || []).length).toBe(0);
    });

    it('lists posts newest first with title, author, link, summary and timestamps', async () => {
      const older = await Post.create({
        title: 'Older Post',
        content: 'Some older content here.',
        user: user._id,
        category: category._id
      });
      // Ensure distinct createdAt ordering regardless of clock resolution.
      const newer = await Post.create({
        title: 'Newer Post',
        content: 'Some newer content here.',
        user: user._id,
        category: category._id,
        createdAt: new Date(older.createdAt.getTime() + 1000)
      });

      const res = await request(server).get('/api/feed.xml');

      expect(res.status).toBe(200);
      expect((res.text.match(/<entry>/g) || []).length).toBe(2);

      const newerIndex = res.text.indexOf(newer.title);
      const olderIndex = res.text.indexOf(older.title);
      expect(newerIndex).toBeGreaterThan(-1);
      expect(olderIndex).toBeGreaterThan(-1);
      expect(newerIndex).toBeLessThan(olderIndex);

      expect(res.text).toContain(`<title>${newer.title}</title>`);
      expect(res.text).toContain(`<name>${user.name}</name>`);
      expect(res.text).toContain(`href="http://localhost:3000/posts/${newer._id}"`);
      expect(res.text).toContain('<summary>Some newer content here.</summary>');
      expect(res.text).toContain(`<published>${new Date(newer.createdAt).toISOString()}</published>`);
    });

    it('matches the order of feed=recent for the same posts', async () => {
      await Post.create({ title: 'A', content: 'A content', user: user._id, category: category._id });
      await Post.create({ title: 'B', content: 'B content', user: user._id, category: category._id });
      await Post.create({ title: 'C', content: 'C content', user: user._id, category: category._id });

      const recentRes = await request(server).get('/api/posts?feed=recent&limit=20');
      const feedRes = await request(server).get('/api/feed.xml');

      const recentOrder = recentRes.body.data.map((p) => p.title);
      const feedOrder = [...feedRes.text.matchAll(/<title>([^<]+)<\/title>/g)]
        .map((m) => m[1])
        .filter((title) => title !== 'AI/ML Career Forum — Recent Questions');

      expect(feedOrder).toEqual(recentOrder);
    });

    it('caps the feed at 20 most recent posts', async () => {
      for (let i = 0; i < 25; i++) {
        await Post.create({
          title: `Post ${i}`,
          content: `Content ${i}`,
          user: user._id,
          category: category._id
        });
      }

      const res = await request(server).get('/api/feed.xml');
      expect((res.text.match(/<entry>/g) || []).length).toBe(20);
    });
  });

  describe('GET /api/categories/:id/feed.xml', () => {
    it('only includes posts from the given category', async () => {
      const inCategory = await Post.create({
        title: 'In Category',
        content: 'In category content.',
        user: user._id,
        category: category._id
      });
      await Post.create({
        title: 'In Other Category',
        content: 'In other category content.',
        user: user._id,
        category: otherCategory._id
      });

      const res = await request(server).get(`/api/categories/${category._id}/feed.xml`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/xml/);
      expect((res.text.match(/<entry>/g) || []).length).toBe(1);
      expect(res.text).toContain(inCategory.title);
      expect(res.text).not.toContain('In Other Category');
      expect(res.text).toContain(category.name);
    });

    it('returns 404 for an unknown category id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(server).get(`/api/categories/${fakeId}/feed.xml`);

      expect(res.status).toBe(404);
    });

    it('returns 404 for a malformed category id', async () => {
      const res = await request(server).get('/api/categories/not-a-valid-id/feed.xml');

      expect(res.status).toBe(404);
    });
  });
});
