const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const User = require('../../models/User');

describe('User Account Operations', () => {
  let token;
  let user;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5005);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    // Create test user
    const userResult = await createTestUser();
    user = userResult.user;
    token = userResult.token;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Update Password', () => {
    it('should update user password with valid current password', async () => {
      // First update the password
      const res = await request(server)
        .put('/api/users/updatepassword')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');

      // Get the new token
      const newToken = res.body.token;

      // Wait a moment for password hash to be saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify we can login with new password
      const loginRes = await request(server)
        .post('/api/users/login')
        .send({
          email: user.email, // Use the actual test user email
          password: 'newpassword456'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('success', true);
    });

    it('should not update password with incorrect current password', async () => {
      const res = await request(server)
        .put('/api/users/updatepassword')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not update password without authentication', async () => {
      const res = await request(server)
        .put('/api/users/updatepassword')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Get Current User', () => {
    it('should get current user profile', async () => {
      const res = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', user._id.toString());
      expect(res.body.data).toHaveProperty('name', user.name);
      expect(res.body.data).toHaveProperty('email', user.email);
    });
  });
});
