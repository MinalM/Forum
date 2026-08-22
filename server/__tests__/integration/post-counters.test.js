const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

describe('Denormalised Post commentCount/score', () => {
  let token;
  let user;
  let category;
  let post;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5008);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    const userResult = await createTestUser();
    user = userResult.user;
    token = userResult.token;

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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('commentCount', () => {
    it('starts at 0 for a new post', () => {
      expect(post.commentCount).toBe(0);
    });

    it('increments when a comment is added', async () => {
      await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'An answer' });

      const updated = await Post.findById(post._id);
      expect(updated.commentCount).toBe(1);
    });

    it('increments when a reply is added', async () => {
      const comment = await Comment.create({
        content: 'Parent comment',
        user: user._id,
        post: post._id
      });

      await request(server)
        .post(`/api/comments/${comment._id}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'A reply' });

      const updated = await Post.findById(post._id);
      expect(updated.commentCount).toBe(1);
    });

    it('decrements when a comment is deleted', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        user: user._id,
        post: post._id
      });
      await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });

      await request(server)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${token}`);

      const updated = await Post.findById(post._id);
      expect(updated.commentCount).toBe(0);
    });

    it('survives a post fetch', async () => {
      await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'An answer' });

      const res = await request(server).get(`/api/posts/${post._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.commentCount).toBe(1);
    });
  });

  describe('score', () => {
    it('starts at 0 for a new post', () => {
      expect(post.score).toBe(0);
    });

    it('moves to 1 on upvote', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(1);
    });

    it('moves to -1 on downvote', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(-1);
    });

    it('returns to 0 when a vote is retracted', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(0);
    });

    it('moves from -1 to 1 when a downvote is switched to an upvote', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(1);
    });

    it('survives a post fetch', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server).get(`/api/posts/${post._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(1);
    });
  });
});
