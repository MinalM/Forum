const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

describe('Additional Comment Operations', () => {
  let token;
  let user;
  let adminToken;
  let admin;
  let category;
  let post;
  let comment;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5007);
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

    // Create test category and post
    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });

    post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id
    });

    // Create test comment
    comment = await Comment.create({
      content: 'Test comment',
      user: user._id,
      post: post._id
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Delete Comment', () => {
    it('should delete own comment', async () => {
      const res = await request(server)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment).toBeNull();
    });

    it('should not delete comment without authentication', async () => {
      const res = await request(server)
        .delete(`/api/comments/${comment._id}`);

      expect(res.status).toBe(401);
    });

    it('should not delete another user\'s comment', async () => {
      const otherUserResult = await createTestUser();
      const otherToken = otherUserResult.token;

      const res = await request(server)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(401);
    });

    it('should allow admin to delete any comment', async () => {
      const res = await request(server)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment).toBeNull();
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(server)
        .delete(`/api/comments/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Comment Downvoting', () => {
    it('should downvote a comment', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).toContain(user._id.toString());
    });

    it('should remove downvote when downvoting again', async () => {
      await request(server)
        .put(`/api/comments/${comment._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/comments/${comment._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).not.toContain(user._id.toString());
    });

    it('should remove upvote when downvoting', async () => {
      await request(server)
        .put(`/api/comments/${comment._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/comments/${comment._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).toContain(user._id.toString());
      expect(res.body.data.upvotes).not.toContain(user._id.toString());
    });

    it('should not allow downvoting without authentication', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}/downvote`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(server)
        .put(`/api/comments/${new mongoose.Types.ObjectId()}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
