const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const User = require('../../models/User');

describe('Notification preferences', () => {
  let token;
  let user;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5006);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    const userResult = await createTestUser();
    user = userResult.user;
    token = userResult.token;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/users/notification-prefs', () => {
    it('returns the signed-in user\'s digest preference, defaulting to weekly', async () => {
      const res = await request(server)
        .get('/api/users/notification-prefs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toEqual({ digest: 'weekly' });
    });

    it('requires authentication', async () => {
      const res = await request(server).get('/api/users/notification-prefs');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/users/notification-prefs', () => {
    it('updates the signed-in user\'s digest preference', async () => {
      const res = await request(server)
        .put('/api/users/notification-prefs')
        .set('Authorization', `Bearer ${token}`)
        .send({ digest: 'off' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toEqual({ digest: 'off' });

      const updated = await User.findById(user._id);
      expect(updated.notificationPrefs.digest).toBe('off');
    });

    it('rejects an invalid value and leaves the stored preference unchanged', async () => {
      const res = await request(server)
        .put('/api/users/notification-prefs')
        .set('Authorization', `Bearer ${token}`)
        .send({ digest: 'daily' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);

      const unchanged = await User.findById(user._id);
      expect(unchanged.notificationPrefs.digest).toBe('weekly');
    });

    it('requires authentication', async () => {
      const res = await request(server)
        .put('/api/users/notification-prefs')
        .send({ digest: 'off' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('only updates the signed-in user\'s own preference, not another user\'s', async () => {
      const other = await createTestUser();

      await request(server)
        .put('/api/users/notification-prefs')
        .set('Authorization', `Bearer ${token}`)
        .send({ digest: 'off' });

      const otherUser = await User.findById(other.user._id);
      expect(otherUser.notificationPrefs.digest).toBe('weekly');
    });
  });
});
