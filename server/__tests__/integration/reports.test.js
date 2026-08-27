const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

describe('Reports', () => {
  let asker, reporter, reporterToken, admin, adminToken;
  let category, post, comment;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5012);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    const askerResult = await createTestUser();
    asker = askerResult.user;

    const reporterResult = await createTestUser();
    reporter = reporterResult.user;
    reporterToken = reporterResult.token;

    const adminResult = await createTestAdmin();
    admin = adminResult.user;
    adminToken = adminResult.token;

    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });

    post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: asker._id,
      category: category._id,
      upvotes: [reporter._id]
    });

    comment = await Comment.create({
      content: 'Test comment',
      user: asker._id,
      post: post._id,
      upvotes: [reporter._id]
    });

    await request(server)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({ type: 'post', postId: post._id, reason: 'Spam' });

    await request(server)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({ type: 'comment', commentId: comment._id, reason: 'Spam' });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // Regression test: getReports/getReport populate `post`/`comment` with a
  // `select` that excludes upvotes/downvotes. Post.voteCount and
  // Comment.voteCount are virtuals computed from those arrays and run on
  // every JSON serialization, so an unguarded getter throws here and the
  // response never makes it back to the client.
  it('does not crash listing reports whose populated post/comment select excludes upvotes/downvotes', async () => {
    const res = await request(server)
      .get('/api/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    const postReport = res.body.data.find(r => r.type === 'post');
    const commentReport = res.body.data.find(r => r.type === 'comment');
    expect(postReport.post.title).toBe('Test Post');
    expect(commentReport.comment.content).toBe('Test comment');
  });

  it('does not crash fetching a single report whose populated post/comment select excludes upvotes/downvotes', async () => {
    const listRes = await request(server)
      .get('/api/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    const postReportId = listRes.body.data.find(r => r.type === 'post')._id;

    const res = await request(server)
      .get(`/api/reports/${postReportId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.post.title).toBe('Test Post');
  });
});
