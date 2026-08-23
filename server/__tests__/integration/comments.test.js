const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

describe('Comments API', () => {
  let token;
  let user;
  let adminToken;
  let admin;
  let category;
  let post;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5003);
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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Get Comments', () => {
    beforeEach(async () => {
      await Comment.create([
        {
          content: 'Test comment 1',
          user: user._id,
          post: post._id
        },
        {
          content: 'Test comment 2',
          user: user._id,
          post: post._id
        }
      ]);
    });

    it('should get all comments for a post', async () => {
      const res = await request(server).get(`/api/posts/${post._id}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should get single comment', async () => {
      // Debug log test setup
      console.log('Test user:', user._id);
      console.log('Test post:', post._id);

      const comment = await Comment.create({
        content: 'Test comment',
        user: user._id,
        post: post._id
      });

      console.log('Created comment:', {
        id: comment._id,
        content: comment.content,
        user: comment.user,
        post: comment.post
      });

      const savedComment = await Comment.findById(comment._id);
      console.log('Saved comment:', savedComment);

      const res = await request(server).get(`/api/comments/${comment._id}`);

      console.log('Response:', {
        status: res.status,
        body: res.body,
        error: res.error
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Test comment');
    });
  });

  describe('Add Comment', () => {
    it('should add a comment to post', async () => {
      const res = await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'New test comment'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('New test comment');
      expect(res.body.data.user.toString()).toBe(user._id.toString());
      expect(res.body.data.post.toString()).toBe(post._id.toString());
    });

    it('should not add comment without authentication', async () => {
      const res = await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .send({
          content: 'New test comment'
        });

      expect(res.status).toBe(401);
    });

    it('should not add comment to non-existent post', async () => {
      const res = await request(server)
        .post(`/api/posts/${new mongoose.Types.ObjectId()}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'New test comment'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Update Comment', () => {
    let comment;

    beforeEach(async () => {
      comment = await Comment.create({
        content: 'Test comment',
        user: user._id,
        post: post._id
      });
    });

    it('should update own comment', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Updated comment'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Updated comment');
    });

    it('should not update comment without authentication', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}`)
        .send({
          content: 'Updated comment'
        });

      expect(res.status).toBe(401);
    });

    it('should not update another user\'s comment', async () => {
      const otherUserResult = await createTestUser();
      const otherToken = otherUserResult.token;

      const res = await request(server)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          content: 'Updated comment'
        });

      expect(res.status).toBe(401);
    });

    it('should allow admin to update any comment', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Admin updated comment'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Admin updated comment');
    });
  });

  describe('Comment Voting', () => {
    let comment;

    beforeEach(async () => {
      comment = await Comment.create({
        content: 'Test comment',
        user: user._id,
        post: post._id
      });
    });

    it('should upvote a comment', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).toContain(user._id.toString());
    });

    it('should remove upvote when upvoting again', async () => {
      await request(server)
        .put(`/api/comments/${comment._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/comments/${comment._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).not.toContain(user._id.toString());
    });

    it('should remove downvote when upvoting', async () => {
      await request(server)
        .put(`/api/comments/${comment._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/comments/${comment._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).toContain(user._id.toString());
      expect(res.body.data.downvotes).not.toContain(user._id.toString());
    });
  });

  describe('Mark Comment as Answer', () => {
    let comment;

    beforeEach(async () => {
      comment = await Comment.create({
        content: 'Test comment',
        user: user._id,
        post: post._id
      });
    });

    it('should mark comment as answer by post owner', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}/answer`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isAnswer).toBe(true);

      const updatedPost = await Post.findById(post._id);
      expect(updatedPost.isSolved).toBe(true);
    });

    it('should not allow non-post owner to mark as answer', async () => {
      const otherUserResult = await createTestUser();
      const otherToken = otherUserResult.token;

      const res = await request(server)
        .put(`/api/comments/${comment._id}/answer`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(401);
    });

    it('should allow admin to mark as answer', async () => {
      const res = await request(server)
        .put(`/api/comments/${comment._id}/answer`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isAnswer).toBe(true);
    });

    it('should revert the post to unsolved when un-accepting the answer', async () => {
      await request(server)
        .put(`/api/comments/${comment._id}/answer`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/comments/${comment._id}/answer`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isAnswer).toBe(false);

      const updatedPost = await Post.findById(post._id);
      expect(updatedPost.isSolved).toBe(false);
    });

    it('should un-accept the previous answer when a new one is accepted', async () => {
      const otherComment = await Comment.create({
        content: 'Another comment',
        user: user._id,
        post: post._id
      });

      await request(server)
        .put(`/api/comments/${comment._id}/answer`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/comments/${otherComment._id}/answer`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isAnswer).toBe(true);

      const previouslyAccepted = await Comment.findById(comment._id);
      expect(previouslyAccepted.isAnswer).toBe(false);

      const updatedPost = await Post.findById(post._id);
      expect(updatedPost.isSolved).toBe(true);
    });
  });

  describe('Comment Replies', () => {
    let parentComment;

    beforeEach(async () => {
      parentComment = await Comment.create({
        content: 'Parent comment',
        user: user._id,
        post: post._id
      });
    });

    it('should add reply to comment', async () => {
      const res = await request(server)
        .post(`/api/comments/${parentComment._id}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Reply comment'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('Reply comment');
      expect(res.body.data.parentComment.toString()).toBe(parentComment._id.toString());
    });

    it('should get replies for a comment', async () => {
      await Comment.create([
        {
          content: 'Reply 1',
          user: user._id,
          post: post._id,
          parentComment: parentComment._id
        },
        {
          content: 'Reply 2',
          user: user._id,
          post: post._id,
          parentComment: parentComment._id
        }
      ]);

      const res = await request(server)
        .get(`/api/comments/${parentComment._id}/replies`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });
  });
});