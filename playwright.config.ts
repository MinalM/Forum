import { defineConfig, devices } from '@playwright/test';

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
      url: 'http://localhost:5000/api/health',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '5000',
        NODE_ENV: 'development',
        MONGO_URI: 'mongodb://localhost:27017/ai_ml_forum',
        JWT_SECRET: 'test-jwt-secret',
        JWT_EXPIRE: '1h',
        JWT_COOKIE_EXPIRE: '1'
      },
    },
    {
      command: 'npm run client',
      url: 'http://localhost:3000',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3000',
        REACT_APP_API_URL: 'http://localhost:5000'
      },
    },
  ],
});
