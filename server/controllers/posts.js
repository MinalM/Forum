const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const escapeRegex = require('../utils/escapeRegex');
const { normalizeTags } = require('../utils/normalizeTags');
const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const { postCreatedCounter, postViewCounter } = require('../dist/instrumentation/metrics');
const { getExperimentationService } = require('../dist/services/experimentation');

// @desc    Get all posts
// @route   GET /api/posts
// @route   GET /api/categories/:categoryId/posts
// @route   GET /api/users/:userId/posts
// @access  Public
exports.getPosts = asyncHandler(async (req, res, next) => {
  if (req.params.categoryId) {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.categoryId}`, 404)
      );
    }

    const filter = { category: req.params.categoryId };
    if (req.query.solved === 'true') {
      filter.isSolved = true;
    } else if (req.query.solved === 'false') {
      filter.isSolved = false;
    }

    const posts = await Post.find(filter)
      .sort('-createdAt')
      .populate({
        path: 'user',
        select: 'name avatar'
      })
      .populate('category', 'name')
      .populate('comments');

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } else if (req.params.userId) {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.userId}`, 404)
      );
    }

    const posts = await Post.find({ user: req.params.userId })
      .populate({
        path: 'user',
        select: 'name avatar'
      })
      .populate('category', 'name')
      .populate('comments');

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

  // Increment post view counter metric
  postViewCounter.add(1, {
    category: post.category?.name || 'unknown',
    post_id: post._id.toString()
  });

  // Forward outcome metric to experimentation service
  try {
    const experimentationService = getExperimentationService();
    if (req.experimentUser) {
      experimentationService.logOutcome('posts_views', req.experimentUser, 1);
    }
  } catch (err) {
    // Never block the response if experimentation is unavailable
  }

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
  const tracer = trace.getTracer('forum-server');

  return tracer.startActiveSpan('createPost', async (span) => {
    try {
      // Add attributes
      span.setAttribute('user.id', req.user.id);
      span.setAttribute('category.id', req.body.category);

      // Add user to req.body
      req.body.user = req.user.id;

      if (req.body.tags) {
        req.body.tags = normalizeTags(req.body.tags);
      }

      // Check if category exists
      const category = await Category.findById(req.body.category);
      if (!category) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Category not found' });
        span.end();
        return next(
          new ErrorResponse(`Category not found with id of ${req.body.category}`, 404)
        );
      }

      const post = await Post.create(req.body);
      span.setAttribute('post.id', post._id.toString());

      // Increment metric using centralized counter
      postCreatedCounter.add(1, {
        category: category.name,
        user_role: req.user.role
      });

      res.status(201).json({
        success: true,
        data: post
      });
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
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

  // Make sure user is post owner, moderator, or admin
  if (post.user.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this post`,
        401
      )
    );
  }

  // Update the updatedAt field
  req.body.updatedAt = Date.now();

  if (req.body.tags) {
    req.body.tags = normalizeTags(req.body.tags);
  }

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

  // Make sure user is post owner, moderator, or admin
  if (post.user.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this post`,
        401
      )
    );
  }

  await Post.deleteOne({ _id: req.params.id });

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

  // Make sure user is post owner, moderator, or admin
  if (post.user.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
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

// @desc    Pin a post (Moderator/Admin only)
// @route   PUT /api/posts/:id/pin
// @access  Private (Moderator & Admin)
exports.pinPost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Only moderators and admins can pin posts
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to pin posts`,
        403
      )
    );
  }

  post.isPinned = !post.isPinned;
  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Lock a thread (Moderator/Admin only)
// @route   PUT /api/posts/:id/lock
// @access  Private (Moderator & Admin)
exports.lockThread = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Only moderators and admins can lock threads
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to lock threads`,
        403
      )
    );
  }

  post.isLocked = !post.isLocked;
  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Move a thread to different category (Moderator/Admin only)
// @route   PUT /api/posts/:id/move
// @access  Private (Moderator & Admin)
exports.moveThread = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Only moderators and admins can move threads
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to move threads`,
        403
      )
    );
  }

  // Check if category exists
  const category = await Category.findById(req.body.category);
  if (!category) {
    return next(
      new ErrorResponse(`Category not found with id of ${req.body.category}`, 404)
    );
  }

  post.category = req.body.category;
  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Search posts by title/content, case-insensitive
// @route   GET /api/posts/search?q=
// @access  Public
exports.searchPosts = asyncHandler(async (req, res, next) => {
  const q = req.query.q?.trim();

  if (!q) {
    return next(new ErrorResponse('Please provide a search query', 400));
  }

  const searchRegex = new RegExp(escapeRegex(q), 'i');
  const filter = { $or: [{ title: searchRegex }, { content: searchRegex }] };

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const total = await Post.countDocuments(filter);

  const posts = await Post.find(filter)
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit)
    .populate({ path: 'user', select: 'name avatar' })
    .populate('category', 'name')
    .populate('comments');

  const pagination = {
    total,
    limit,
    page,
    pages: Math.ceil(total / limit)
  };

  if (endIndex < total) {
    pagination.next = { page: page + 1, limit };
  }

  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.status(200).json({
    success: true,
    count: posts.length,
    pagination,
    data: posts
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
