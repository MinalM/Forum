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
    
    // Wait for navigation after login
    const loginNavigationPromise = page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.click('button[type="submit"]');
    await loginNavigationPromise;
    
    // Verify we're logged in by checking URL
    await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
  }
  
  // Wait for "Create New Post" link to be visible before clicking
  await expect(page.locator('a:has-text("Create New Post")')).toBeVisible({ timeout: 10000 });
  
  // Create a new post - click on the link
  await page.click('a:has-text("Create New Post")');
  
  // Wait for navigation to create post page
  await page.waitForURL('/create-post', { timeout: 10000 });
  
  // Wait for form fields to be ready (categories need to load)
  await page.waitForLoadState('networkidle');
  await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('select[name="category"]')).toBeVisible({ timeout: 10000 });
  
  // Fill in the form
  await page.fill('input[name="title"]', testData.post.title);
  
  // Wait for category options to be loaded before selecting
  //await page.waitForSelector('select[name="category"] option:not([value=""])', { timeout: 10000 });
  await expect(page.locator('select[name="category"]')).toBeEnabled({ timeout: 10_000 });
  await expect.poll(
    async () => await page.locator('select[name="category"] option').count(),
    { timeout: 10_000 }
  ).toBeGreaterThan(1);
  await page.selectOption('select[name="category"]', { label: 'Machine Learning Fundamentals' });

  await page.fill('textarea[name="content"]', testData.post.content);
  
  // Wait for navigation after form submission
  const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.click('button[type="submit"]');
  await navigationPromise;
  
  // Wait for URL to change to post detail page (MongoDB ObjectId format)
  await page.waitForURL(/\/posts\/[a-f0-9]{24}/, { timeout: 15000 });
  
  // Wait for loading spinner to disappear (indicates page has loaded)
  await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 10000 }).catch(() => {
    // If loading spinner doesn't exist, that's fine - page might have loaded already
  });
  
  // Wait for the post detail page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Wait for API response to complete by waiting for the post title to appear
  // Use a more specific selector for the title (heading role) to avoid strict mode violations
  await expect(page.getByRole('heading', { name: testData.post.title })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(testData.post.content, { exact: false })).toBeVisible({ timeout: 15000 });

  // Add a comment - wait for comment form to be visible
  await expect(page.locator('textarea[name="comment"]')).toBeVisible({ timeout: 5000 });
  await page.fill('textarea[name="comment"]', testData.comment.content);
  
  // Wait for comment to be posted (wait for network request to complete)
  const commentResponsePromise = page.waitForResponse(
    response => response.url().includes('/api/posts/') && response.url().includes('/comments') && response.request().method() === 'POST',
    { timeout: 10000 }
  ).catch(() => null);
  
  await page.click('button:text("Post Comment")');
  await commentResponsePromise;
  
  // Wait a bit for the comment to appear in the DOM
  await page.waitForTimeout(1000);
  
  // Verify comment is visible - use getByText which is more reliable
  await expect(page.getByText(testData.comment.content, { exact: false })).toBeVisible({ timeout: 10000 });
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
