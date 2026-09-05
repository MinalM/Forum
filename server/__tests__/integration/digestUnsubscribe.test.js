const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../../models/User');
const app = require('../../server');

// One-click unsubscribe link emailed with each weekly digest
// (server/utils/digestMailer.js). No route/scheduled job existed before
// this slice - BACKLOG.md's "Weekly digest: send the email, a scheduled
// entry point, and the unsubscribe token" item.
describe('GET /api/users/digest-unsubscribe/:token', () => {
  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  const createUserWithToken = async ({ expired = false } = {}) => {
    const user = await User.create({
      name: 'Digest Subscriber',
      email: `digest-${Date.now()}-${Math.random()}@example.com`,
      password: 'password123'
    });

    const plainToken = crypto.randomBytes(20).toString('hex');
    user.digestUnsubscribeToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    user.digestUnsubscribeExpire = expired
      ? Date.now() - 1000
      : Date.now() + 30 * 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    return { user, plainToken };
  };

  it('flips notificationPrefs.digest to off for a valid token, with no session', async () => {
    const { user, plainToken } = await createUserWithToken();

    const res = await request(app).get(`/api/users/digest-unsubscribe/${plainToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);

    const updated = await User.findById(user._id);
    expect(updated.notificationPrefs.digest).toBe('off');
    expect(updated.digestUnsubscribeToken).toBeFalsy();
    expect(updated.digestUnsubscribeExpire).toBeFalsy();
  });

  it('rejects a reused token', async () => {
    const { plainToken } = await createUserWithToken();

    await request(app).get(`/api/users/digest-unsubscribe/${plainToken}`);

    const res = await request(app).get(`/api/users/digest-unsubscribe/${plainToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('rejects an expired token without changing the preference', async () => {
    const { user, plainToken } = await createUserWithToken({ expired: true });

    const res = await request(app).get(`/api/users/digest-unsubscribe/${plainToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);

    const unchanged = await User.findById(user._id);
    expect(unchanged.notificationPrefs.digest).toBe('weekly');
  });

  it('rejects a garbage/unknown token', async () => {
    const res = await request(app).get('/api/users/digest-unsubscribe/not-a-real-token');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });
});
