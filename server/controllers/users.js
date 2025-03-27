const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const passport = require('passport');
const User = require('../models/User');

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'user'
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Debug logging
  console.log('Login attempt for email:', email);

  // Validate email & password
  if (!email || !password) {
    console.log('Missing email or password');
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    console.log('User not found with email:', email);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  console.log('User found:', { id: user._id, email: user.email, authProvider: user.authProvider });

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  console.log('Password match result:', isMatch);

  if (!isMatch) {
    console.log('Password does not match for user:', user._id);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Log user out / clear cookie
// @route   GET /api/users/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/users/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    bio: req.body.bio,
    aiMlExperience: req.body.aiMlExperience,
    currentRole: req.body.currentRole,
    targetRole: req.body.targetRole,
    skills: req.body.skills
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(
    key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  // Check if trying to update email
  if (fieldsToUpdate.email) {
    // Check if email already exists for another user
    const existingUser = await User.findOne({
      email: fieldsToUpdate.email,
      _id: { $ne: req.user.id }
    });

    if (existingUser) {
      return next(new ErrorResponse('Email already exists', 400));
    }
  }

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  // Return a new token to ensure any role changes are reflected
  sendTokenResponse(user, 200, res);
});

// @desc    Update password
// @route   PUT /api/users/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  // Get fresh user data with new password hash
  const updatedUser = await User.findById(user._id).select('+password');
  sendTokenResponse(updatedUser, 200, res);
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  await User.deleteOne({ _id: user._id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Google OAuth login
// @route   GET /api/users/auth/google
// @access  Public
exports.googleLogin = passport.authenticate('google', { scope: ['profile', 'email'] });

// @desc    Google OAuth callback
// @route   GET /api/users/auth/google/callback
// @access  Public
exports.googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err) {
      return next(new ErrorResponse('Authentication error', 500));
    }
    
    if (!user) {
      return next(new ErrorResponse('Authentication failed', 401));
    }

    // Create token
    const token = user.getSignedJwtToken();

    // Set cookie options
    const options = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }

    // Set cookie with token
    res.cookie('token', token, options);
    
    // Redirect to frontend with token in query params
    res.redirect(`http://localhost:3000/oauth-success?token=${token}`);
  })(req, res, next);
};

// @desc    Check if user is logged in via Google
// @route   GET /api/users/auth/google/success
// @access  Private
exports.googleSuccess = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorResponse('Not authenticated', 401));
  }

  res.status(200).json({
    success: true,
    data: req.user
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};
