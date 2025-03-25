import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get server port from env with fallback
const SERVER_PORT = process.env.PORT || '2000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    // Enable JavaScript in the browser
    javaScriptEnabled: true,
    // Handle cookies and credentials
    acceptDownloads: true,
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    // Important for cookie handling
    extraHTTPHeaders: {
      'Accept': 'application/json, text/plain, */*',
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Important for CORS and cookie handling
        contextOptions: {
          ignoreHTTPSErrors: true,
          acceptDownloads: true,
          bypassCSP: true,
        }
      },
    },
  ],

  webServer: [
    {
      command: 'npm run server',
      url: `http://localhost:${SERVER_PORT}/api/health`,
      timeout: 120000,
      reuseExistingServer: true,
      env: {
        PORT: SERVER_PORT,
        NODE_ENV: process.env.NODE_ENV || 'development',
        MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum',
        JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
        JWT_EXPIRE: process.env.JWT_EXPIRE || '1h',
        JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE || '1'
      },
    },
    {
      command: 'npm run client',
      url: 'http://localhost:3000',
      timeout: 120000,
      reuseExistingServer: true,
      env: {
        PORT: '3000', // Keep this fixed for client
        REACT_APP_API_URL: `http://localhost:${SERVER_PORT}`
      },
    },
  ],
});
