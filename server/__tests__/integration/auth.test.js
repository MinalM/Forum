const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../../models/User');
const app = require('../../server');

jest.mock('../../utils/sendEmail', () => jest.fn().mockResolvedValue());
const sendEmail = require('../../utils/sendEmail');

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

    it('starts a freshly registered user with onboardingCompleted: false', async () => {
      await request(app)
        .post('/api/users/register')
        .send(validUser);

      const user = await User.findOne({ email: validUser.email });
      expect(user.onboardingCompleted).toBe(false);
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

    it('can mark onboarding complete and persist a picked target role and skills', async () => {
      const res = await request(app)
        .put('/api/users/updatedetails')
        .set('Authorization', `Bearer ${token}`)
        .send({
          onboardingCompleted: true,
          targetRole: 'ML Engineer',
          skills: ['Python', 'pandas']
        });

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.onboardingCompleted).toBe(true);
      expect(updatedUser.targetRole).toBe('ML Engineer');
      expect(updatedUser.skills).toEqual(['Python', 'pandas']);
    });
  });

  describe('Forgot / Reset Password', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    describe('POST /api/users/forgotpassword', () => {
      it('responds 200 and emails a reset link for a known email', async () => {
        const res = await request(app)
          .post('/api/users/forgotpassword')
          .send({ email: 'test@example.com' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(sendEmail).toHaveBeenCalledTimes(1);
        expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'test@example.com' });

        const user = await User.findOne({ email: 'test@example.com' });
        expect(user.resetPasswordToken).toBeTruthy();
        expect(user.resetPasswordExpire.getTime()).toBeGreaterThan(Date.now());
      });

      it('responds 200 without emailing or writing a token for an unknown email', async () => {
        const res = await request(app)
          .post('/api/users/forgotpassword')
          .send({ email: 'nobody@example.com' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(sendEmail).not.toHaveBeenCalled();
      });

      it('responds 200 without emailing or writing a token for a Google-only account', async () => {
        await User.create({
          name: 'OAuth User',
          email: 'oauth@example.com',
          googleId: 'google-123',
          authProvider: 'google'
        });

        const res = await request(app)
          .post('/api/users/forgotpassword')
          .send({ email: 'oauth@example.com' });

        expect(res.status).toBe(200);
        expect(sendEmail).not.toHaveBeenCalled();

        const user = await User.findOne({ email: 'oauth@example.com' });
        expect(user.resetPasswordToken).toBeFalsy();
      });
    });

    describe('PUT /api/users/resetpassword/:resettoken', () => {
      const getResetToken = async email => {
        await request(app).post('/api/users/forgotpassword').send({ email });
        const plainToken = sendEmail.mock.calls[0][0].text.match(/reset-password\/([a-f0-9]+)/)[1];
        return plainToken;
      };

      it('sets the new password and clears the token for a valid token', async () => {
        const resetToken = await getResetToken('test@example.com');

        const res = await request(app)
          .put(`/api/users/resetpassword/${resetToken}`)
          .send({ password: 'newpassword456' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');

        const user = await User.findOne({ email: 'test@example.com' });
        expect(user.resetPasswordToken).toBeFalsy();
        expect(user.resetPasswordExpire).toBeFalsy();

        const loginRes = await request(app)
          .post('/api/users/login')
          .send({ email: 'test@example.com', password: 'newpassword456' });
        expect(loginRes.status).toBe(200);
      });

      it('rejects a reused token', async () => {
        const resetToken = await getResetToken('test@example.com');

        await request(app)
          .put(`/api/users/resetpassword/${resetToken}`)
          .send({ password: 'newpassword456' });

        const res = await request(app)
          .put(`/api/users/resetpassword/${resetToken}`)
          .send({ password: 'anotherpassword789' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
      });

      it('rejects an expired token', async () => {
        const resetToken = await getResetToken('test@example.com');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        await User.findOneAndUpdate(
          { email: 'test@example.com' },
          { resetPasswordExpire: Date.now() - 1000 }
        );

        const res = await request(app)
          .put(`/api/users/resetpassword/${resetToken}`)
          .send({ password: 'newpassword456' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);

        // Sanity check the token really was the stored one before expiry made it invalid.
        const user = await User.findOne({ email: 'test@example.com' });
        expect(user.resetPasswordToken).toBe(hashedToken);
      });

      it('rejects a garbage/unknown token', async () => {
        const res = await request(app)
          .put('/api/users/resetpassword/not-a-real-token')
          .send({ password: 'newpassword456' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
      });

      it('rejects a reset attempt for a Google-only account even with a manually-set token', async () => {
        const oauthUser = await User.create({
          name: 'OAuth User',
          email: 'oauth@example.com',
          googleId: 'google-456',
          authProvider: 'google'
        });

        const plainToken = 'a-manually-issued-token';
        oauthUser.resetPasswordToken = crypto.createHash('sha256').update(plainToken).digest('hex');
        oauthUser.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
        await oauthUser.save({ validateBeforeSave: false });

        const res = await request(app)
          .put(`/api/users/resetpassword/${plainToken}`)
          .send({ password: 'newpassword456' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
      });
    });
  });
});