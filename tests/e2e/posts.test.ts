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
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle' });
  }
  
  // Now we're logged in, navigate to home page
  await page.goto('/dashboard');

  // Create a new post - click on the link instead of button
  await page.click('a:has-text("Create New Post")');
  // Alternative selectors if the above doesn't work:
  // await page.click('a[href="/create-post"]');
  // await page.click('a.btn.btn-link:has(i.fas.fa-plus)');
  
  //await page.click('button:text("Create New Post")');
  await page.fill('input[name="title"]', testData.post.title);
  
  await page.click('select[name="category"]');
  await page.selectOption('select[name="category"]', { label: 'Machine Learning Fundamentals' }); // Using existing category

  await page.fill('textarea[name="content"]', testData.post.content);
  await page.click('button[type="submit"]');

  // Verify post is visible
  await expect(page.locator(`text="${testData.post.title}"`)).toBeVisible();
  await expect(page.locator(`text="${testData.post.content}"`)).toBeVisible();

  // Add a comment
  await page.fill('textarea[name="comment"]', testData.comment.content);
  await page.click('button:text("Post Comment")');

  // Verify comment is visible
  await expect(page.locator(`text="${testData.comment.content}"`)).toBeVisible();
});

// test('should allow other users to view posts and comments', async ({ page }) => {
//   // Navigate to home page as a different user
//   await page.goto('/login');
//   await page.fill('input[name="email"]', testUserData1.email);
//   await page.fill('input[name="password"]', testUserData1.password);
//   await page.click('button[type="submit"]');

//   await page.goto('/categories/67cbb5ca71e8be810c50104b'); // Assuming 'Career Advice' category ID is '67cbb5ca71e8

//   // Verify post is visible to other users
//   //await expect(page.locator(`text="${testData.post.title}"`)).toBeVisible();
//   //await expect(page.locator(`text="${testData.post.content}"`)).toBeVisible();
//   //await expect(page.locator(`text="${testData.comment.content}"`)).toBeVisible();
//      // Use a more flexible selector
//   await expect(page.getByText(testData.post.title)).toBeInViewport();
//   await expect(page.getByText(testData.post.content, { exact: false })).toBeVisible();
//   await expect(page.getByText(testData.comment.content)).toBeVisible();
// });
