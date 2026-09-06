const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

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

    // BACKLOG.md: "The Unanswered feed tab returns zero posts in
    // production, and every post shows the 'Needs an answer' badge" —
    // production posts can have a `commentCount` that disagrees with their
    // actual comments (drifted, or never written at all for posts inserted
    // outside the Post model). A single-post fetch must never hand the
    // client a commentCount/score that disagrees with the comments/votes it
    // returns alongside it, and should correct the stored drift so later
    // requests (including a feed listing) see the fix too.
    it('self-heals a drifted commentCount/score to match its real comments and votes', async () => {
      await Comment.create({ content: 'An answer', user: user._id, post: post._id });
      await Comment.create({ content: 'Another answer', user: user._id, post: post._id });
      post.commentCount = 999;
      post.score = 999;
      post.upvotes = [user._id];
      await post.save({ validateBeforeSave: false });

      const res = await request(server).get(`/api/posts/${post._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.commentCount).toBe(2);
      expect(res.body.data.comments.length).toBe(2);
      expect(res.body.data.score).toBe(1);

      const stored = await Post.findById(post._id);
      expect(stored.commentCount).toBe(2);
      expect(stored.score).toBe(1);
    });

    it('self-heals a commentCount missing entirely, as for a post written outside the Post model', async () => {
      // Mirrors how scripts/seed-mongo.js / scripts/generate-seed.js write
      // posts in production: a raw driver insert, bypassing Mongoose (and
      // so the commentCount/score schema defaults) entirely.
      const { insertedId } = await Post.collection.insertOne({
        title: 'Raw seeded post',
        slug: `raw-seeded-post-${new mongoose.Types.ObjectId()}`,
        content: 'content',
        user: user._id,
        category: category._id,
        createdAt: new Date()
      });
      await Comment.create({ content: 'A real answer', user: user._id, post: insertedId });

      const res = await request(server).get(`/api/posts/${insertedId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.commentCount).toBe(1);
      expect(res.body.data.comments.length).toBe(1);

      const stored = await Post.findById(insertedId);
      expect(stored.commentCount).toBe(1);
    });

    it('leaves an already-accurate commentCount/score untouched', async () => {
      await Comment.create({ content: 'An answer', user: user._id, post: post._id });
      post.commentCount = 1;
      await post.save({ validateBeforeSave: false });

      const res = await request(server).get(`/api/posts/${post._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.commentCount).toBe(1);
      const stored = await Post.findById(post._id);
      expect(stored.commentCount).toBe(1);
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

  // BACKLOG.md: pinPost/lockThread were exported from the controller but
  // never mounted in server/routes/posts.js, so PUT .../pin and .../lock
  // 404'd for every caller, including the moderation buttons in
  // PostDetail.js. These routes are now mounted; these tests exercise them
  // end to end for the first time.
  describe('Pin Post (Moderator/Admin only)', () => {
    it('should pin a post as admin', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(true);
    });

    it('should toggle pinned status when called again', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(false);
    });

    it('should not allow a regular user to pin a post', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);

      const unchanged = await Post.findById(post._id);
      expect(unchanged.isPinned).toBe(false);
    });

    it('should not allow pinning without authentication', async () => {
      const res = await request(server).put(`/api/posts/${post._id}/pin`);

      expect(res.status).toBe(401);
    });
  });

  describe('Lock Thread (Moderator/Admin only)', () => {
    it('should lock a thread as admin', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isLocked).toBe(true);
    });

    it('should toggle locked status when called again', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isLocked).toBe(false);
    });

    it('should not allow a regular user to lock a thread', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/lock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);

      const unchanged = await Post.findById(post._id);
      expect(unchanged.isLocked).toBe(false);
    });

    it('should not allow locking without authentication', async () => {
      const res = await request(server).put(`/api/posts/${post._id}/lock`);

      expect(res.status).toBe(401);
    });
  });

  // BACKLOG.md: upvotePost/downvotePost/pinPost/lockThread persisted via
  // post.save(), which full-document-validates every field including
  // `tags` - so any post whose stored tags predate the #33 length/count
  // caps 400'd on vote/pin/lock, exactly as previously found for
  // markAsAnswer. All four now persist via a targeted findByIdAndUpdate,
  // matching the fix already applied to markAsAnswer for isSolved.
  describe('Voting and moderation on a post with pre-existing oversized tags', () => {
    beforeEach(async () => {
      // Bypass write-path validators to simulate a row seeded before tag
      // length enforcement existed, matching what's currently in production.
      post.tags = ['a'.repeat(31)];
      await post.save({ validateBeforeSave: false });
    });

    it('upvotes without 400ing on the legacy tag', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).toContain(user._id.toString());
    });

    it('downvotes without 400ing on the legacy tag', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).toContain(user._id.toString());
    });

    it('pins without 400ing on the legacy tag', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(true);
    });

    it('locks without 400ing on the legacy tag', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isLocked).toBe(true);
    });
  });
});
