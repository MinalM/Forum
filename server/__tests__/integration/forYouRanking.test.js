const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

// "For you" relevance ranking (BACKLOG.md item 11) - see
// server/utils/feedRanking.js for the weighted-score formula this exercises
// end to end through GET /api/posts and GET /api/posts/recommended.
describe('For you ranking', () => {
  let category, otherCategory;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5011);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  const tokenFor = (user) =>
    jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

  const createPersonalizedUser = async () =>
    User.create({
      name: 'Personalized User',
      email: `personalized-${Date.now()}@example.com`,
      password: 'password123',
      targetRole: 'Machine Learning Engineer',
      skills: ['python', 'pytorch'],
      aiMlExperience: 'advanced'
    });

  beforeEach(async () => {
    await cleanupTestData();

    category = await Category.create({
      name: 'Machine Learning Fundamentals',
      description: 'ML basics'
    });
    otherCategory = await Category.create({
      name: 'Career Advice',
      description: 'Career talk'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/posts (default/recent feed)', () => {
    let highMatch, mediumMatch, noMatch;

    beforeEach(async () => {
      const { user: author } = await createTestUser();
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      // Oldest, but the strongest relevance match: 2 matching tags, a
      // matching aiMlLevel, and a matching category.
      highMatch = await Post.create({
        title: 'A High relevance post',
        content: 'content',
        user: author._id,
        category: category._id,
        tags: ['python', 'pytorch', 'tensorflow'],
        aiMlLevel: 'advanced',
        createdAt: new Date(now - 3 * DAY_MS)
      });
      // Middling: 1 matching tag, aiMlLevel 'all' always matches, wrong category.
      mediumMatch = await Post.create({
        title: 'B Medium relevance post',
        content: 'content',
        user: author._id,
        category: otherCategory._id,
        tags: ['python'],
        aiMlLevel: 'all',
        createdAt: new Date(now - 2 * DAY_MS)
      });
      // Newest, but no relevance signal at all.
      noMatch = await Post.create({
        title: 'C No relevance post',
        content: 'content',
        user: author._id,
        category: otherCategory._id,
        tags: ['sql'],
        aiMlLevel: 'beginner',
        createdAt: new Date(now - 1 * DAY_MS)
      });
    });

    it('ranks by relevance, overriding recency, for a member with a profile to match', async () => {
      const member = await createPersonalizedUser();
      const token = tokenFor(member);

      const res = await request(server)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).toEqual([
        highMatch._id.toString(),
        mediumMatch._id.toString(),
        noMatch._id.toString()
      ]);
    });

    it('falls back to recency for a signed-in member with no skills/targetRole set (cold start)', async () => {
      const { token } = await createTestUser();

      const res = await request(server)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).toEqual([
        noMatch._id.toString(),
        mediumMatch._id.toString(),
        highMatch._id.toString()
      ]);
    });

    it('falls back to recency for an anonymous request', async () => {
      const res = await request(server).get('/api/posts');

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).toEqual([
        noMatch._id.toString(),
        mediumMatch._id.toString(),
        highMatch._id.toString()
      ]);
    });

    it('does not override an explicit sort even for a personalized member', async () => {
      const member = await createPersonalizedUser();
      const token = tokenFor(member);

      const res = await request(server)
        .get('/api/posts?sort=title')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).toEqual([
        highMatch._id.toString(),
        mediumMatch._id.toString(),
        noMatch._id.toString()
      ]);
    });

    it('does not personalize a search request', async () => {
      const member = await createPersonalizedUser();
      const token = tokenFor(member);

      const res = await request(server)
        .get('/api/posts?search=relevance')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Search's own regex relevance takes over - all three match "relevance"
      // in their title, newest first (the un-personalized default sort).
      expect(res.body.data.map(p => p._id)).toEqual([
        noMatch._id.toString(),
        mediumMatch._id.toString(),
        highMatch._id.toString()
      ]);
    });

    it('does not personalize feed=unanswered', async () => {
      const member = await createPersonalizedUser();
      const token = tokenFor(member);

      const res = await request(server)
        .get('/api/posts?feed=unanswered')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // All three posts are unanswered (commentCount defaults to 0) -
      // still oldest first regardless of relevance.
      expect(res.body.data.map(p => p._id)).toEqual([
        highMatch._id.toString(),
        mediumMatch._id.toString(),
        noMatch._id.toString()
      ]);
    });
  });

  describe('GET /api/posts/recommended', () => {
    let matching, nonMatching, answered;

    beforeEach(async () => {
      const { user: author } = await createTestUser();
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      matching = await Post.create({
        title: 'Matching unanswered post',
        content: 'content',
        user: author._id,
        category: category._id,
        tags: ['pytorch'],
        aiMlLevel: 'advanced',
        commentCount: 0,
        createdAt: new Date(now - 1 * DAY_MS)
      });
      nonMatching = await Post.create({
        title: 'Non-matching unanswered post',
        content: 'content',
        user: author._id,
        category: otherCategory._id,
        tags: ['sql'],
        aiMlLevel: 'beginner',
        commentCount: 0,
        createdAt: new Date(now - 2 * DAY_MS)
      });
      answered = await Post.create({
        title: 'Answered post',
        content: 'content',
        user: author._id,
        category: category._id,
        tags: ['pytorch'],
        aiMlLevel: 'advanced',
        commentCount: 3,
        createdAt: new Date(now - 3 * DAY_MS)
      });
      // The "unanswered" set is resolved against real Comment documents
      // (see server/utils/postCounters.js), not the commentCount field
      // above, so this post needs an actual comment to be excluded.
      await Comment.create({ content: 'An answer', user: author._id, post: answered._id });
    });

    it('requires authentication', async () => {
      const res = await request(server).get('/api/posts/recommended');
      expect(res.status).toBe(401);
    });

    it('ranks unanswered posts by relevance and excludes answered posts', async () => {
      const member = await createPersonalizedUser();
      const token = tokenFor(member);

      const res = await request(server)
        .get('/api/posts/recommended')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map(p => p._id);
      expect(ids).toEqual([matching._id.toString(), nonMatching._id.toString()]);
      expect(ids).not.toContain(answered._id.toString());
    });

    it('falls back to oldest-first unanswered order for a cold-start member', async () => {
      const { token } = await createTestUser();

      const res = await request(server)
        .get('/api/posts/recommended')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.map(p => p._id)).toEqual([
        nonMatching._id.toString(),
        matching._id.toString()
      ]);
    });
  });
});
