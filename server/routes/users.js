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

// Google OAuth routes
router.get('/auth/google', googleLogin);
router.get('/auth/google/callback', googleCallback);
router.get('/auth/google/success', protect, googleSuccess);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
router.get('/:userId/posts', async (req, res, next) => {
  try {
    // Check if user is requesting their own posts or is an admin
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access other users\' posts'
      });
    }
    
    // Forward the request to the posts controller
    req.query.user = req.params.userId;
    res.locals.advancedResults = {
      success: true,
      data: await require('../models/Post').find({ user: req.params.userId })
        .populate('category', 'name')
        .populate('user', 'name avatar')
        .sort('-createdAt')
    };
    
    res.status(200).json(res.locals.advancedResults);
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
