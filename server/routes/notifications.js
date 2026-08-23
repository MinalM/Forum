const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAllAsRead
} = require('../controllers/notifications');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getNotifications);
router.route('/unread/count').get(getUnreadCount);
router.route('/read-all').put(markAllAsRead);

module.exports = router;
