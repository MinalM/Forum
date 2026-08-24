const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const passport = require('passport');
const User = require('../models/User');
const { userSignupCounter, userLoginCounter, userLoginOAuthCounter, userSessionCounter } = require('../dist/instrumentation/metrics');

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
    role: role || 'user',
    onboardingCompleted: false
  });

  // Increment signup counter
  userSignupCounter.add(1, {
    auth_method: 'regular',
    role: user.role
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

  // Increment login counter
  userLoginCounter.add(1, {
    auth_method: 'regular',
    role: user.role
  });

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
    skills: req.body.skills,
    onboardingCompleted: req.body.onboardingCompleted
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
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access all users`,
        403
      )
    );
  }

  res.status(200).json(res.advancedResults);
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access user details`,
        403
      )
    );
  }

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

// @desc    Get user public profile
// @route   GET /api/users/:id/profile
// @access  Public
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('name email role bio avatar aiMlExperience currentRole targetRole skills createdAt');

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
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to create users`,
        403
      )
    );
  }

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
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update users`,
        403
      )
    );
  }

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
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete users`,
        403
      )
    );
  }

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

// @desc    Change user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.changeUserRole = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to change user roles`,
        403
      )
    );
  }

  // Check if role is valid
  const validRoles = ['user', 'moderator', 'admin'];
  if (!validRoles.includes(req.body.role)) {
    return next(
      new ErrorResponse(`Role ${req.body.role} is not valid`, 400)
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  user.role = req.body.role;
  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Ban user 
// @route   PUT /api/users/:id/ban
// @access  Private/Admin
exports.banUser = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to ban users`,
        403
      )
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Cannot ban yourself or other admins
  if (user._id.toString() === req.user.id || user.role === 'admin') {
    return next(
      new ErrorResponse(`Cannot ban yourself or other administrators`, 400)
    );
  }

  user.isBanned = true;
  user.banReason = req.body.reason || 'Violation of forum rules';
  user.bannedUntil = null; // Permanent ban
  user.bannedBy = req.user.id;
  user.bannedAt = Date.now();

  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Timeout user (temporary restriction)
// @route   PUT /api/users/:id/timeout
// @access  Private/Admin/Moderator
exports.timeoutUser = asyncHandler(async (req, res, next) => {
  // Check if user is moderator or admin
  if (!['moderator', 'admin'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to timeout users`,
        403
      )
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Cannot timeout yourself, admins, or other moderators if you're a moderator
  if (
    user._id.toString() === req.user.id ||
    user.role === 'admin' ||
    (user.role === 'moderator' && req.user.role === 'moderator')
  ) {
    return next(
      new ErrorResponse(`Cannot timeout yourself, administrators, or other moderators`, 400)
    );
  }

  // Duration in hours, default 24 hours
  const durationHours = req.body.durationHours || 24;
  const timeoutUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  user.isBanned = true;
  user.banReason = req.body.reason || 'Temporary restriction due to rule violation';
  user.bannedUntil = timeoutUntil;
  user.bannedBy = req.user.id;
  user.bannedAt = Date.now();

  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Remove ban/timeout from user
// @route   PUT /api/users/:id/unban
// @access  Private/Admin/Moderator
exports.unbanUser = asyncHandler(async (req, res, next) => {
  // Check if user is moderator or admin
  if (!['moderator', 'admin'].includes(req.user.role)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to remove user restrictions`,
        403
      )
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Moderators can only remove temporary restrictions, not permanent bans
  if (req.user.role === 'moderator' && !user.bannedUntil) {
    return next(
      new ErrorResponse(
        `Moderators cannot remove permanent bans, only administrators can`,
        403
      )
    );
  }

  user.isBanned = false;
  user.banReason = null;
  user.bannedUntil = null;
  user.unbannedBy = req.user.id;
  user.unbannedAt = Date.now();

  await user.save();

  res.status(200).json({
    success: true,
    data: user
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

    // Increment OAuth login counter
    userLoginOAuthCounter.add(1, {
      auth_method: 'oauth',
      provider: 'google',
      role: user.role
    });

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
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/oauth-success?token=${token}`);
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
  // Increment session counter
  userSessionCounter.add(1, {
    role: user.role
  });

  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  };

  console.log('Setting auth cookie with options:', {
    ...options,
    token: token ? 'present' : 'missing',
    env: process.env.NODE_ENV,
    cookieExpiry: options.expires.toISOString()
  });

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};
