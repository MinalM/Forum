import { test, expect } from '@playwright/test';
import { testUserData1 } from './utils';

test('should allow user registration', async ({ page }) => {
  // Create a unique email for each test run using timestamp
  const uniqueEmail = `user_${Date.now()}@example.com`;
  
  // Navigate to registration page
  await page.goto('/register');

  // Fill registration form
  await page.fill('input[name="name"]', testUserData1.name);
  await page.fill('input[name="email"]', uniqueEmail);
  await page.fill('input[name="password"]', testUserData1.password);
  await page.fill('input[name="password2"]', testUserData1.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Verify successful registration - a fresh account lands on the
  // post-signup onboarding step (track/skills chips), not the dashboard.
  await expect(page).toHaveURL('/onboarding');
  await expect(page.locator('text="Registration successful! Welcome to the community."')).toBeVisible();
  await expect(page.locator('text="Two questions, then your feed."')).toBeVisible();
});
