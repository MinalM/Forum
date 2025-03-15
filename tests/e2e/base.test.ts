import { test as baseTest, expect, devices } from '@playwright/test';

export const test = baseTest.extend({
  // Store user credentials for reuse
  user: {
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User',
  },
  user1: {
    email: 'test1@example.com',
    password: 'Password123!',
    name: 'Test User1',
  },
  // Store post and comment data for testing
  testData: {
    post: {
      title: 'Test Post',
      content: 'This is a test post content.',
    },
    comment: {
      content: 'This is a test comment.',
    },
  },
  // Add mobile device context
  mobileContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
    });
    await use(context);
    await context.close();
  },
});
