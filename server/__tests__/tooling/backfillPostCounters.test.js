const mongoose = require('mongoose');
const { reconcilePostCounters } = require('../../../scripts/backfill-post-counters');
const { createTestUser, cleanupTestData } = require('../integration/setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

describe('scripts/backfill-post-counters', () => {
  let user;
  let category;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.disconnect();
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

  async function makeDeliberatelyWrongPost() {
    const post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      commentCount: 999,
      score: 999,
      upvotes: [user._id]
    });

    await Comment.create({ content: 'A comment', user: user._id, post: post._id });
    await Comment.create({ content: 'Another comment', user: user._id, post: post._id });

    return post;
  }

  it('reports drifted posts without writing in dry-run mode', async () => {
    const post = await makeDeliberatelyWrongPost();

    const changes = await reconcilePostCounters({ apply: false });

    expect(changes).toHaveLength(1);
    expect(changes[0].postId.toString()).toBe(post._id.toString());
    expect(changes[0].before).toEqual({ commentCount: 999, score: 999 });
    expect(changes[0].after).toEqual({ commentCount: 2, score: 1 });

    const unchanged = await Post.findById(post._id);
    expect(unchanged.commentCount).toBe(999);
    expect(unchanged.score).toBe(999);
  });

  it('reconciles deliberately-wrong counters when applied', async () => {
    const post = await makeDeliberatelyWrongPost();

    await reconcilePostCounters({ apply: true });

    const fixed = await Post.findById(post._id);
    expect(fixed.commentCount).toBe(2);
    expect(fixed.score).toBe(1);
  });

  it('leaves already-correct posts untouched', async () => {
    const post = await Post.create({
      title: 'Correct Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      commentCount: 0,
      score: 0
    });

    const changes = await reconcilePostCounters({ apply: true });

    expect(changes).toHaveLength(0);
    const unchanged = await Post.findById(post._id);
    expect(unchanged.commentCount).toBe(0);
    expect(unchanged.score).toBe(0);
  });
});
