// Set environment variables for testing
process.env.NODE_ENV = 'test';
// Disable MD5 check for mongodb-memory-server — Windows Defender modifies
// the downloaded archive during scanning, causing a checksum mismatch even
// though the binary is valid and functional.
process.env.MONGOMS_MD5_CHECK = '0';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_COOKIE_EXPIRE = '1';
process.env.MONGO_URI = 'mongodb://localhost:27017/forum-test';

// Disable console.log during tests unless explicitly enabled
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}