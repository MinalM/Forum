const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const SavedPost = require('../../models/SavedPost');

describe('Saved posts', () => {
  let author, authorToken;
  let category;
  let post;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5013);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    const authorResult = await createTestUser();
    author = authorResult.user;
    authorToken = authorResult.token;

    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });

    post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: author._id,
      category: category._id
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('SavedPost model', () => {
    it('enforces a unique compound index on user + post', async () => {
      // Without this, the check below races mongoose's background
      // createIndexes() call - init() resolves once index builds are done.
      await SavedPost.init();
      const indexes = await SavedPost.collection.getIndexes({ full: true });
      const userPostIndex = indexes.find(
        (idx) => idx.key.user === 1 && idx.key.post === 1
      );

      expect(userPostIndex).toBeDefined();
      expect(userPostIndex.unique).toBe(true);
    });

    it('rejects a duplicate save at the database level', async () => {
      await SavedPost.create({ user: author._id, post: post._id });

      await expect(
        SavedPost.create({ user: author._id, post: post._id })
      ).rejects.toThrow();
    });
  });

  describe('POST /api/posts/:id/save', () => {
    it('saves the post for the current user', async () => {
      const res = await request(server)
        .post(`/api/posts/${post._id}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(true);

      const saved = await SavedPost.findOne({ user: author._id, post: post._id });
      expect(saved).not.toBeNull();
    });

    it('is idempotent when the post is already saved', async () => {
      await request(server)
        .post(`/api/posts/${post._id}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      const res = await request(server)
        .post(`/api/posts/${post._id}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);

      const count = await SavedPost.countDocuments({ user: author._id, post: post._id });
      expect(count).toBe(1);
    });

    it('requires authentication', async () => {
      const res = await request(server).post(`/api/posts/${post._id}/save`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for a non-existent post', async () => {
      const res = await request(server)
        .post(`/api/posts/${new mongoose.Types.ObjectId()}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/posts/:id/save', () => {
    it('unsaves the post for the current user', async () => {
      await SavedPost.create({ user: author._id, post: post._id });

      const res = await request(server)
        .delete(`/api/posts/${post._id}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(false);

      const saved = await SavedPost.findOne({ user: author._id, post: post._id });
      expect(saved).toBeNull();
    });

    it('is idempotent when the post was never saved', async () => {
      const res = await request(server)
        .delete(`/api/posts/${post._id}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(server).delete(`/api/posts/${post._id}/save`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/posts/:id/save', () => {
    it('reports saved status for the current user', async () => {
      await SavedPost.create({ user: author._id, post: post._id });

      const res = await request(server)
        .get(`/api/posts/${post._id}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(true);
    });

    it('reports unsaved status for another user', async () => {
      const other = await createTestUser();

      const res = await request(server)
        .get(`/api/posts/${post._id}/save`)
        .set('Authorization', `Bearer ${other.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(server).get(`/api/posts/${post._id}/save`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for a non-existent post', async () => {
      const res = await request(server)
        .get(`/api/posts/${new mongoose.Types.ObjectId()}/save`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/saved-posts', () => {
    it("lists only the current user's saved posts, newest first", async () => {
      const other = await createTestUser();
      const otherPost = await Post.create({
        title: 'Other post',
        content: 'Other content',
        user: other.user._id,
        category: category._id
      });

      const firstSaved = await Post.create({
        title: 'First saved',
        content: 'content',
        user: author._id,
        category: category._id
      });
      await SavedPost.create({ user: author._id, post: firstSaved._id });
      await SavedPost.create({ user: author._id, post: post._id });
      // Saved by another user only - must not leak into author's list.
      await SavedPost.create({ user: other.user._id, post: otherPost._id });

      const res = await request(server)
        .get('/api/saved-posts')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      // Newest saved first.
      expect(res.body.data[0].post._id).toBe(post._id.toString());
      expect(res.body.data[1].post._id).toBe(firstSaved._id.toString());

      const leaked = res.body.data.some(
        (saved) => saved.post._id === otherPost._id.toString()
      );
      expect(leaked).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(server).get('/api/saved-posts');
      expect(res.status).toBe(401);
    });

    it("includes isLocked so the client can derive the post's status badge", async () => {
      await post.updateOne({ isLocked: true });
      await SavedPost.create({ user: author._id, post: post._id });

      const res = await request(server)
        .get('/api/saved-posts')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].post.isLocked).toBe(true);
    });
  });
});
