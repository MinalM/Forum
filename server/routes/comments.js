const express = require('express');
const {
  getComments,
  getComment,
  addComment,
  updateComment,
  deleteComment,
  upvoteComment,
  downvoteComment,
  markAsAnswer,
  getCommentReplies,
  addReply
} = require('../controllers/comments');

const Comment = require('../models/Comment');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Get all comments and create comment
router.route('/')
  .get(advancedResults(Comment, { path: 'user', select: 'name avatar' }), getComments)
  .post(protect, addComment);

// Get single comment and update/delete
router.route('/:id')
  .get(getComment)
  .put(protect, updateComment)
  .delete(protect, deleteComment);

// Special routes
router.put('/:id/upvote', protect, upvoteComment);
router.put('/:id/downvote', protect, downvoteComment);
router.put('/:id/answer', protect, markAsAnswer);
router.get('/:id/replies', getCommentReplies);
router.post('/:id/replies', protect, addReply);

module.exports = router;
