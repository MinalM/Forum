const mongoose = require('mongoose');
const { createTestUser, cleanupTestData } = require('../integration/setup');
const Category = require('../../models/Category');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const User = require('../../models/User');

jest.mock('../../utils/sendEmail', () => jest.fn().mockResolvedValue());
const sendEmail = require('../../utils/sendEmail');
const { runWeeklyDigest, parseSinceArg } = require('../../../scripts/send-weekly-digest');

describe('scripts/send-weekly-digest', () => {
  let category;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
    category = await Category.create({ name: 'ML Fundamentals', description: 'ML basics' });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('runWeeklyDigest', () => {
    it('emails every eligible member and skips opted-out/no-activity ones, sending no real mail', async () => {
      const since = new Date('2026-01-01T00:00:00.000Z');
      const { user: author } = await createTestUser();
      const { user: commenter } = await createTestUser();
      const optedOut = await User.create({
        name: 'Opted Out',
        email: `opted-out-${Date.now()}@example.com`,
        password: 'password123',
        notificationPrefs: { digest: 'off' }
      });
      const post = await Post.create({
        title: 'A post', content: 'content', user: author._id, category: category._id
      });
      await Comment.create({
        content: 'new answer',
        user: commenter._id,
        post: post._id,
        createdAt: new Date(since.getTime() + 1000)
      });

      const sentTo = await runWeeklyDigest({ since });

      expect(sentTo.map(String)).toEqual([author._id.toString()]);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      const recipients = sendEmail.mock.calls.map(call => call[0].to);
      expect(recipients).toEqual([author.email]);
      expect(recipients).not.toContain(optedOut.email);
      expect(recipients).not.toContain(commenter.email);
    });
  });

  describe('parseSinceArg', () => {
    it('defaults to 7 days ago with no --since flag', () => {
      const before = Date.now();
      const since = parseSinceArg([]);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(Math.abs(before - sevenDaysMs - since.getTime())).toBeLessThan(1000);
    });

    it('parses an explicit --since=<ISO date>', () => {
      const since = parseSinceArg(['--since=2026-01-01T00:00:00.000Z']);
      expect(since.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('throws on an unparseable --since value', () => {
      expect(() => parseSinceArg(['--since=not-a-date'])).toThrow('Invalid --since date');
    });
  });
});
