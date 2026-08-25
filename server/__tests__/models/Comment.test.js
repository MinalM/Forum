const mongoose = require('mongoose');
const Comment = require('../../models/Comment');
const Post = require('../../models/Post');
const User = require('../../models/User');
const Category = require('../../models/Category');

describe('Comment Model Test', () => {
  let user, category, post;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
    await Post.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});

    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

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

  it('should calculate vote count correctly', async () => {
    const comment = new Comment({
      content: 'Test comment',
      user: user._id,
      post: post._id,
      upvotes: [user._id],
      downvotes: []
    });

    expect(comment.voteCount).toBe(1);

    comment.downvotes.push(new mongoose.Types.ObjectId());
    expect(comment.voteCount).toBe(0);
  });

  it('should not throw serializing a voteCount when upvotes/downvotes are excluded by a partial select', async () => {
    const comment = await Comment.create({
      content: 'Test comment',
      user: user._id,
      post: post._id,
      upvotes: [user._id]
    });

    const partial = await Comment.findById(comment._id).select('content user');
    expect(() => partial.toJSON()).not.toThrow();
    expect(partial.toJSON().voteCount).toBe(0);
  });
});
