const mongoose = require('mongoose');
const { findTitleContentMismatches } = require('../../../scripts/audit-post-title-mismatch');
const { createTestUser, cleanupTestData } = require('../integration/setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');

describe('scripts/audit-post-title-mismatch', () => {
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

  it('reports posts whose content opens with a mismatched "Title:" line', async () => {
    // The Post schema validator rejects this on create/save, so simulate an
    // already-mismatched row (e.g. seeded some other way) by bypassing
    // validation, the same way the live rows this script targets exist.
    const mismatched = await Post.create(
      [
        {
          title: 'Implementing Efficient Attention Mechanisms in Transformers',
          content: 'Title: Exploring Transfer Learning in Deep Learning Models\n\nTransfer learning...',
          user: user._id,
          category: category._id
        }
      ],
      { validateBeforeSave: false }
    );

    const mismatches = await findTitleContentMismatches();

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].postId.toString()).toBe(mismatched[0]._id.toString());
    expect(mismatches[0].embeddedTitle).toBe('Exploring Transfer Learning in Deep Learning Models');
  });

  it('does not write anything', async () => {
    await Post.create(
      [
        {
          title: 'Implementing Efficient Attention Mechanisms in Transformers',
          content: 'Title: Exploring Transfer Learning in Deep Learning Models\n\nTransfer learning...',
          user: user._id,
          category: category._id
        }
      ],
      { validateBeforeSave: false }
    );

    await findTitleContentMismatches();

    const post = await Post.findOne();
    expect(post.content).toContain('Title: Exploring Transfer Learning');
  });

  it('leaves correctly-paired posts unreported', async () => {
    await Post.create({
      title: 'Getting Started with Machine Learning',
      content: 'What are the best resources for someone new to ML?',
      user: user._id,
      category: category._id
    });

    const mismatches = await findTitleContentMismatches();

    expect(mismatches).toHaveLength(0);
  });
});
