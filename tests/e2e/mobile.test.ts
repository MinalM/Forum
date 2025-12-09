import { test as baseTest, expect, devices, Browser, TestInfo } from '@playwright/test';
import { testUserData } from './utils';

export const test = baseTest.extend<{
  mobileContext: { browser: Browser; context: any };
}>({
  mobileContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
    });
    await use({ browser, context });
    await context.close();
  },
});

test('should work on mobile screen', async ({ mobileContext, page }) => {
  // Navigate to the login page
  await page.goto('/login');

  // Check if the mobile viewport is working
  const viewport = await page.evaluate(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  });

  console.log('Mobile viewport:', viewport);
  // Fill login form
  await page.fill('input[name="email"]', testUserData.email);
  await page.fill('input[name="password"]', testUserData.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 30000 });

  // Verify successful login - check if redirected to home page
  await expect(page).toHaveURL('/dashboard');
  // Test your mobile-specific functionality here
  // For example, check if the mobile menu works
  // await page.click('button.mobile-menu');
  // await expect(page).toHaveURL('/dashboard');
});
