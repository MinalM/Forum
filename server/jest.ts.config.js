module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  maxWorkers: 1,
  setupFiles: ['<rootDir>/jest.env.js'],
};
