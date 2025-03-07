const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, createTestAdmin, cleanupTestData } = require('./setup');
const User = require('../../models/User');

describe('Admin Operations', () => {
  let adminToken;
  let admin;
  let user;
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

    // Create test admin and regular user
    const adminResult = await createTestAdmin();
    admin = adminResult.user;
    adminToken = adminResult.token;

    const userResult = await createTestUser();
    user = userResult.user;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('User Management', () => {
    it('should get all users as admin', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2); // At least admin and regular user
    });

    it('should not allow non-admin to get all users', async () => {
      const userResult = await createTestUser();
      const userToken = userResult.token;

      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should get single user as admin', async () => {
      const res = await request(server)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(user._id.toString());
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(server)
        .get(`/api/users/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should create a new user as admin', async () => {
      const newUser = {
        name: 'New Test User',
        email: 'newtest@example.com',
        password: 'password123',
        role: 'user'
      };

      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newUser.name);
      expect(res.body.data.email).toBe(newUser.email);
    });

    it('should update a user as admin', async () => {
      const updates = {
        name: 'Updated Name',
        role: 'moderator'
      };

      const res = await request(server)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updates.name);
      expect(res.body.data.role).toBe(updates.role);
    });

    it('should return 404 when updating non-existent user', async () => {
      const res = await request(server)
        .put(`/api/users/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(404);
    });

    it('should delete a user as admin', async () => {
      const res = await request(server)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 when deleting non-existent user', async () => {
      const res = await request(server)
        .delete(`/api/users/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
