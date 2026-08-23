const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Post = require('../models/Post');
const Subscription = require('../models/Subscription');
const { subscribeUserToPost } = require('../utils/subscriptions');

// @desc    Subscribe to a post's answers/replies
// @route   POST /api/posts/:id/subscribe
// @access  Private
exports.subscribeToPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  await subscribeUserToPost(req.user.id, post._id);

  res.status(200).json({
    success: true,
    data: { subscribed: true }
  });
});

// @desc    Unsubscribe from a post
// @route   DELETE /api/posts/:id/subscribe
// @access  Private
exports.unsubscribeFromPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  await Subscription.deleteOne({ user: req.user.id, post: post._id });

  res.status(200).json({
    success: true,
    data: { subscribed: false }
  });
});

// @desc    Get the current user's subscription status for a post
// @route   GET /api/posts/:id/subscribe
// @access  Private
exports.getSubscriptionStatus = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  const subscription = await Subscription.findOne({
    user: req.user.id,
    post: post._id
  });

  res.status(200).json({
    success: true,
    data: { subscribed: !!subscription }
  });
});

// @desc    List the current user's subscriptions
// @route   GET /api/subscriptions
// @access  Private
exports.getMySubscriptions = asyncHandler(async (req, res, next) => {
  const subscriptions = await Subscription.find({ user: req.user.id })
    .sort('-createdAt')
    .populate({
      path: 'post',
      // upvotes/downvotes must stay selected: Post.voteCount is a virtual
      // getter (this.upvotes.length - this.downvotes.length) computed
      // during toJSON({ virtuals: true }) serialization, so omitting them
      // from a partial select throws instead of just hiding voteCount.
      select: 'title slug commentCount isSolved upvotes downvotes'
    });

  res.status(200).json({
    success: true,
    count: subscriptions.length,
    data: subscriptions
  });
});
