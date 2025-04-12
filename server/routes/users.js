const express = require('express');
const {
  getUsers,
  getUser,
  getUserProfile,
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
  googleSuccess,
  changeUserRole,
  banUser,
  timeoutUser,
  unbanUser
} = require('../controllers/users');

const User = require('../models/User');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logout);

// Public profile endpoint
router.get('/:id/profile', getUserProfile);

// User posts endpoint (public)
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

// Moderator/Admin routes
router.use(authorize('admin', 'moderator'));
router.put('/:id/timeout', timeoutUser);
router.put('/:id/unban', unbanUser);

// Admin only routes
router.use(authorize('admin'));
router.get('/', advancedResults(User), getUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/role', changeUserRole);
router.put('/:id/ban', banUser);

module.exports = router;
