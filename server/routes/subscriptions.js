const express = require('express');
const { getMySubscriptions } = require('../controllers/subscriptions');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getMySubscriptions);

module.exports = router;
