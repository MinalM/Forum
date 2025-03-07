const express = require('express');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  upvotePost,
  downvotePost,
  solvePost,
  getPostsByLevel
} = require('../controllers/posts');

const Post = require('../models/Post');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Comments router will be mounted at the app level

// Special routes
router.get('/level/:level', getPostsByLevel);
router.put('/:id/upvote', protect, upvotePost);
router.put('/:id/downvote', protect, downvotePost);
router.put('/:id/solve', protect, solvePost);

router
  .route('/')
  .get(
    advancedResults(Post, [
      { path: 'user', select: 'name avatar' },
      { path: 'category', select: 'name' }
    ]),
    getPosts
  )
  .post(protect, createPost);

router
  .route('/:id')
  .get(getPost)
  .put(protect, updatePost)
  .delete(protect, deletePost);

module.exports = router;
