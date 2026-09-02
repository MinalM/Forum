const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');

describe('GET /sitemap.xml and GET /robots.txt', () => {
  let user;
  let category;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5014);
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

  describe('GET /sitemap.xml', () => {
    it('returns valid sitemap XML covering the static routes plus every category', async () => {
      const res = await request(server).get('/sitemap.xml');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/xml/);
      expect(res.text).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
      expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(res.text).toContain('</urlset>');
      expect(res.text).toContain('<loc>http://localhost:3000/</loc>');
      expect(res.text).toContain('<loc>http://localhost:3000/categories</loc>');
      expect(res.text).toContain(`<loc>http://localhost:3000/categories/${category._id}</loc>`);
    });

    it('has exactly one <url> per seeded post and gains an entry when a post is added', async () => {
      const post = await Post.create({
        title: 'First Post',
        content: 'Some content',
        user: user._id,
        category: category._id
      });

      let res = await request(server).get('/sitemap.xml');
      expect(res.text).toContain(`<loc>http://localhost:3000/posts/${post._id}</loc>`);
      expect((res.text.match(/<url>/g) || []).length).toBe(4); // home, categories, 1 category, 1 post

      const secondPost = await Post.create({
        title: 'Second Post',
        content: 'More content',
        user: user._id,
        category: category._id
      });

      res = await request(server).get('/sitemap.xml');
      expect(res.text).toContain(`<loc>http://localhost:3000/posts/${secondPost._id}</loc>`);
      expect((res.text.match(/<url>/g) || []).length).toBe(5);
    });

    it('includes a <lastmod> for a post derived from its updatedAt', async () => {
      const post = await Post.create({
        title: 'Timestamped Post',
        content: 'Some content',
        user: user._id,
        category: category._id
      });

      const res = await request(server).get('/sitemap.xml');
      const expectedLastmod = new Date(post.updatedAt).toISOString();

      expect(res.text).toContain(`<lastmod>${expectedLastmod}</lastmod>`);
    });
  });

  describe('GET /robots.txt', () => {
    it('allows crawling and names the sitemap', async () => {
      const res = await request(server).get('/robots.txt');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toContain('User-agent: *');
      expect(res.text).toContain('Allow: /');
      expect(res.text).toContain('Sitemap: http://localhost:3000/sitemap.xml');
    });
  });
});
