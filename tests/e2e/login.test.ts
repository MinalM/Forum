import { test, expect } from '@playwright/test';
import { testUserData } from './utils';

test('should allow user login', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill login form
  await page.fill('input[name="email"]', testUserData.email);
  await page.fill('input[name="password"]', testUserData.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // Verify successful login - check if redirected to home page
  await expect(page).toHaveURL('/dashboard');
  
  // Look for welcome message with more flexible selector
  // Try one of these approaches:
  //await expect(page.locator(`text=Welcome back, ${testUserData.name}`)).toBeVisible();
  // OR if the exact format is different:
  await expect(page.getByText(`Welcome back, ${testUserData.name}`, { exact: false })).toBeVisible();
});
