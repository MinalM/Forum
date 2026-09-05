const mongoose = require('mongoose');
const crypto = require('crypto');
const { createTestUser, cleanupTestData } = require('./setup');

jest.mock('../../utils/sendEmail', () => jest.fn().mockResolvedValue());
const sendEmail = require('../../utils/sendEmail');
const { sendDigestEmail, sendWeeklyDigestEmails } = require('../../utils/digestMailer');
const User = require('../../models/User');

describe('digestMailer', () => {
  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('sendDigestEmail', () => {
    it('emails the recipient and persists a fresh unsubscribe token matching the emailed link', async () => {
      const { user } = await createTestUser();

      await sendDigestEmail({ user, activity: [], unansweredQuestions: [] });

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const call = sendEmail.mock.calls[0][0];
      expect(call.to).toBe(user.email);

      const rawToken = call.text.match(/digest-unsubscribe\/([a-f0-9]+)/)[1];
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

      const updated = await User.findById(user._id);
      expect(updated.digestUnsubscribeToken).toBe(hashed);
      expect(updated.digestUnsubscribeExpire.getTime()).toBeGreaterThan(Date.now());
    });

    it('includes activity and unanswered-question titles in the email body', async () => {
      const { user } = await createTestUser();
      const digest = {
        user,
        activity: [
          {
            post: { title: 'A watched post' },
            comments: [{ content: 'a new reply', author: { name: 'Ada' } }]
          }
        ],
        unansweredQuestions: [{ title: 'An unanswered question' }]
      };

      await sendDigestEmail(digest);

      const text = sendEmail.mock.calls[0][0].text;
      expect(text).toContain('A watched post');
      expect(text).toContain('Ada: a new reply');
      expect(text).toContain('An unanswered question');
    });
  });

  describe('sendWeeklyDigestEmails', () => {
    it('sends every digest and returns the ids sent to', async () => {
      const { user: userA } = await createTestUser();
      const { user: userB } = await createTestUser();

      const sentTo = await sendWeeklyDigestEmails([
        { user: userA, activity: [], unansweredQuestions: [] },
        { user: userB, activity: [], unansweredQuestions: [] }
      ]);

      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(sentTo.map(String)).toEqual([userA._id.toString(), userB._id.toString()]);
    });

    it('skips a recipient whose send fails, without aborting the rest', async () => {
      const { user: userA } = await createTestUser();
      const { user: userB } = await createTestUser();
      sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

      const sentTo = await sendWeeklyDigestEmails([
        { user: userA, activity: [], unansweredQuestions: [] },
        { user: userB, activity: [], unansweredQuestions: [] }
      ]);

      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(sentTo.map(String)).toEqual([userB._id.toString()]);
    });
  });
});
