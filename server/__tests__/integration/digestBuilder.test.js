const mongoose = require('mongoose');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const { buildDigestForUser, buildWeeklyDigests, UNANSWERED_LIMIT } = require('../../utils/digestBuilder');

// No route/scheduled job exists yet (BACKLOG.md splits those into a later
// slice) - this exercises the builder directly against real data, the way
// server/__tests__/utils/tagPollution.test.js and similar DB-touching
// utils without their own endpoint are tested.
describe('digestBuilder', () => {
  let category;
  const since = new Date('2026-01-01T00:00:00.000Z');

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
    category = await Category.create({
      name: 'Machine Learning Fundamentals',
      description: 'ML basics'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  const createOptedOutUser = async () =>
    User.create({
      name: 'Opted Out',
      email: `opted-out-${Date.now()}-${Math.random()}@example.com`,
      password: 'password123',
      notificationPrefs: { digest: 'off' }
    });

  describe('buildDigestForUser', () => {
    it('returns null for a user who opted out, even with new activity', async () => {
      const optedOut = await createOptedOutUser();
      const { user: commenter } = await createTestUser();
      const post = await Post.create({
        title: 'A post', content: 'content', user: optedOut._id, category: category._id
      });
      await Comment.create({
        content: 'new answer',
        user: commenter._id,
        post: post._id,
        createdAt: new Date(since.getTime() + 1000)
      });

      expect(await buildDigestForUser(optedOut, since)).toBeNull();
    });

    it('returns null when there is nothing new to report', async () => {
      const { user } = await createTestUser();

      expect(await buildDigestForUser(user, since)).toBeNull();
    });

    it('includes new comments since the last send on posts the user authored', async () => {
      const { user: author } = await createTestUser();
      const { user: commenter } = await createTestUser();
      const post = await Post.create({
        title: 'My question', content: 'content', user: author._id, category: category._id
      });
      await Comment.create({
        content: 'old, before the last send',
        user: commenter._id,
        post: post._id,
        createdAt: new Date(since.getTime() - 1000)
      });
      const newComment = await Comment.create({
        content: 'new answer',
        user: commenter._id,
        post: post._id,
        createdAt: new Date(since.getTime() + 1000)
      });

      const digest = await buildDigestForUser(author, since);

      expect(digest).not.toBeNull();
      expect(digest.activity).toHaveLength(1);
      expect(digest.activity[0].post._id.toString()).toBe(post._id.toString());
      expect(digest.activity[0].comments.map(c => c._id.toString())).toEqual([
        newComment._id.toString()
      ]);
    });

    it('includes new comments on posts the user is subscribed to, not just authored', async () => {
      const { user: subscriber } = await createTestUser();
      const { user: author } = await createTestUser();
      const { user: commenter } = await createTestUser();
      const post = await Post.create({
        title: "Someone else's question", content: 'content', user: author._id, category: category._id
      });
      await Subscription.create({ user: subscriber._id, post: post._id });
      const newComment = await Comment.create({
        content: 'new answer',
        user: commenter._id,
        post: post._id,
        createdAt: new Date(since.getTime() + 1000)
      });

      const digest = await buildDigestForUser(subscriber, since);

      expect(digest.activity).toHaveLength(1);
      expect(digest.activity[0].comments.map(c => c._id.toString())).toEqual([
        newComment._id.toString()
      ]);
    });

    it("excludes the user's own new comments on their own post", async () => {
      const { user: author } = await createTestUser();
      const post = await Post.create({
        title: 'My question', content: 'content', user: author._id, category: category._id
      });
      await Comment.create({
        content: 'self reply',
        user: author._id,
        post: post._id,
        createdAt: new Date(since.getTime() + 1000)
      });

      expect(await buildDigestForUser(author, since)).toBeNull();
    });

    it('excludes hidden/moderated comments', async () => {
      const { user: author } = await createTestUser();
      const { user: commenter } = await createTestUser();
      const post = await Post.create({
        title: 'My question', content: 'content', user: author._id, category: category._id
      });
      await Comment.create({
        content: 'hidden',
        user: commenter._id,
        post: post._id,
        isHidden: true,
        createdAt: new Date(since.getTime() + 1000)
      });

      expect(await buildDigestForUser(author, since)).toBeNull();
    });

    it('includes unanswered questions ranked against the profile via feedRanking, up to UNANSWERED_LIMIT', async () => {
      const member = await User.create({
        name: 'Personalized',
        email: `personalized-${Date.now()}@example.com`,
        password: 'password123',
        targetRole: 'Machine Learning Engineer',
        skills: ['python', 'pytorch'],
        aiMlExperience: 'advanced'
      });
      const { user: otherAuthor } = await createTestUser();
      const matching = await Post.create({
        title: 'Matching unanswered post',
        content: 'content',
        user: otherAuthor._id,
        category: category._id,
        tags: ['python', 'pytorch'],
        aiMlLevel: 'advanced'
      });
      const nonMatching = await Post.create({
        title: 'Non-matching unanswered post',
        content: 'content',
        user: otherAuthor._id,
        category: category._id,
        tags: ['sql'],
        aiMlLevel: 'beginner'
      });

      const digest = await buildDigestForUser(member, since);

      const ids = digest.unansweredQuestions.map(p => p._id.toString());
      expect(ids).toContain(matching._id.toString());
      expect(ids).toContain(nonMatching._id.toString());
      expect(ids[0]).toBe(matching._id.toString());
    });

    it('caps unanswered questions at UNANSWERED_LIMIT', async () => {
      const { user: member } = await createTestUser();
      const { user: otherAuthor } = await createTestUser();
      for (let i = 0; i < UNANSWERED_LIMIT + 3; i++) {
        await Post.create({
          title: `Unanswered ${i}`, content: 'content', user: otherAuthor._id, category: category._id
        });
      }

      const digest = await buildDigestForUser(member, since);

      expect(digest.unansweredQuestions).toHaveLength(UNANSWERED_LIMIT);
    });
  });

  describe('buildWeeklyDigests', () => {
    it('skips opted-out users and users with nothing new, keeping the rest', async () => {
      const { user: hasActivity } = await createTestUser();
      const optedOut = await createOptedOutUser();
      const { user: nothingNew } = await createTestUser();
      const { user: commenter } = await createTestUser();

      const post = await Post.create({
        title: 'Q', content: 'content', user: hasActivity._id, category: category._id
      });
      await Comment.create({
        content: 'answer',
        user: commenter._id,
        post: post._id,
        createdAt: new Date(since.getTime() + 1000)
      });

      const digests = await buildWeeklyDigests([hasActivity, optedOut, nothingNew], since);

      expect(digests).toHaveLength(1);
      expect(digests[0].user._id.toString()).toBe(hasActivity._id.toString());
    });
  });
});
