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
const { subscribeUserToPost, notifyTagFollowers } = require('../utils/subscriptions');
const { rankUnansweredForUser } = require('../utils/postCounters');
const { processMentions, notifyMentionedUsers } = require('../utils/mentions');

// How many unanswered posts the "You can answer these" rail shows, once
// ranked by rankUnansweredForUser.
const RECOMMENDED_LIMIT = 5;

// How many "Related questions" the post thread shows.
const RELATED_LIMIT = 5;

// Title words this short (articles, prepositions, etc.) are too common to
// be a useful similarity signal, so getRelatedPosts ignores them.
const MIN_RELATED_TITLE_WORD_LENGTH = 4;

// @desc    Get all posts. GET /api/posts supports ?feed=recent|unanswered|top
//          (see server/middleware/advancedResults.js), plus the existing
//          sort/page/limit/search params.
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

  // Self-heal a stale/missing commentCount or score against the data this
  // request already loaded (the populated `comments` virtual and the
  // upvotes/downvotes arrays), so the thread page and this post's next
  // appearance in a feed/unanswered listing never disagree with the actual
  // comment count. Needed because some posts were written with `commentCount`
  // missing entirely (see server/utils/postCounters.js) and the denormalised
  // counters (BACKLOG.md item 1) only stay in sync for writes that go through
  // the comment/vote controllers.
  const actualCommentCount = post.comments.length;
  const actualScore = post.upvotes.length - post.downvotes.length;
  if (post.commentCount !== actualCommentCount || post.score !== actualScore) {
    await Post.updateOne(
      { _id: post._id },
      { $set: { commentCount: actualCommentCount, score: actualScore } }
    );
    post.commentCount = actualCommentCount;
    post.score = actualScore;
  }

  // Increment view count without triggering full-document validators
  // (post.save() would re-run the tag validators on every read, rejecting
  // pre-existing rows whose tags predate those validators)
  await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });
  post.views += 1;

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

      // Resolve @mentions before the post is created, so the stored content
      // already carries the resolved links and no follow-up update is needed.
      const { content: contentWithMentions, mentionedUsers } = await processMentions(
        req.body.content
      );
      req.body.content = contentWithMentions;

      const post = await Post.create(req.body);
      span.setAttribute('post.id', post._id.toString());

      // A member is automatically subscribed to answers/replies on their
      // own posts.
      await subscribeUserToPost(req.user.id, post._id);

      // Notify anyone following one of this post's tags, except the author.
      await notifyTagFollowers({
        postId: post._id,
        actorId: req.user.id,
        tags: post.tags
      });

      // Notify every @mentioned member except the author.
      await notifyMentionedUsers({
        postId: post._id,
        actorId: req.user.id,
        mentionedUsers
      });

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
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  let upvotes = post.upvotes.map(id => id.toString());
  let downvotes = post.downvotes.map(id => id.toString());

  if (upvotes.includes(req.user.id)) {
    // Remove upvote
    upvotes = upvotes.filter(id => id !== req.user.id);
  } else {
    // Add upvote, remove downvote if present
    upvotes.push(req.user.id);
    downvotes = downvotes.filter(id => id !== req.user.id);
  }

  const score = upvotes.length - downvotes.length;

  // Targeted update (not post.save()) so this never full-document-validates
  // unrelated fields - e.g. legacy tags that predate the #33 tag caps -
  // the same fix already applied to markAsAnswer for isSolved.
  const updated = await Post.findByIdAndUpdate(
    post._id,
    { upvotes, downvotes, score },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: updated
  });
});

