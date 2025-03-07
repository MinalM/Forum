const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_COOKIE_EXPIRE = '1';

// Helper function to create test user and get token
const createTestUser = async (role = 'user') => {
  const user = await User.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    role
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  return { user, token };
};

// Helper function to create test admin
const createTestAdmin = async () => {
  return createTestUser('admin');
};

// Helper function to clean up test data
const cleanupTestData = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    const promises = [];
    for (const key in collections) {
      promises.push(collections[key].deleteMany({}));
    }
    await Promise.all(promises);
  }
};

module.exports = {
  createTestUser,
  createTestAdmin,
  cleanupTestData
};