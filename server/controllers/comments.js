const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

// @desc    Get comments
// @route   GET /api/comments
// @route   GET /api/posts/:postId/comments
// @access  Public
exports.getComments = asyncHandler(async (req, res, next) => {
  if (req.params.postId) {
    const comments = await Comment.find({ post: req.params.postId })
      .populate({
        path: 'user',
        select: 'name avatar'
      });

    return res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } else {
    res.status(200).json(res.advancedResults);
  }
});

// @desc    Get single comment
// @route   GET /api/comments/:id
// @access  Public
exports.getComment = asyncHandler(async (req, res, next) => {
  console.log('Getting comment with ID:', req.params.id);
  
  try {
    // Use lean() to get a plain JavaScript object instead of a Mongoose document
    const comment = await Comment.findById(req.params.id).lean();
    
    console.log('Found comment:', comment);

    if (!comment) {
      return next(
        new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
      );
    }

    // Return the comment without trying to populate fields
    res.status(200).json({
      success: true,
      data: comment
    });
  } catch (err) {
    console.error('Error in getComment:', err);
    return next(new ErrorResponse(`Error retrieving comment: ${err.message}`, 500));
  }
});

// @desc    Add comment
// @route   POST /api/posts/:postId/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  req.body.post = req.params.postId;
  req.body.user = req.user.id;

  const post = await Post.findById(req.params.postId);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.postId}`, 404)
    );
  }

  const comment = await Comment.create(req.body);

  res.status(201).json({
    success: true,
    data: comment
  });
});

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
exports.updateComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is comment owner, moderator, or admin
  if (comment.user.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this comment`,
        401
      )
    );
  }

  // If moderator or admin is updating, record moderation details
  if (['admin', 'moderator'].includes(req.user.role) && 
      comment.user.toString() !== req.user.id) {
    req.body.lastModeratedBy = req.user.id;
    req.body.lastModeratedAt = Date.now();
  }

  // Update the updatedAt field
  req.body.updatedAt = Date.now();

  comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is comment owner, moderator, or admin
  if (comment.user.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this comment`,
        401
      )
    );
  }

  await Comment.deleteOne({ _id: req.params.id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upvote a comment
// @route   PUT /api/comments/:id/upvote
// @access  Private
exports.upvoteComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if the user has already upvoted
  if (comment.upvotes.includes(req.user.id)) {
    // Remove upvote
    comment.upvotes = comment.upvotes.filter(
      upvote => upvote.toString() !== req.user.id
    );
  } else {
    // Add upvote
    comment.upvotes.push(req.user.id);
    // Remove downvote if exists
    comment.downvotes = comment.downvotes.filter(
      downvote => downvote.toString() !== req.user.id
    );
  }

  await comment.save();

  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Downvote a comment
// @route   PUT /api/comments/:id/downvote
// @access  Private
exports.downvoteComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if the user has already downvoted
  if (comment.downvotes.includes(req.user.id)) {
    // Remove downvote
    comment.downvotes = comment.downvotes.filter(
      downvote => downvote.toString() !== req.user.id
    );
  } else {
    // Add downvote
    comment.downvotes.push(req.user.id);
    // Remove upvote if exists
    comment.upvotes = comment.upvotes.filter(
      upvote => upvote.toString() !== req.user.id
    );
  }

  await comment.save();

  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Mark comment as answer
// @route   PUT /api/comments/:id/answer
// @access  Private
exports.markAsAnswer = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
    );
  }

  // Get the post
  const post = await Post.findById(comment.post);

  // Make sure user is post owner, moderator, or admin
  if (post.user.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to mark this comment as an answer`,
        401
      )
    );
  }

  // Toggle answer status
  comment.isAnswer = !comment.isAnswer;
  await comment.save();

  // If marked as answer, mark the post as solved
  if (comment.isAnswer) {
    post.isSolved = true;
    await post.save();
  }

  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Get replies to a comment
// @route   GET /api/comments/:id/replies
// @access  Public
exports.getCommentReplies = asyncHandler(async (req, res, next) => {
  const replies = await Comment.find({ parentComment: req.params.id })
    .populate({
      path: 'user',
      select: 'name avatar'
    });

  res.status(200).json({
    success: true,
    count: replies.length,
    data: replies
  });
});

// @desc    Add reply to a comment
// @route   POST /api/comments/:id/replies
// @access  Private
exports.addReply = asyncHandler(async (req, res, next) => {
  const parentComment = await Comment.findById(req.params.id);

  if (!parentComment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if the post is locked and user is not moderator or admin
  const post = await Post.findById(parentComment.post);
  if (post.isLocked && !['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `This thread is locked and not accepting new comments`,
        403
      )
    );
  }

  req.body.parentComment = req.params.id;
  req.body.post = parentComment.post;
  req.body.user = req.user.id;

  const reply = await Comment.create(req.body);

  res.status(201).json({
    success: true,
    data: reply
  });
});

// @desc    Hide a comment (Moderator/Admin only)
// @route   PUT /api/comments/:id/hide
// @access  Private (Moderator & Admin)
exports.hideComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404)
    );
  }

  // Only moderators and admins can hide comments
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to hide comments`,
        403
      )
    );
  }

  comment.isHidden = !comment.isHidden;
  comment.moderationReason = req.body.moderationReason || 'Content moderation';
  comment.lastModeratedBy = req.user.id;
  comment.lastModeratedAt = Date.now();
  
  await comment.save();

  res.status(200).json({
    success: true,
    data: comment
  });
});
