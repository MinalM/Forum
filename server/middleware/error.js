const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  // Log detailed error information
  console.log('Error Stack:', err.stack);
  console.log('Error Name:', err.name);
  console.log('Error Message:', err.message);
  console.log('Error Code:', err.code);
  console.log('Full Error:', err);

  let error = { ...err };

  // Copy all properties from err to error
  Object.getOwnPropertyNames(err).forEach(prop => {
    error[prop] = err[prop];
  });

  // Ensure message is copied
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Handle other errors
  if (!error.statusCode) {
    error = new ErrorResponse(error.message || 'Server Error', 500);
  }

  // Log final error response
  console.log('Final Error Response:', {
    statusCode: error.statusCode,
    message: error.message
  });

  res.status(error.statusCode).json({
    success: false,
    error: error.message
  });
};

module.exports = errorHandler;
