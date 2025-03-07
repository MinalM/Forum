const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let mongod;

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_COOKIE_EXPIRE = '1';
process.env.NODE_ENV = 'test';

// Increase timeout for all tests
jest.setTimeout(30000);

beforeAll(async () => {
  // Start MongoDB Memory Server
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  global.__MONGO_URI__ = uri;

  // Connect to the in-memory database
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  // Clean up and close MongoDB Memory Server
  await mongoose.disconnect();
  await mongod.stop();
});

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Close any remaining handles
afterEach(async () => {
  // Clear all collections
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    const promises = [];
    for (const key in collections) {
      promises.push(collections[key].deleteMany({}));
    }
    await Promise.all(promises);
  }

  // Reset any mocked data
  jest.restoreAllMocks();
});

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

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
});

global.createTestUser = createTestUser;
global.createTestAdmin = createTestAdmin;
global.cleanupTestData = cleanupTestData;