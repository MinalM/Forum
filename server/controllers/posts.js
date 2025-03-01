const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');

// @desc    Get all posts
// @route   GET /api/posts
// @route   GET /api/categories/:categoryId/posts
// @route   GET /api/users/:userId/posts
// @access  Public
exports.getPosts = asyncHandler(async (req, res, next) => {
  if (req.params.categoryId) {
    const posts = await Post.find({ category: req.params.categoryId })
      .populate({
        path: 'user',
        select: 'name avatar'
      })
      .populate('category', 'name');

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } else if (req.params.userId) {
    const posts = await Post.find({ user: req.params.userId })
      .populate({
        path: 'user',
        select: 'name avatar'
      })
      .populate('category', 'name');

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } else {
    res.status(200).json(res.advancedResults);
  }
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id)
    .populate({
      path: 'user',
      select: 'name avatar bio aiMlExperience'
    })
    .populate('category', 'name')
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
        select: 'name avatar'
      }
    });

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Increment view count
  post.views += 1;
  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Check if category exists
  const category = await Category.findById(req.body.category);
  if (!category) {
    return next(
      new ErrorResponse(`Category not found with id of ${req.body.category}`, 404)
    );
  }

  const post = await Post.create(req.body);

  res.status(201).json({
    success: true,
    data: post
  });
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is post owner or admin
  if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this post`,
        401
      )
    );
  }

  // Update the updatedAt field
  req.body.updatedAt = Date.now();

  post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is post owner or admin
  if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this post`,
        401
      )
    );
  }

  await post.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upvote a post
// @route   PUT /api/posts/:id/upvote
// @access  Private
exports.upvotePost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if the user has already upvoted
  if (post.upvotes.includes(req.user.id)) {
    // Remove upvote
    post.upvotes = post.upvotes.filter(
      upvote => upvote.toString() !== req.user.id
    );
  } else {
    // Add upvote
    post.upvotes.push(req.user.id);
    // Remove downvote if exists
    post.downvotes = post.downvotes.filter(
      downvote => downvote.toString() !== req.user.id
    );
  }

  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Downvote a post
// @route   PUT /api/posts/:id/downvote
// @access  Private
exports.downvotePost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if the user has already downvoted
  if (post.downvotes.includes(req.user.id)) {
    // Remove downvote
    post.downvotes = post.downvotes.filter(
      downvote => downvote.toString() !== req.user.id
    );
  } else {
    // Add downvote
    post.downvotes.push(req.user.id);
    // Remove upvote if exists
    post.upvotes = post.upvotes.filter(
      upvote => upvote.toString() !== req.user.id
    );
  }

  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Mark post as solved
// @route   PUT /api/posts/:id/solve
// @access  Private
exports.solvePost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is post owner or admin
  if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to mark this post as solved`,
        401
      )
    );
  }

  post.isSolved = !post.isSolved;
  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Get posts by AI/ML level
// @route   GET /api/posts/level/:level
// @access  Public
exports.getPostsByLevel = asyncHandler(async (req, res, next) => {
  const { level } = req.params;
  
  // Validate level
  const validLevels = ['beginner', 'intermediate', 'advanced', 'expert', 'all'];
  if (!validLevels.includes(level)) {
    return next(
      new ErrorResponse(`Invalid AI/ML level: ${level}`, 400)
    );
  }

  const posts = await Post.find({ aiMlLevel: level })
    .populate({
      path: 'user',
      select: 'name avatar'
    })
    .populate('category', 'name');

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts
  });
});
