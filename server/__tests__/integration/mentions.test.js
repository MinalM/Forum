const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { createTestUser, cleanupTestData } = require('./setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const Notification = require('../../models/Notification');
const User = require('../../models/User');
const { MAX_MENTIONS } = require('../../utils/mentions');

describe('@mentions in posts and comments', () => {
  let category;
  let server;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    server = app.listen(5015);
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

  describe('POST /api/posts', () => {
    it('notifies a mentioned member and links the mention in the stored content', async () => {
      const author = await createTestUser();
      const mentioned = await User.create({
        name: 'Admin User',
        email: `admin-user-${Date.now()}@example.com`,
        password: 'password123'
      });

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'A question',
          content: 'Hey @AdminUser, can you take a look?',
          category: category._id
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe(
        `Hey [@AdminUser](/profile/${mentioned._id}), can you take a look?`
      );

      const notifications = await Notification.find({ user: mentioned._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('mention');
      expect(notifications[0].post.toString()).toBe(res.body.data._id);
      expect(notifications[0].actor.toString()).toBe(author.user._id.toString());
      expect(notifications[0].comment).toBeUndefined();
    });

    it('ignores an unknown handle: no notification, content unchanged', async () => {
      const author = await createTestUser();

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'A question',
          content: 'Hey @Nobody, any ideas?',
          category: category._id
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('Hey @Nobody, any ideas?');

      const count = await Notification.countDocuments({ type: 'mention' });
      expect(count).toBe(0);
    });

    it('ignores an "@" that is mid-word, e.g. inside an email address', async () => {
      const author = await createTestUser();
      await User.create({
        name: 'example',
        email: `example-user-${Date.now()}@example.com`,
        password: 'password123'
      });

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'A question',
          content: 'reach me at john@example.com for details',
          category: category._id
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('reach me at john@example.com for details');

      const count = await Notification.countDocuments({ type: 'mention' });
      expect(count).toBe(0);
    });

    it('produces no notification for a self-mention', async () => {
      const author = await createTestUser();
      await User.findByIdAndUpdate(author.user._id, { name: 'Solo Author' });

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'A question',
          content: 'Note to self, @SoloAuthor, follow up later',
          category: category._id
        });

      expect(res.status).toBe(201);

      const count = await Notification.countDocuments({ type: 'mention' });
      expect(count).toBe(0);
    });

    it('caps distinct mentions at MAX_MENTIONS', async () => {
      const author = await createTestUser();
      const mentionedUsers = [];
      for (let i = 0; i < MAX_MENTIONS + 2; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        mentionedUsers.push(
          await User.create({
            name: `Handle${i}`,
            email: `handle-${i}-${Date.now()}@example.com`,
            password: 'password123'
          })
        );
      }

      const content = mentionedUsers.map((u) => `@${u.name}`).join(' ');

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'A question',
          content,
          category: category._id
        });

      expect(res.status).toBe(201);

      const count = await Notification.countDocuments({ type: 'mention' });
      expect(count).toBe(MAX_MENTIONS);
    });

    it('skips an ambiguous handle matched by more than one member', async () => {
      const author = await createTestUser();
      await User.create({
        name: 'Jamie Fox',
        email: `jamie-1-${Date.now()}@example.com`,
        password: 'password123'
      });
      await User.create({
        name: 'Jamie Fox',
        email: `jamie-2-${Date.now()}@example.com`,
        password: 'password123'
      });

      const res = await request(server)
        .post('/api/posts')
        .set('Authorization', `Bearer ${author.token}`)
        .send({
          title: 'A question',
          content: 'Paging @JamieFox for input',
          category: category._id
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('Paging @JamieFox for input');

      const count = await Notification.countDocuments({ type: 'mention' });
      expect(count).toBe(0);
    });
  });

  describe('POST /api/posts/:postId/comments', () => {
    it('notifies a mentioned member with the comment attached', async () => {
      const author = await createTestUser();
      const mentioned = await User.create({
        name: 'Admin User',
        email: `admin-user-${Date.now()}@example.com`,
        password: 'password123'
      });
      const post = await Post.create({
        title: 'Test Post',
        content: 'Test content',
        user: author.user._id,
        category: category._id
      });

      const res = await request(server)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${author.token}`)
        .send({ content: 'Thanks @AdminUser!' });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe(`Thanks [@AdminUser](/profile/${mentioned._id})!`);

      const notifications = await Notification.find({ user: mentioned._id, type: 'mention' });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].comment.toString()).toBe(res.body.data._id);
    });
  });

  describe('POST /api/comments/:id/replies', () => {
    it('notifies a mentioned member with the reply attached', async () => {
      const author = await createTestUser();
      const mentioned = await User.create({
        name: 'Admin User',
        email: `admin-user-${Date.now()}@example.com`,
        password: 'password123'
      });
      const post = await Post.create({
        title: 'Test Post',
        content: 'Test content',
        user: author.user._id,
        category: category._id
      });
      const comment = await Comment.create({
        content: 'Original comment',
        user: author.user._id,
        post: post._id
      });

      const res = await request(server)
        .post(`/api/comments/${comment._id}/replies`)
        .set('Authorization', `Bearer ${author.token}`)
        .send({ content: 'cc @AdminUser' });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe(`cc [@AdminUser](/profile/${mentioned._id})`);

      const notifications = await Notification.find({ user: mentioned._id, type: 'mention' });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].comment.toString()).toBe(res.body.data._id);
    });
  });
});
