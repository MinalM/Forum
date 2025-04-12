const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  
  console.log('Auth Debug:', {
    hasAuthHeader: !!req.headers.authorization,
    hasCookies: !!req.cookies,
    cookies: req.cookies,
    authHeader: req.headers.authorization
  });

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
    console.log('Using token from Authorization header');
  } else if (req.cookies && req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
    console.log('Using token from cookie');
  }

  // Make sure token exists
  if (!token) {
    console.log('No token found in request');
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    console.log('Attempting to verify token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully, decoded:', { userId: decoded.id });

    const user = await User.findById(decoded.id);
    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      console.log('User not found in database');
      return next(new ErrorResponse('User not found', 401));
    }
    
    // Check if user is banned
    if (user.isBanned) {
      // Check if the ban is temporary and has expired
      if (user.bannedUntil && user.bannedUntil < Date.now()) {
        // Ban has expired, unban the user
        user.isBanned = false;
        user.banReason = null;
        user.bannedUntil = null;
        user.unbannedAt = Date.now();
        user.unbannedBy = null; // System unban
        await user.save();
      } else {
        // User is still banned
        const bannedMessage = user.bannedUntil 
          ? `Your account is temporarily restricted until ${user.bannedUntil.toLocaleString()}. Reason: ${user.banReason || 'Violation of forum rules'}`
          : `Your account has been permanently banned. Reason: ${user.banReason || 'Violation of forum rules'}`;
        
        return next(new ErrorResponse(bannedMessage, 403));
      }
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
