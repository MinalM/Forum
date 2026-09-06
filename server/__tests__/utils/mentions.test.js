jest.mock('../../models/User', () => ({ find: jest.fn() }));
jest.mock('../../models/Notification', () => ({ insertMany: jest.fn() }));

const User = require('../../models/User');
const Notification = require('../../models/Notification');
const {
  MAX_MENTIONS,
  normalizeHandle,
  extractMentionHandles,
  linkifyMentions,
  resolveMentionedUsers,
  notifyMentionedUsers
} = require('../../utils/mentions');

describe('mentions', () => {
  describe('normalizeHandle', () => {
    it('lowercases and strips non-alphanumeric characters', () => {
      expect(normalizeHandle('Admin User')).toBe('adminuser');
      expect(normalizeHandle('admin-user')).toBe('adminuser');
    });

    it('returns an empty string for a falsy value', () => {
      expect(normalizeHandle(undefined)).toBe('');
      expect(normalizeHandle(null)).toBe('');
    });
  });

  describe('extractMentionHandles', () => {
    it('extracts a valid handle', () => {
      expect(extractMentionHandles('Hey @AdminUser, take a look')).toEqual(['AdminUser']);
    });

    it('extracts multiple distinct handles in order of first appearance', () => {
      expect(extractMentionHandles('cc @Alice and @Bob')).toEqual(['Alice', 'Bob']);
    });

    it('ignores an "@" that is mid-word, e.g. inside an email address', () => {
      expect(extractMentionHandles('contact me at john@example.com')).toEqual([]);
      expect(extractMentionHandles('see foo@bar for details')).toEqual([]);
    });

    it('dedupes the same handle mentioned twice, case-insensitively', () => {
      expect(extractMentionHandles('@Alice, did you see this @alice?')).toEqual(['Alice']);
    });

    it('caps at MAX_MENTIONS distinct handles', () => {
      const names = Array.from({ length: MAX_MENTIONS + 2 }, (_, i) => `User${i}`);
      const body = names.map((name) => `@${name}`).join(' ');

      const handles = extractMentionHandles(body);

      expect(handles).toHaveLength(MAX_MENTIONS);
      expect(handles).toEqual(names.slice(0, MAX_MENTIONS));
    });

    it('returns an empty array for empty/falsy content', () => {
      expect(extractMentionHandles('')).toEqual([]);
      expect(extractMentionHandles(null)).toEqual([]);
      expect(extractMentionHandles(undefined)).toEqual([]);
    });
  });

  describe('linkifyMentions', () => {
    const aliceId = '000000000000000000000001';

    it('rewrites a resolved handle into a markdown link to the profile', () => {
      const result = linkifyMentions('Hey @Alice, look at this', [
        { handle: 'Alice', user: { _id: aliceId } }
      ]);

      expect(result).toBe(`Hey [@Alice](/profile/${aliceId}), look at this`);
    });

    it('rewrites every occurrence of a resolved handle', () => {
      const result = linkifyMentions('@Alice hi @alice again', [
        { handle: 'Alice', user: { _id: aliceId } }
      ]);

      expect(result).toBe(
        `[@Alice](/profile/${aliceId}) hi [@alice](/profile/${aliceId}) again`
      );
    });

    it('leaves an unresolved handle as plain text', () => {
      const result = linkifyMentions('Hey @Nobody', []);
      expect(result).toBe('Hey @Nobody');
    });

    it('leaves an email address untouched', () => {
      const result = linkifyMentions('contact john@example.com', [
        { handle: 'example', user: { _id: aliceId } }
      ]);
      expect(result).toBe('contact john@example.com');
    });
  });

  describe('resolveMentionedUsers', () => {
    beforeEach(() => {
      User.find.mockReset();
    });

    it('resolves a handle against a user\'s normalized name', async () => {
      const admin = { _id: 'u1', name: 'Admin User' };
      User.find.mockResolvedValue([admin]);

      const resolved = await resolveMentionedUsers(['AdminUser']);

      expect(resolved).toEqual([{ handle: 'AdminUser', user: admin }]);
    });

    it('returns an empty array without querying when there are no handles', async () => {
      const resolved = await resolveMentionedUsers([]);
      expect(resolved).toEqual([]);
      expect(User.find).not.toHaveBeenCalled();
    });

    it('drops a handle with no matching user', async () => {
      User.find.mockResolvedValue([{ _id: 'u1', name: 'Someone Else' }]);

      const resolved = await resolveMentionedUsers(['Nobody']);

      expect(resolved).toEqual([]);
    });

    it('skips a handle whose normalized name matches more than one user', async () => {
      const jamie1 = { _id: 'u1', name: 'Jamie Fox' };
      const jamie2 = { _id: 'u2', name: 'Jamie Fox' };
      User.find.mockResolvedValue([jamie1, jamie2]);

      const resolved = await resolveMentionedUsers(['JamieFox']);

      expect(resolved).toEqual([]);
    });
  });

  describe('notifyMentionedUsers', () => {
    beforeEach(() => {
      Notification.insertMany.mockReset();
    });

    it('writes a mention notification for each mentioned user except the actor', async () => {
      const mentionedUsers = [
        { handle: 'Bob', user: { _id: 'bob-id' } },
        { handle: 'Author', user: { _id: 'author-id' } }
      ];

      await notifyMentionedUsers({
        postId: 'post-1',
        actorId: 'author-id',
        commentId: 'comment-1',
        mentionedUsers
      });

      expect(Notification.insertMany).toHaveBeenCalledWith([
        {
          user: 'bob-id',
          post: 'post-1',
          comment: 'comment-1',
          actor: 'author-id',
          type: 'mention'
        }
      ]);
    });

    it('does not call insertMany when every mention is a self-mention', async () => {
      await notifyMentionedUsers({
        postId: 'post-1',
        actorId: 'author-id',
        mentionedUsers: [{ handle: 'Author', user: { _id: 'author-id' } }]
      });

      expect(Notification.insertMany).not.toHaveBeenCalled();
    });

    it('does not call insertMany when there are no mentions', async () => {
      await notifyMentionedUsers({ postId: 'post-1', actorId: 'author-id', mentionedUsers: [] });
      expect(Notification.insertMany).not.toHaveBeenCalled();
    });
  });
});