// @desc    Downvote a post
// @route   PUT /api/posts/:id/downvote
// @access  Private
exports.downvotePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  let upvotes = post.upvotes.map(id => id.toString());
  let downvotes = post.downvotes.map(id => id.toString());

  if (downvotes.includes(req.user.id)) {
    // Remove downvote
    downvotes = downvotes.filter(id => id !== req.user.id);
  } else {
    // Add downvote, remove upvote if present
    downvotes.push(req.user.id);
    upvotes = upvotes.filter(id => id !== req.user.id);
  }

  const score = upvotes.length - downvotes.length;

  // Targeted update (not post.save()) - see upvotePost above.
  const updated = await Post.findByIdAndUpdate(
    post._id,
    { upvotes, downvotes, score },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: updated
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
  const post = await Post.findById(req.params.id);

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

  // Targeted update (not post.save()) - see upvotePost above.
  const updated = await Post.findByIdAndUpdate(
    post._id,
    { isPinned: !post.isPinned },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: updated
  });
});

// @desc    Lock a thread (Moderator/Admin only)
// @route   PUT /api/posts/:id/lock
// @access  Private (Moderator & Admin)
exports.lockThread = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

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

  // Targeted update (not post.save()) - see upvotePost above.
  const updated = await Post.findByIdAndUpdate(
    post._id,
    { isLocked: !post.isLocked },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: updated
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

// @desc    Related questions for a post thread - ranked by tag overlap and
//          title/content similarity, reusing the same case-insensitive
//          escaped-regex matching as searchPosts. Excludes the post itself,
//          capped at RELATED_LIMIT. Powers the "Related questions" section
//          on PostDetail and interlinks content for crawlers.
// @route   GET /api/posts/:id/related
// @access  Public
exports.getRelatedPosts = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id).select('title tags');

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  const limit = Math.min(
    parseInt(req.query.limit, 10) || RELATED_LIMIT,
    RELATED_LIMIT
  );

  const tags = post.tags || [];
  const titleWords = post.title
    .split(/\W+/)
    .filter((word) => word.length >= MIN_RELATED_TITLE_WORD_LENGTH);
  const titleRegex = titleWords.length
    ? new RegExp(titleWords.map(escapeRegex).join('|'), 'i')
    : null;

  const orClauses = [];
  if (tags.length) {
    orClauses.push({ tags: { $in: tags } });
  }
  if (titleRegex) {
    orClauses.push({ title: titleRegex }, { content: titleRegex });
  }

  if (!orClauses.length) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  // Overfetch newest-first, then re-rank by relevance in memory - the
  // scoring below (tag overlap weighted above a single text match) isn't
  // expressible as a Mongo sort without a text index this schema doesn't
  // have.
  const candidates = await Post.find({ _id: { $ne: post._id }, $or: orClauses })
    .sort('-createdAt')
    .limit(limit * 4)
    .populate({ path: 'user', select: 'name avatar' })
    .populate('category', 'name');

  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  const related = candidates
    .map((candidate) => {
      const overlap = (candidate.tags || []).filter((tag) =>
        tagSet.has(tag.toLowerCase())
      ).length;
      const textMatch =
        titleRegex && (titleRegex.test(candidate.title) || titleRegex.test(candidate.content))
          ? 1
          : 0;
      return { candidate, score: overlap * 2 + textMatch };
    })
    .sort((a, b) => b.score - a.score || b.candidate.createdAt - a.candidate.createdAt)
    .slice(0, limit)
    .map((entry) => entry.candidate);

  res.status(200).json({
    success: true,
    count: related.length,
    data: related
  });
});

// @desc    Unanswered questions ranked against the signed-in member's
//          targetRole/skills/aiMlExperience (see server/utils/feedRanking.js)
//          for the "You can answer these" rail. A member with no
//          personalization signal set gets the plain oldest-first order
//          instead - never an empty rail just because they skipped
//          onboarding.
// @route   GET /api/posts/recommended
// @access  Private
exports.getRecommendedUnanswered = asyncHandler(async (req, res, next) => {
  const data = await rankUnansweredForUser(Post, req.user, {
    limit: RECOMMENDED_LIMIT,
    select: 'title tags aiMlLevel category createdAt',
    populate: { path: 'category', select: 'name' }
  });

  res.status(200).json({
    success: true,
    count: data.length,
    data
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
