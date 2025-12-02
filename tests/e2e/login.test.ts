import { test, expect } from '@playwright/test';
import { testUserData } from './utils';

test('should allow user login', async ({ page }) => {
  // Enable request/response logging
  page.on('request', request =>
    console.log(`>> ${request.method()} ${request.url()}`));
  page.on('response', response =>
    console.log(`<< ${response.status()} ${response.url()}`));

  // Navigate to login page
  await page.goto('/login');

  // Fill login form
  await page.fill('input[name="email"]', testUserData.email);
  await page.fill('input[name="password"]', testUserData.password);

  // Add debug logging
  console.log('Attempting login with:', {
    email: testUserData.email,
    password: testUserData.password
  });

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for response and log it
  const responsePromise = page.waitForResponse(response =>
    response.url().includes('/api/users/login'));
  const response = await responsePromise;
  const responseBody = await response.json().catch(() => null);
  console.log('Login response:', {
    status: response.status(),
    body: responseBody
  });

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });

  // Log current URL
  console.log('Current URL:', page.url());

  // Verify successful login - check if redirected to home page
  await expect(page).toHaveURL('/dashboard');

  // Look for welcome message with more flexible selector
  await expect(page.getByText(`Welcome back, ${testUserData.name}`, { exact: false })).toBeVisible();
});
