module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/config/',
    '/coverage/',
    'jest.config.js',
    'jest.setup.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  globals: {
    __TEST_SERVER__: null,
    __MONGO_URI__: null
  },
  // Prevent tests from running in parallel to avoid port conflicts
  maxWorkers: 1,
  // Add environment variables for testing
  setupFiles: ['<rootDir>/jest.env.js']
};