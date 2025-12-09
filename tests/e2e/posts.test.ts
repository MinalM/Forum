import { test, expect } from '@playwright/test';
import { testUserData, testUserData1, testData } from './utils';

test('should allow user to create and view posts', async ({ page }) => {
  // First check if user is logged in, otherwise log in
  await page.goto('/');

  // Check if login button exists (user not logged in)
  const loginButtonExists = await page.locator('a:text("Login")').isVisible().catch(() => false);

  if (loginButtonExists) {
    // User is not logged in, so log in
    await page.goto('/login');
    await page.fill('input[name="email"]', testUserData.email);
    await page.fill('input[name="password"]', testUserData.password);

    // Wait for navigation after login - use waitForURL instead of waitForNavigation for CI reliability
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard|\//, { timeout: 30000 });
  }

  // Wait for "Create New Post" link to be visible before clicking
  await expect(page.locator('a:has-text("Create New Post")')).toBeVisible({ timeout: 15000 });

  // Create a new post - click on the link
  await page.click('a:has-text("Create New Post")');

  // Wait for navigation to create post page
  await page.waitForURL('/create-post', { timeout: 15000 });

  // Wait for form fields to be ready (categories need to load) - use 'load' for CI reliability
  await page.waitForLoadState('load');
  await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('select[name="category"]')).toBeVisible({ timeout: 15000 });

  // Fill in the form
  await page.fill('input[name="title"]', testData.post.title);

  // Wait for category options to be loaded before selecting
  //await page.waitForSelector('select[name="category"] option:not([value=""])', { timeout: 10000 });
  await expect(page.locator('select[name="category"]')).toBeEnabled({ timeout: 15000 });
  await expect.poll(
    async () => await page.locator('select[name="category"] option').count(),
    { timeout: 15000 }
  ).toBeGreaterThan(1);
  await page.selectOption('select[name="category"]', { label: 'Machine Learning Fundamentals' });

  await page.fill('textarea[name="content"]', testData.post.content);

  // Wait for navigation after form submission - use waitForURL for CI reliability
  await page.click('button[type="submit"]');

  // Wait for URL to change to post detail page (MongoDB ObjectId format)
  await page.waitForURL(/\/posts\/[a-f0-9]{24}/, { timeout: 30000 });

  // Wait for loading spinner to disappear (indicates page has loaded)
  await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 15000 }).catch(() => {
    // If loading spinner doesn't exist, that's fine - page might have loaded already
  });

  // Wait for the post detail page to be fully loaded - use 'load' instead of 'networkidle' for CI
  await page.waitForLoadState('load');

  // Wait for API response to complete by waiting for the post title to appear
  // Use a more specific selector for the title (heading role) to avoid strict mode violations
  await expect(page.getByRole('heading', { name: testData.post.title })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(testData.post.content, { exact: false })).toBeVisible({ timeout: 30000 });

  // Add a comment - wait for comment form to be visible
  await expect(page.locator('textarea[name="comment"]')).toBeVisible({ timeout: 15000 });
  await page.fill('textarea[name="comment"]', testData.comment.content);

  // Wait for comment to be posted - match the exact API endpoint pattern
  const commentResponsePromise = page.waitForResponse(
    response => {
      const url = response.url();
      const method = response.request().method();
      return url.includes('/api/posts/') && url.includes('/comments') && method === 'POST' && response.status() === 201;
    },
    { timeout: 30000 }
  );

  await page.click('button:text("Post Comment")');

  // Wait for the API response
  const commentResponse = await commentResponsePromise;
  expect(commentResponse.status()).toBe(201);

  // Wait for comment to appear in the DOM - poll for it to appear
  await expect.poll(
    async () => {
      const commentText = await page.getByText(testData.comment.content, { exact: false }).isVisible().catch(() => false);
      return commentText;
    },
    { timeout: 15000, intervals: [500, 1000, 2000] }
  ).toBe(true);

  // Final verification that comment is visible
  await expect(page.getByText(testData.comment.content, { exact: false })).toBeVisible({ timeout: 5000 });
});

/*test('should allow other users to view posts and comments', async ({ page }) => {
//   // Navigate to home page as a different user
   await page.goto('/login');
   await page.fill('input[name="email"]', testUserData1.email);
   await page.fill('input[name="password"]', testUserData1.password);
   await page.click('button[type="submit"]');

   await page.goto('/categories/67d430a8d18c85ba2fa00aa4'); // Assuming 'Machine Learning' category ID is 67d430a8d18c85ba2fa00aa4

//   // Verify post is visible to other users
   await expect(page.locator(`text="${testData.post.title}"`)).toBeVisible();
   await expect(page.locator(`text="${testData.post.content}"`)).toBeVisible();
   await expect(page.locator(`text="${testData.comment.content}"`)).toBeVisible();
      // Use a more flexible selector
   await expect(page.getByText(testData.post.title)).toBeInViewport();
   await expect(page.getByText(testData.post.content, { exact: false })).toBeVisible();
   await expect(page.getByText(testData.comment.content)).toBeVisible();
 });*/
