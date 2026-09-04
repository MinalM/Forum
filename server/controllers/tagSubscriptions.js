const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const TagSubscription = require('../models/TagSubscription');
const { normalizeTags } = require('../utils/normalizeTags');

// Trims and lowercases a raw :tag route param the same way tag identity is
// compared everywhere else (TagSubscription.tag is stored lowercased, and
// createPost's notifyTagFollowers lowercases post.tags before matching).
function normalizeTagParam(rawTag) {
  const [normalized] = normalizeTags([rawTag]);
  return normalized ? normalized.toLowerCase() : '';
}

// @desc    Follow a tag
// @route   POST /api/tags/:tag/subscribe
// @access  Private
exports.followTag = asyncHandler(async (req, res, next) => {
  const tag = normalizeTagParam(req.params.tag);

  if (!tag) {
    return next(new ErrorResponse('Invalid tag', 400));
  }

  await TagSubscription.findOneAndUpdate(
    { user: req.user.id, tag },
    { $setOnInsert: { user: req.user.id, tag } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    data: { subscribed: true }
  });
});

// @desc    Unfollow a tag
// @route   DELETE /api/tags/:tag/subscribe
// @access  Private
exports.unfollowTag = asyncHandler(async (req, res, next) => {
  const tag = normalizeTagParam(req.params.tag);

  await TagSubscription.deleteOne({ user: req.user.id, tag });

  res.status(200).json({
    success: true,
    data: { subscribed: false }
  });
});

// @desc    Get the current user's follow status for a tag
// @route   GET /api/tags/:tag/subscribe
// @access  Private
exports.getTagFollowStatus = asyncHandler(async (req, res, next) => {
  const tag = normalizeTagParam(req.params.tag);

  const subscription = await TagSubscription.findOne({ user: req.user.id, tag });

  res.status(200).json({
    success: true,
    data: { subscribed: !!subscription }
  });
});

// @desc    List the tags the current user follows
// @route   GET /api/tags/subscriptions
// @access  Private
exports.getMyTagSubscriptions = asyncHandler(async (req, res, next) => {
  const subscriptions = await TagSubscription.find({ user: req.user.id }).sort('-createdAt');

  res.status(200).json({
    success: true,
    count: subscriptions.length,
    data: subscriptions
  });
});
