const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');

describe('Categories API', () => {
  let token;
  let user;
  let adminToken;
  let admin;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5004);
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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Get Categories', () => {
    beforeEach(async () => {
      await Category.create([
        {
          name: 'Machine Learning',
          description: 'ML topics',
          isAiMlSpecific: true
        },
        {
          name: 'General',
          description: 'General topics',
          isAiMlSpecific: false
        }
      ]);
    });

    it('should get all categories', async () => {
      const res = await request(server).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should get single category', async () => {
      const category = await Category.create({
        name: 'Test Category',
        description: 'Test Description'
      });

      const res = await request(server).get(`/api/categories/${category._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Category');
    });

    it('should get AI/ML specific categories', async () => {
      const res = await request(server).get('/api/categories/aiml');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isAiMlSpecific).toBe(true);
    });

    it('should return 404 for non-existent category', async () => {
      const res = await request(server).get(
        `/api/categories/${new mongoose.Types.ObjectId()}`
      );

      expect(res.status).toBe(404);
    });
  });

  describe('Create Category', () => {
    const newCategory = {
      name: 'New Category',
      description: 'New Description',
      isAiMlSpecific: true
    };

    it('should create category if admin', async () => {
      const res = await request(server)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCategory);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newCategory.name);
    });

    it('should not create category if not admin', async () => {
      const res = await request(server)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send(newCategory);

      expect(res.status).toBe(403);
    });

    it('should not create category without authentication', async () => {
      const res = await request(server)
        .post('/api/categories')
        .send(newCategory);

      expect(res.status).toBe(401);
    });

    it('should not create duplicate category', async () => {
      await Category.create(newCategory);

      const res = await request(server)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCategory);

      expect(res.status).toBe(400);
    });
  });

  describe('Update Category', () => {
    let category;

    beforeEach(async () => {
      category = await Category.create({
        name: 'Test Category',
        description: 'Test Description'
      });
    });

    it('should update category if admin', async () => {
      const res = await request(server)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Category',
          description: 'Updated Description'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Category');
      expect(res.body.data.description).toBe('Updated Description');
    });

    it('should not update category if not admin', async () => {
      const res = await request(server)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Category'
        });

      expect(res.status).toBe(403);
    });

    it('should not update non-existent category', async () => {
      const res = await request(server)
        .put(`/api/categories/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Category'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Delete Category', () => {
    let category;

    beforeEach(async () => {
      category = await Category.create({
        name: 'Test Category',
        description: 'Test Description'
      });
    });

    it('should delete category if admin', async () => {
      const res = await request(server)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      
      const deletedCategory = await Category.findById(category._id);
      expect(deletedCategory).toBeNull();
    });

    it('should not delete category if not admin', async () => {
      const res = await request(server)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should not delete non-existent category', async () => {
      const res = await request(server)
        .delete(`/api/categories/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});