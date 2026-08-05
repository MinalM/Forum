const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');

describe('Posts API', () => {
  let token;
  let user;
  let adminToken;
  let admin;
  let category;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5002);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    const userResult = await createTestUser();
    user = userResult.user;
    token = userResult.token;

    const adminResult = await createTestAdmin();
    admin = adminResult.user;
    adminToken = adminResult.token;

    // Create test category
    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Get Posts', () => {
    beforeEach(async () => {
      await Post.create([
        {
          title: 'Test Post 1',
          content: 'Test content 1',
          user: user._id,
          category: category._id,
          aiMlLevel: 'beginner'
        },
        {
          title: 'Test Post 2',
          content: 'Test content 2',
          user: user._id,
          category: category._id,
          aiMlLevel: 'intermediate'
        }
      ]);
    });

    it('should get all posts', async () => {
      const res = await request(server).get('/api/posts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should get posts by category', async () => {
      const res = await request(server).get(`/api/categories/${category._id}/posts`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should get posts by user', async () => {
      const res = await request(server).get(`/api/users/${user._id}/posts`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should get posts by AI/ML level', async () => {
      const res = await request(server).get('/api/posts/level/beginner');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].aiMlLevel).toBe('beginner');
    });
  });

  describe('Get Posts by Category — sorting and solved filter', () => {
    let older, newer;

    beforeEach(async () => {
      older = await Post.create({
        title: 'Older Post',
        content: 'Older content',
        user: user._id,
        category: category._id,
        isSolved: true,
        createdAt: new Date('2026-01-01')
      });
      newer = await Post.create({
        title: 'Newer Post',
        content: 'Newer content',
        user: user._id,
        category: category._id,
        isSolved: false,
        createdAt: new Date('2026-06-01')
      });
    });

    it('should return category posts newest-first by default', async () => {
      const res = await request(server).get(`/api/categories/${category._id}/posts`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]._id).toBe(newer._id.toString());
      expect(res.body.data[1]._id).toBe(older._id.toString());
    });

    it('should filter category posts to solved only', async () => {
      const res = await request(server).get(
        `/api/categories/${category._id}/posts?solved=true`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(older._id.toString());
      expect(res.body.data[0].isSolved).toBe(true);
    });

    it('should filter category posts to unsolved only', async () => {
      const res = await request(server).get(
        `/api/categories/${category._id}/posts?solved=false`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(newer._id.toString());
      expect(res.body.data[0].isSolved).toBe(false);
    });
  });

  describe('Create Post', () => {
    const newPost = {
      title: 'New Test Post',
      content: 'New test content',
      aiMlLevel: 'beginner'
    };

    it('should create a new post', async () => {
      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...newPost,
          category: category._id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(newPost.title);
      expect(res.body.data.user.toString()).toBe(user._id.toString());
    });

    it('should not create post without authentication', async () => {
      const res = await request(server)
        .post('/api/posts')
        .send(newPost);

      expect(res.status).toBe(401);
    });

    it('should not create post with invalid category', async () => {
      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...newPost,
          category: new mongoose.Types.ObjectId()
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Update Post', () => {
    let post;

    beforeEach(async () => {
      post = await Post.create({
        title: 'Test Post',
        content: 'Test content',
        user: user._id,
        category: category._id
      });
    });

    it('should update own post', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should not update post without authentication', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}`)
        .send({
          title: 'Updated Title'
        });

      expect(res.status).toBe(401);
    });

    it('should not update another user\'s post', async () => {
      const otherUserResult = await createTestUser();
      const otherToken = otherUserResult.token;

      const res = await request(server)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Updated Title'
        });

      expect(res.status).toBe(401);
    });

    it('should allow admin to update any post', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Updated Title'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Admin Updated Title');
    });
  });

  describe('Delete Post', () => {
    let post;

    beforeEach(async () => {
      post = await Post.create({
        title: 'Test Post',
        content: 'Test content',
        user: user._id,
        category: category._id
      });
    });

    it('should delete own post', async () => {
      const res = await request(server)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const deletedPost = await Post.findById(post._id);
      expect(deletedPost).toBeNull();
    });

    it('should not delete another user\'s post', async () => {
      const otherUserResult = await createTestUser();
      const otherToken = otherUserResult.token;

      const res = await request(server)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(401);
    });

    it('should allow admin to delete any post', async () => {
      const res = await request(server)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const deletedPost = await Post.findById(post._id);
      expect(deletedPost).toBeNull();
    });
  });

  describe('Post Voting', () => {
    let post;

    beforeEach(async () => {
      post = await Post.create({
        title: 'Test Post',
        content: 'Test content',
        user: user._id,
        category: category._id
      });
    });

    it('should upvote a post', async () => {
      const res = await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).toContain(user._id.toString());
    });

    it('should remove upvote when upvoting again', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).not.toContain(user._id.toString());
    });

    it('should remove downvote when upvoting', async () => {
      await request(server)
        .put(`/api/posts/${post._id}/downvote`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(server)
        .put(`/api/posts/${post._id}/upvote`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).toContain(user._id.toString());
      expect(res.body.data.downvotes).not.toContain(user._id.toString());
    });
  });

  describe('Search Posts', () => {
    beforeEach(async () => {
      await Post.create([
        {
          title: 'Understanding Neural Networks',
          content: 'A deep dive into backpropagation.',
          user: user._id,
          category: category._id
        },
        {
          title: 'Getting Started with C++',
          content: 'Neural networks can also be written in C++.',
          user: user._id,
          category: category._id
        },
        {
          title: 'Career Advice',
          content: 'How to break into machine learning roles.',
          user: user._id,
          category: category._id
        }
      ]);
    });

    it('should return posts matching the query in the title', async () => {
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'Understanding' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Understanding Neural Networks');
    });

    it('should match across both title and content', async () => {
      // 'Neural' appears in one post's title and another post's content
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'Neural' });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      const titles = res.body.data.map(p => p.title).sort();
      expect(titles).toEqual([
        'Getting Started with C++',
        'Understanding Neural Networks'
      ]);
    });

    it('should return posts matching the query in the content', async () => {
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'backpropagation' });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Understanding Neural Networks');
    });

    it('should be case-insensitive', async () => {
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'CAREER' });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Career Advice');
    });

    it('should return an empty result set when nothing matches', async () => {
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'nonexistentterm' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('should require a query parameter', async () => {
      const res = await request(server).get('/api/posts/search');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should paginate results', async () => {
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'e', limit: 1, page: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.prev).toEqual({ page: 1, limit: 1 });
    });

    it('should treat regex special characters as literal text (injection-safe)', async () => {
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'C++' });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Getting Started with C++');
    });

    it('should not error out on unterminated regex patterns', async () => {
      const res = await request(server)
        .get('/api/posts/search')
        .query({ q: 'neural(' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
    });
  });
});