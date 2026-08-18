const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');

describe('Additional Post Operations', () => {
  let token;
  let user;
  let adminToken;
  let admin;
  let category;
  let post;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5006);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    const userResult = await createTestUser();
    user = userResult.user;
    token = userResult.token;

    const adminResult = await createTestAdmin();
    admin = adminResult.user;
    adminToken = adminResult.token;

    // Create test category
    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });

    // Create test post
    post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      aiMlLevel: 'beginner'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Get Single Post', () => {
    it('should get a single post by ID', async () => {
      const res = await request(server).get(`/api/posts/${post._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(post._id.toString());
      expect(res.body.data.title).toBe(post.title);
      expect(res.body.data.views).toBe(1); // Should increment view count
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(server).get(`/api/posts/${new mongoose.Types.ObjectId()}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should get a post with an oversized tag (pre-existing data) without failing on the view-count save', async () => {
      // Bypass write-path validators to simulate a row seeded before tag
      // length enforcement existed, matching what's currently in production.
      post.tags = ['a'.repeat(31)];
      await post.save({ validateBeforeSave: false });

      const res = await request(server).get(`/api/posts/${post._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(post._id.toString());
      expect(res.body.data.views).toBe(1);
    });
  });

  describe('Post Downvoting', () => {
    it('should downvote a post', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).toContain(user._id.toString());
    });

    it('should remove downvote when downvoting again', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).not.toContain(user._id.toString());
    });

    it('should remove upvote when downvoting', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).toContain(user._id.toString());
      expect(res.body.data.upvotes).not.toContain(user._id.toString());
    });

    it('should not allow downvoting without authentication', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/downvote`);

      expect(res.status).toBe(401);
    });
  });

  describe('Mark Post as Solved', () => {
    it('should mark post as solved by post owner', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/solve`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isSolved).toBe(true);
    });

    it('should toggle solved status when called again', async () => {
      // First mark as solved
      await request(server)
        .put(`/api/posts/${post._id}/solve`)
        .set('Authorization', `Bearer ${token}`);

      // Then toggle back to unsolved
      const res = await request(server)
        .put(`/api/posts/${post._id}/solve`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isSolved).toBe(false);
    });

    it('should not allow non-owner to mark as solved', async () => {
      const otherUserResult = await createTestUser();
      const otherToken = otherUserResult.token;

      const res = await request(server)
        .put(`/api/posts/${post._id}/solve`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(401);
    });

    it('should allow admin to mark any post as solved', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/solve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isSolved).toBe(true);
    });
  });
});
