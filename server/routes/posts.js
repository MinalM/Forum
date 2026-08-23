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
  getPostsByLevel,
  searchPosts
} = require('../controllers/posts');
const {
  subscribeToPost,
  unsubscribeFromPost,
  getSubscriptionStatus
} = require('../controllers/subscriptions');

const Post = require('../models/Post');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Comments router will be mounted at the app level

// Special routes
router.get('/search', searchPosts);
router.get('/level/:level', getPostsByLevel);
router.put('/:id/upvote', protect, upvotePost);
router.put('/:id/downvote', protect, downvotePost);
router.put('/:id/solve', protect, solvePost);

router
  .route('/:id/subscribe')
  .get(protect, getSubscriptionStatus)
  .post(protect, subscribeToPost)
  .delete(protect, unsubscribeFromPost);

router
  .route('/')
  .get(
    advancedResults(Post, [
      { path: 'user', select: 'name avatar' },
      { path: 'category', select: 'name' },
      { path: 'comments' }
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
