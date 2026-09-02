const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Post = require('../models/Post');
const SavedPost = require('../models/SavedPost');

// @desc    Save a post for later
// @route   POST /api/posts/:id/save
// @access  Private
exports.savePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  await SavedPost.updateOne(
    { user: req.user.id, post: post._id },
    { $setOnInsert: { user: req.user.id, post: post._id } },
    { upsert: true }
  );

  res.status(200).json({
    success: true,
    data: { saved: true }
  });
});

// @desc    Unsave a post
// @route   DELETE /api/posts/:id/save
// @access  Private
exports.unsavePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  await SavedPost.deleteOne({ user: req.user.id, post: post._id });

  res.status(200).json({
    success: true,
    data: { saved: false }
  });
});

// @desc    Get the current user's saved status for a post
// @route   GET /api/posts/:id/save
// @access  Private
exports.getSaveStatus = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  const saved = await SavedPost.findOne({
    user: req.user.id,
    post: post._id
  });

  res.status(200).json({
    success: true,
    data: { saved: !!saved }
  });
});

// @desc    List the current user's saved posts
// @route   GET /api/saved-posts
// @access  Private
exports.getMySavedPosts = asyncHandler(async (req, res, next) => {
  const savedPosts = await SavedPost.find({ user: req.user.id })
    .sort('-createdAt')
    .populate({
      path: 'post',
      // upvotes/downvotes must stay selected: Post.voteCount is a virtual
      // getter (this.upvotes.length - this.downvotes.length) computed
      // during toJSON({ virtuals: true }) serialization, so omitting them
      // from a partial select throws instead of just hiding voteCount.
      select: 'title slug commentCount isSolved isLocked upvotes downvotes'
    });

  res.status(200).json({
    success: true,
    count: savedPosts.length,
    data: savedPosts
  });
});
