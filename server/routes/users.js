const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  registerUser,
  loginUser,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  googleLogin,
  googleCallback,
  googleSuccess
} = require('../controllers/users');

const User = require('../models/User');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logout);

// Make user-related public routes available before protection middleware
router.get('/:id([0-9a-fA-F]{24})', getUser);
router.get('/:userId/posts', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.userId}`
      });
    }

    const posts = await require('../models/Post')
      .find({ user: req.params.userId })
      .populate('category', 'name')
      .populate('user', 'name avatar')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (err) {
    next(err);
  }
});

// Google OAuth routes
router.get('/auth/google', googleLogin);
router.get('/auth/google/callback', googleCallback);
router.get('/auth/google/success', protect, googleSuccess);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
// Make the user posts route public
router.get('/:userId/posts', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.userId}`
      });
    }

    const posts = await require('../models/Post')
      .find({ user: req.params.userId })
      .populate('category', 'name')
      .populate('user', 'name avatar')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (err) {
    next(err);
  }
});

// Make the getUser route public
router.get('/:id([0-9a-fA-F]{24})', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

// Admin only routes
router.use(authorize('admin'));
router
  .route('/')
  .get(advancedResults(User), getUsers)
  .post(createUser);

router
  .route('/:id')
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
