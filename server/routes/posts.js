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
  pinPost,
  lockThread,
  getPostsByLevel,
  searchPosts,
  getRecommendedUnanswered,
  getRelatedPosts
} = require('../controllers/posts');
const {
  subscribeToPost,
  unsubscribeFromPost,
  getSubscriptionStatus
} = require('../controllers/subscriptions');
const {
  savePost,
  unsavePost,
  getSaveStatus
} = require('../controllers/savedPosts');

const Post = require('../models/Post');

const router = express.Router({ mergeParams: true });

const { protect, authorize, optionalAuth } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Comments router will be mounted at the app level

// Special routes
router.get('/search', searchPosts);
router.get('/level/:level', getPostsByLevel);
router.get('/recommended', protect, getRecommendedUnanswered);
router.put('/:id/upvote', protect, upvotePost);
router.put('/:id/downvote', protect, downvotePost);
router.put('/:id/solve', protect, solvePost);
// pinPost/lockThread do their own admin/moderator check (see
// server/controllers/posts.js), matching solvePost's own-author check above -
// these routes were never mounted before, so PUT .../pin and .../lock 404'd
// for every caller, including the moderation buttons in PostDetail.js.
router.put('/:id/pin', protect, pinPost);
router.put('/:id/lock', protect, lockThread);
router.get('/:id/related', getRelatedPosts);

router
  .route('/:id/subscribe')
  .get(protect, getSubscriptionStatus)
  .post(protect, subscribeToPost)
  .delete(protect, unsubscribeFromPost);

router
  .route('/:id/save')
  .get(protect, getSaveStatus)
  .post(protect, savePost)
  .delete(protect, unsavePost);

router
  .route('/')
  .get(
    optionalAuth,
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
