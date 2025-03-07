const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

// Set up environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '1h';

beforeAll(async () => {
  // Start MongoDB Memory Server
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  global.__MONGO_URI__ = uri;
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