const express = require('express');
const { getMySavedPosts } = require('../controllers/savedPosts');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getMySavedPosts);

module.exports = router;
