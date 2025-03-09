import { test as baseTest, expect } from '@playwright/test';

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
});
