const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const app = require('../../server');

describe('Authentication & Authorization', () => {
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('User Registration', () => {
    const validUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    it('should register a new user and return token', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send(validUser);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.headers['set-cookie']).toBeDefined();
      
      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeDefined();
      expect(user.name).toBe(validUser.name);
    });

    it('should not register user with existing email', async () => {
      await User.create(validUser);

      const res = await request(app)
        .post('/api/users/register')
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not register user without required fields', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Test User'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Protected Routes', () => {
    let token;
    let user;

    beforeEach(async () => {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      token = user.getSignedJwtToken();
    });

    it('should access protected route with valid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('email', user.email);
    });

    it('should not access protected route without token', async () => {
      const res = await request(app)
        .get('/api/users/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not access protected route with invalid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('User Logout', () => {
    let token;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      token = user.getSignedJwtToken();
    });

    it('should clear cookie on logout', async () => {
      const res = await request(app)
        .get('/api/users/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/token=none/);
    });
  });

  describe('Update User Details', () => {
    let token;
    let user;

    beforeEach(async () => {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      token = user.getSignedJwtToken();
    });

    it('should update user details', async () => {
      const updates = {
        name: 'Updated Name',
        bio: 'Test bio',
        aiMlExperience: 'intermediate'
      };

      const res = await request(app)
        .put('/api/users/updatedetails')
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe(updates.name);
      expect(updatedUser.bio).toBe(updates.bio);
      expect(updatedUser.aiMlExperience).toBe(updates.aiMlExperience);
    });

    it('should not update email to an existing email', async () => {
      await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .put('/api/users/updatedetails')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'other@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});