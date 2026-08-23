const asyncHandler = require('../middleware/async');
const Notification = require('../models/Notification');

// @desc    List the current user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort('-createdAt')
    .populate({
      path: 'post',
      // See the matching comment in controllers/subscriptions.js: Post's
      // voteCount virtual needs upvotes/downvotes present or toJSON throws.
      select: 'title slug upvotes downvotes'
    })
    .populate({ path: 'comment', select: 'content' })
    .populate({ path: 'actor', select: 'name avatar' });

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});

// @desc    Get the current user's unread notification count
// @route   GET /api/notifications/unread/count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({
    user: req.user.id,
    read: false
  });

  res.status(200).json({
    success: true,
    data: { count }
  });
});

// @desc    Mark all of the current user's notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user.id, read: false },
    { read: true }
  );

  res.status(200).json({
    success: true,
    data: {}
  });
});
