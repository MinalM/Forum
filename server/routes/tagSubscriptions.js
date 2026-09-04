const express = require('express');
const {
  followTag,
  unfollowTag,
  getTagFollowStatus,
  getMyTagSubscriptions
} = require('../controllers/tagSubscriptions');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/subscriptions').get(getMyTagSubscriptions);

router
  .route('/:tag/subscribe')
  .get(getTagFollowStatus)
  .post(followTag)
  .delete(unfollowTag);

module.exports = router;
