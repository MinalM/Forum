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

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Special routes
router.put('/:id/upvote', protect, upvoteComment);
router.put('/:id/downvote', protect, downvoteComment);
router.put('/:id/answer', protect, markAsAnswer);
router.get('/:id/replies', getCommentReplies);
router.post('/:id/replies', protect, addReply);

router
  .route('/')
  .get(
    advancedResults(Comment, { path: 'user', select: 'name avatar' }),
    getComments
  )
  .post(protect, addComment);

router
  .route('/:id')
  .get(getComment)
  .put(protect, updateComment)
  .delete(protect, deleteComment);

module.exports = router;
