const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private/Admin/Moderator
exports.getReports = asyncHandler(async (req, res, next) => {
  // Only admins and moderators can view reports
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access reports`,
        403
      )
    );
  }

  // Filter by status if provided
  let query = {};
  if (req.query.status) {
    query.status = req.query.status;
  }

  const reports = await Report.find(query)
    .populate({
      path: 'reportedBy',
      select: 'name email'
    })
    .populate({
      path: 'resolvedBy',
      select: 'name email'
    })
    .populate({
      path: 'post',
      select: 'title content'
    })
    .populate({
      path: 'comment',
      select: 'content'
    })
    .populate({
      path: 'reportedUser',
      select: 'name email'
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reports.length,
    data: reports
  });
});

// @desc    Get a single report
// @route   GET /api/reports/:id
// @access  Private/Admin/Moderator
exports.getReport = asyncHandler(async (req, res, next) => {
  // Only admins and moderators can view reports
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access reports`,
        403
      )
    );
  }

  const report = await Report.findById(req.params.id)
    .populate({
      path: 'reportedBy',
      select: 'name email'
    })
    .populate({
      path: 'resolvedBy',
      select: 'name email'
    })
    .populate({
      path: 'post',
      select: 'title content user'
    })
    .populate({
      path: 'comment',
      select: 'content user'
    })
    .populate({
      path: 'reportedUser',
      select: 'name email'
    });

  if (!report) {
    return next(
      new ErrorResponse(`Report not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: report
  });
});

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
exports.createReport = asyncHandler(async (req, res, next) => {
  req.body.reportedBy = req.user.id;

  // Validate report data based on type
  const { type, postId, commentId, userId, reason } = req.body;
  
  if (!type || !['post', 'comment', 'user'].includes(type)) {
    return next(new ErrorResponse('Invalid report type', 400));
  }

  if (!reason) {
    return next(new ErrorResponse('Please provide a reason for the report', 400));
  }

  // Create the report object
  const reportData = {
    type,
    reason,
    reportedBy: req.user.id
  };

  // Add the appropriate ID based on report type
  if (type === 'post') {
    if (!postId) {
      return next(new ErrorResponse('Please provide a post ID', 400));
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return next(new ErrorResponse(`Post not found with id of ${postId}`, 404));
    }

    reportData.post = postId;
  } else if (type === 'comment') {
    if (!commentId) {
      return next(new ErrorResponse('Please provide a comment ID', 400));
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new ErrorResponse(`Comment not found with id of ${commentId}`, 404));
    }

    reportData.comment = commentId;
  } else if (type === 'user') {
    if (!userId) {
      return next(new ErrorResponse('Please provide a user ID', 400));
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
    }

    // Cannot report moderators or admins
    if (['moderator', 'admin'].includes(user.role)) {
      return next(new ErrorResponse('Cannot report moderators or administrators', 400));
    }

    reportData.reportedUser = userId;
  }

  try {
    const report = await Report.create(reportData);

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (err) {
    // Handle duplicate report
    if (err.code === 11000) {
      return next(new ErrorResponse('You have already reported this content', 400));
    }
    
    return next(err);
  }
});

// @desc    Resolve a report
// @route   PUT /api/reports/:id/resolve
// @access  Private/Admin/Moderator
exports.resolveReport = asyncHandler(async (req, res, next) => {
  // Only admins and moderators can resolve reports
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to resolve reports`,
        403
      )
    );
  }

  const report = await Report.findById(req.params.id);

  if (!report) {
    return next(
      new ErrorResponse(`Report not found with id of ${req.params.id}`, 404)
    );
  }

  // Update report status
  report.status = 'resolved';
  report.resolvedBy = req.user.id;
  report.resolvedAt = Date.now();
  report.resolutionNotes = req.body.notes || 'Report resolved by moderator';

  await report.save();

  res.status(200).json({
    success: true,
    data: report
  });
});

// @desc    Dismiss a report
// @route   PUT /api/reports/:id/dismiss
// @access  Private/Admin/Moderator
exports.dismissReport = asyncHandler(async (req, res, next) => {
  // Only admins and moderators can dismiss reports
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to dismiss reports`,
        403
      )
    );
  }

  const report = await Report.findById(req.params.id);

  if (!report) {
    return next(
      new ErrorResponse(`Report not found with id of ${req.params.id}`, 404)
    );
  }

  // Update report status
  report.status = 'dismissed';
  report.resolvedBy = req.user.id;
  report.resolvedAt = Date.now();
  report.resolutionNotes = req.body.notes || 'Report dismissed by moderator';

  await report.save();

  res.status(200).json({
    success: true,
    data: report
  });
});

// @desc    Get pending reports count
// @route   GET /api/reports/pending/count
// @access  Private/Admin/Moderator
exports.getPendingReportsCount = asyncHandler(async (req, res, next) => {
  // Only admins and moderators can access this endpoint
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access reports`,
        403
      )
    );
  }

  const count = await Report.countDocuments({ status: 'pending' });

  res.status(200).json({
    success: true,
    data: { count }
  });
});