const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Subscription = require('../../models/Subscription');
const Notification = require('../../models/Notification');

describe('Thread subscriptions and notifications', () => {
  let asker, askerToken;
  let category;
  let post;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5010);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await cleanupTestData();

    const askerResult = await createTestUser();
    asker = askerResult.user;
    askerToken = askerResult.token;

    category = await Category.create({
      name: 'Test Category',
      description: 'Test Description'
    });

    // Created through the API (not Post.create) so the auto-subscribe
    // hook in the createPost controller actually fires, the way it would
    // for a real member authoring a post.
    const postRes = await request(server)
      .post('/api/posts')
      .set('Authorization', `Bearer ${askerToken}`)
      .send({ title: 'Test Post', content: 'Test content', category: category._id });
    post = await Post.findById(postRes.body.data._id);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Auto-subscribe on authoring', () => {
    it('subscribes a member to a post they create', async () => {
      const subscription = await Subscription.findOne({ user: asker._id, post: post._id });
      expect(subscription).not.toBeNull();
    });
  });

  describe('Auto-subscribe on commenting', () => {
    it('subscribes a member to a post they answer', async () => {
      const answererResult = await createTestUser();

      await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answererResult.token}`)
        .send({ content: 'An answer' });

      const subscription = await Subscription.findOne({
        user: answererResult.user._id,
        post: post._id
      });
      expect(subscription).not.toBeNull();
    });

    it('subscribes a member to a post they reply on', async () => {
      const answererResult = await createTestUser();
      const replierResult = await createTestUser();

      const commentRes = await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answererResult.token}`)
        .send({ content: 'An answer' });
      const comment = commentRes.body.data;

      await request(server)
        .post(`/api/comments/${comment._id}/replies`)
        .set('Authorization', `Bearer ${replierResult.token}`)
        .send({ content: 'A reply' });

      const subscription = await Subscription.findOne({
        user: replierResult.user._id,
        post: post._id
      });
      expect(subscription).not.toBeNull();
    });
  });

  describe('POST /api/posts/:id/subscribe', () => {
    it('subscribes the current user to a post', async () => {
      const member = await createTestUser();

      const res = await request(server)
        .post(`/api/posts/${post._id}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(true);

      const subscription = await Subscription.findOne({ user: member.user._id, post: post._id });
      expect(subscription).not.toBeNull();
    });

    it('is idempotent when the member is already subscribed', async () => {
      const member = await createTestUser();

      await request(server)
        .post(`/api/posts/${post._id}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      const res = await request(server)
        .post(`/api/posts/${post._id}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);

      const count = await Subscription.countDocuments({ user: member.user._id, post: post._id });
      expect(count).toBe(1);
    });

    it('requires authentication', async () => {
      const res = await request(server).post(`/api/posts/${post._id}/subscribe`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for a non-existent post', async () => {
      const member = await createTestUser();

      const res = await request(server)
        .post(`/api/posts/${new mongoose.Types.ObjectId()}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/posts/:id/subscribe', () => {
    it('unsubscribes the current user from a post', async () => {
      const member = await createTestUser();
      await Subscription.create({ user: member.user._id, post: post._id });

      const res = await request(server)
        .delete(`/api/posts/${post._id}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);

      const subscription = await Subscription.findOne({ user: member.user._id, post: post._id });
      expect(subscription).toBeNull();
    });

    it('is idempotent when the member was never subscribed', async () => {
      const member = await createTestUser();

      const res = await request(server)
        .delete(`/api/posts/${post._id}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);
    });
  });

  describe('GET /api/posts/:id/subscribe', () => {
    it('reports subscribed status for the current user', async () => {
      const member = await createTestUser();
      await Subscription.create({ user: member.user._id, post: post._id });

      const res = await request(server)
        .get(`/api/posts/${post._id}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(true);
    });

    it('reports unsubscribed status for another user', async () => {
      const member = await createTestUser();

      const res = await request(server)
        .get(`/api/posts/${post._id}/subscribe`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscribed).toBe(false);
    });
  });

  describe('GET /api/subscriptions', () => {
    it('lists only the current user\'s subscriptions', async () => {
      const otherResult = await createTestUser();
      const otherPost = await Post.create({
        title: 'Other post',
        content: 'Other content',
        user: otherResult.user._id,
        category: category._id
      });

      const res = await request(server)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${askerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].post._id).toBe(post._id.toString());

      const otherSubscriptionExists = res.body.data.some(
        sub => sub.post._id === otherPost._id.toString()
      );
      expect(otherSubscriptionExists).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(server).get('/api/subscriptions');
      expect(res.status).toBe(401);
    });
  });

  describe('Notifications on a new answer', () => {
    it('notifies every other subscriber, not the answerer', async () => {
      const otherSubscriber = await createTestUser();
      await Subscription.create({ user: otherSubscriber.user._id, post: post._id });

      const answerer = await createTestUser();

      const res = await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answerer.token}`)
        .send({ content: 'An answer' });

      const comment = res.body.data;

      // The asker (auto-subscribed on authoring) and the other subscriber
      // both get notified.
      const askerNotification = await Notification.findOne({ user: asker._id, post: post._id });
      expect(askerNotification).not.toBeNull();
      expect(askerNotification.type).toBe('answer');
      expect(askerNotification.comment.toString()).toBe(comment._id);
      expect(askerNotification.actor.toString()).toBe(answerer.user._id.toString());

      const otherNotification = await Notification.findOne({
        user: otherSubscriber.user._id,
        post: post._id
      });
      expect(otherNotification).not.toBeNull();

      // No self-notification for the answerer's own answer.
      const selfNotification = await Notification.findOne({
        user: answerer.user._id,
        post: post._id
      });
      expect(selfNotification).toBeNull();
    });

    it('does not notify anyone when the post author answers their own post', async () => {
      const res = await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${askerToken}`)
        .send({ content: 'Answering my own post' });

      expect(res.status).toBe(201);

      const notificationCount = await Notification.countDocuments({ post: post._id });
      expect(notificationCount).toBe(0);
    });

    it('notifies subscribers on a reply, with type "reply"', async () => {
      const answerer = await createTestUser();
      const commentRes = await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answerer.token}`)
        .send({ content: 'An answer' });
      const comment = commentRes.body.data;

      const replier = await createTestUser();
      const replyRes = await request(server)
        .post(`/api/comments/${comment._id}/replies`)
        .set('Authorization', `Bearer ${replier.token}`)
        .send({ content: 'A reply' });
      const reply = replyRes.body.data;

      const askerNotification = await Notification.findOne({
        user: asker._id,
        comment: reply._id
      });
      expect(askerNotification).not.toBeNull();
      expect(askerNotification.type).toBe('reply');

      // The answerer is subscribed too (they commented on the post) and
      // should be notified of the reply, since they aren't the actor here.
      const answererNotification = await Notification.findOne({
        user: answerer.user._id,
        comment: reply._id
      });
      expect(answererNotification).not.toBeNull();
    });
  });

  describe('GET /api/notifications/unread/count', () => {
    it('counts only the current user\'s unread notifications', async () => {
      const answerer = await createTestUser();
      await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answerer.token}`)
        .send({ content: 'An answer' });

      const res = await request(server)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${askerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);

      const otherRes = await request(server)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${answerer.token}`);
      expect(otherRes.body.data.count).toBe(0);
    });

    it('requires authentication', async () => {
      const res = await request(server).get('/api/notifications/unread/count');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('marks all of the current user\'s notifications as read', async () => {
      const answerer = await createTestUser();
      await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answerer.token}`)
        .send({ content: 'An answer' });

      const beforeCount = await Notification.countDocuments({ user: asker._id, read: false });
      expect(beforeCount).toBe(1);

      const res = await request(server)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${askerToken}`);

      expect(res.status).toBe(200);

      const afterCount = await Notification.countDocuments({ user: asker._id, read: false });
      expect(afterCount).toBe(0);
    });

    it('does not mark another user\'s notifications as read', async () => {
      const answerer = await createTestUser();
      const otherSubscriber = await createTestUser();
      await Subscription.create({ user: otherSubscriber.user._id, post: post._id });

      await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answerer.token}`)
        .send({ content: 'An answer' });

      await request(server)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${askerToken}`);

      const otherUnread = await Notification.countDocuments({
        user: otherSubscriber.user._id,
        read: false
      });
      expect(otherUnread).toBe(1);
    });
  });

  describe('GET /api/notifications', () => {
    it('lists only the current user\'s notifications', async () => {
      const answerer = await createTestUser();
      await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${answerer.token}`)
        .send({ content: 'An answer' });

      const res = await request(server)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${askerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].post._id).toBe(post._id.toString());

      const answererRes = await request(server)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${answerer.token}`);
      expect(answererRes.body.count).toBe(0);
    });
  });
});
