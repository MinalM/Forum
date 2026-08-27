const mongoose = require('mongoose');
const Post = require('../../models/Post');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Comment = require('../../models/Comment');

describe('Post Model Test', () => {
  let user, category;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Post.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Comment.deleteMany({});

    // Create test user and category
    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });
  });

  it('should validate required fields', async () => {
    const postWithoutRequired = new Post({
      tags: ['test']
    });

    try {
      await postWithoutRequired.validate();
    } catch (error) {
      expect(error.errors.title).toBeDefined();
      expect(error.errors.content).toBeDefined();
      expect(error.errors.user).toBeDefined();
      expect(error.errors.category).toBeDefined();
    }
  });

  it('should create slug from title', async () => {
    const post = new Post({
      title: 'Test Post Title With Spaces!',
      content: 'Test content',
      user: user._id,
      category: category._id
    });

    await post.save();
    expect(post.slug).toBeDefined();
    expect(post.slug).toMatch(/^test-post-title-with-spaces-\d{6}$/);
  });

  it('should enforce title length', async () => {
    const longTitle = 'a'.repeat(201);
    const postWithLongTitle = new Post({
      title: longTitle,
      content: 'Test content',
      user: user._id,
      category: category._id
    });

    try {
      await postWithLongTitle.validate();
    } catch (error) {
      expect(error.errors.title).toBeDefined();
      expect(error.errors.title.message).toBe('Title cannot be more than 200 characters');
    }
  });

  it('should calculate vote count correctly', async () => {
    const post = new Post({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      upvotes: [user._id],
      downvotes: []
    });

    expect(post.voteCount).toBe(1);

    post.downvotes.push(new mongoose.Types.ObjectId());
    expect(post.voteCount).toBe(0);
  });

  it('should not throw serializing a voteCount when upvotes/downvotes are excluded by a partial select', async () => {
    const post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      upvotes: [user._id]
    });

    const partial = await Post.findById(post._id).select('title content');
    expect(() => partial.toJSON()).not.toThrow();
    expect(partial.toJSON().voteCount).toBe(0);
  });

  it('should reject more than 10 tags', async () => {
    const postWithTooManyTags = new Post({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`)
    });

    try {
      await postWithTooManyTags.validate();
    } catch (error) {
      expect(error.errors.tags).toBeDefined();
      expect(error.errors.tags.message).toBe('A post cannot have more than 10 tags');
    }
  });

  it('should reject a tag longer than 30 characters', async () => {
    const postWithLongTag = new Post({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      tags: ['a'.repeat(31)]
    });

    try {
      await postWithLongTag.validate();
    } catch (error) {
      expect(error.errors.tags).toBeDefined();
      expect(error.errors.tags.message).toBe('Each tag must be 30 characters or fewer');
    }
  });

  it('should accept tags within the count and length caps', async () => {
    const post = new Post({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      tags: ['python', 'career advice']
    });

    await expect(post.validate()).resolves.toBeUndefined();
  });

  it('should validate aiMlLevel enum values', async () => {
    const postWithInvalidLevel = new Post({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id,
      aiMlLevel: 'invalid-level'
    });

    try {
      await postWithInvalidLevel.validate();
    } catch (error) {
      expect(error.errors.aiMlLevel).toBeDefined();
    }
  });

  it('should set default values correctly', async () => {
    const post = new Post({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id
    });

    expect(post.views).toBe(0);
    expect(post.isPinned).toBe(false);
    expect(post.isAnnouncement).toBe(false);
    expect(post.isSolved).toBe(false);
    expect(post.aiMlLevel).toBe('all');
  });

  it('should populate virtual comments field', async () => {
    const post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id
    });

    // Create a test comment
    await Comment.create({
      content: 'Test comment',
      user: user._id,
      post: post._id
    });

    const populatedPost = await Post.findById(post._id).populate('comments');
    expect(populatedPost.comments).toBeDefined();
    expect(populatedPost.comments.length).toBe(1);
    expect(populatedPost.comments[0].content).toBe('Test comment');
  });

  it('should cascade delete comments when post is deleted', async () => {
    const post = await Post.create({
      title: 'Test Post',
      content: 'Test content',
      user: user._id,
      category: category._id
    });

    // Create test comments
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

    await Post.findByIdAndDelete(post._id);
    const comments = await Comment.find({ post: post._id });
    expect(comments.length).toBe(0);
  });
});