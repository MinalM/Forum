const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const TagSubscription = require('../../models/TagSubscription');
const Notification = require('../../models/Notification');

describe('Tag follow/unfollow and tag-post notifications', () => {
  let category;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5011);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/tags/:tag/subscribe', () => {
    it('follows a tag', async () => {
      const member = await createTestUser();

      const res = await request(server)
        .post('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(true);

      const subscription = await TagSubscription.findOne({ user: member.user._id, tag: 'pytorch' });
      expect(subscription).not.toBeNull();
    });

    it('is idempotent when already following', async () => {
      const member = await createTestUser();

      await request(server)
        .post('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      const res = await request(server)
        .post('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);

      const count = await TagSubscription.countDocuments({ user: member.user._id, tag: 'pytorch' });
      expect(count).toBe(1);
    });

    it('normalizes tag casing so the same tag can only be followed once', async () => {
      const member = await createTestUser();

      await request(server)
        .post('/api/tags/PyTorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      const res = await request(server)
        .post('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);

      const count = await TagSubscription.countDocuments({ user: member.user._id });
      expect(count).toBe(1);
    });

    it('requires authentication', async () => {
      const res = await request(server).post('/api/tags/pytorch/subscribe');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/tags/:tag/subscribe', () => {
    it('unfollows a tag', async () => {
      const member = await createTestUser();
      await TagSubscription.create({ user: member.user._id, tag: 'pytorch' });

      const res = await request(server)
        .delete('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);

      const subscription = await TagSubscription.findOne({ user: member.user._id, tag: 'pytorch' });
      expect(subscription).toBeNull();
    });

    it('is idempotent when never followed', async () => {
      const member = await createTestUser();

      const res = await request(server)
        .delete('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);
    });
  });

  describe('GET /api/tags/:tag/subscribe', () => {
    it('reports followed status for the current user', async () => {
      const member = await createTestUser();
      await TagSubscription.create({ user: member.user._id, tag: 'pytorch' });

      const res = await request(server)
        .get('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(true);
    });

    it('reports unfollowed status for another user', async () => {
      const member = await createTestUser();

      const res = await request(server)
        .get('/api/tags/pytorch/subscribe')
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);
    });
  });

  describe('GET /api/tags/subscriptions', () => {
    it('lists only the current user\'s followed tags, isolated per user', async () => {
      const memberA = await createTestUser();
      const memberB = await createTestUser();
      await TagSubscription.create({ user: memberA.user._id, tag: 'pytorch' });
      await TagSubscription.create({ user: memberA.user._id, tag: 'nlp' });
      await TagSubscription.create({ user: memberB.user._id, tag: 'pytorch' });

      const res = await request(server)
        .get('/api/tags/subscriptions')
        .set('Authorization', `Bearer ${memberA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      const tags = res.body.data.map((sub) => sub.tag).sort();
      expect(tags).toEqual(['nlp', 'pytorch']);

      const otherRes = await request(server)
        .get('/api/tags/subscriptions')
        .set('Authorization', `Bearer ${memberB.token}`);
      expect(otherRes.body.count).toBe(1);
    });

    it('requires authentication', async () => {
      const res = await request(server).get('/api/tags/subscriptions');
      expect(res.status).toBe(401);
    });
  });

  describe('Notifications on a new post with followed tags', () => {
    it('notifies every follower of any of the post\'s tags, except the author', async () => {
      const author = await createTestUser();
      const follower = await createTestUser();
      const nonFollower = await createTestUser();
      await TagSubscription.create({ user: follower.user._id, tag: 'pytorch' });

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'Test Post',
          content: 'Test content',
          category: category._id,
          tags: ['PyTorch', 'nlp']
        });

      expect(res.status).toBe(201);
      const post = res.body.data;

      const followerNotification = await Notification.findOne({
        user: follower.user._id,
        post: post._id
      });
      expect(followerNotification).not.toBeNull();
      expect(followerNotification.type).toBe('tag_post');
      expect(followerNotification.actor.toString()).toBe(author.user._id.toString());

      const authorNotification = await Notification.findOne({
        user: author.user._id,
        post: post._id,
        type: 'tag_post'
      });
      expect(authorNotification).toBeNull();

      const nonFollowerNotification = await Notification.findOne({
        user: nonFollower.user._id,
        post: post._id
      });
      expect(nonFollowerNotification).toBeNull();
    });

    it('notifies a follower only once when following two of the post\'s tags', async () => {
      const author = await createTestUser();
      const follower = await createTestUser();
      await TagSubscription.create({ user: follower.user._id, tag: 'pytorch' });
      await TagSubscription.create({ user: follower.user._id, tag: 'nlp' });

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'Test Post',
          content: 'Test content',
          category: category._id,
          tags: ['pytorch', 'nlp']
        });

      expect(res.status).toBe(201);

      const count = await Notification.countDocuments({
        user: follower.user._id,
        post: res.body.data._id,
        type: 'tag_post'
      });
      expect(count).toBe(1);
    });

    it('does not notify anyone for a post with no tags', async () => {
      const author = await createTestUser();
      const follower = await createTestUser();
      await TagSubscription.create({ user: follower.user._id, tag: 'pytorch' });

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({ title: 'Test Post', content: 'Test content', category: category._id });

      expect(res.status).toBe(201);

      const count = await Notification.countDocuments({ post: res.body.data._id, type: 'tag_post' });
      expect(count).toBe(0);
    });
  });
});
