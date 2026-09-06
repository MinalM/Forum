const User = require('../models/User');
const Notification = require('../models/Notification');

// How many distinct @mentions a single post/comment body can trigger -
// without a cap, one body could notify (and link) an unbounded number of
// members.
const MAX_MENTIONS = 5;

// Matches an '@handle' token. The negative lookbehind excludes an '@' that
// is itself preceded by a word character or another '@', so "john@example.com"
// and "@@handle" are never treated as the start of a mention.
const MENTION_PATTERN = /(?<![\w@])@([a-zA-Z0-9_-]+)/g;

// There is no dedicated @handle field on User (see BACKLOG.md) - a mention
// resolves against `name` with everything but letters/digits stripped and
// lowercased, so "@AdminUser" matches a user named "Admin User".
function normalizeHandle(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Extracts the distinct candidate handles from `text`, in the order they
// first appear, capped at MAX_MENTIONS. Returns the raw matched text (not
// yet resolved against any user).
function extractMentionHandles(text) {
  if (!text) {
    return [];
  }

  const seen = new Set();
  const handles = [];
  MENTION_PATTERN.lastIndex = 0;

  let match;
  while ((match = MENTION_PATTERN.exec(text)) && handles.length < MAX_MENTIONS) {
    const key = normalizeHandle(match[1]);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    handles.push(match[1]);
  }

  return handles;
}

// Resolves raw handles (as returned by extractMentionHandles) against every
// user's normalized name. A handle whose normalized form matches more than
// one user is skipped rather than guessed at - there's no way to tell which
// one was meant.
async function resolveMentionedUsers(handles) {
  if (handles.length === 0) {
    return [];
  }

  const users = await User.find({}, 'name');
  const byNormalizedName = new Map();
  const ambiguous = new Set();

  for (const user of users) {
    const key = normalizeHandle(user.name);
    if (byNormalizedName.has(key)) {
      ambiguous.add(key);
    } else {
      byNormalizedName.set(key, user);
    }
  }

  const resolved = [];
  for (const handle of handles) {
    const key = normalizeHandle(handle);
    if (ambiguous.has(key)) {
      continue;
    }
    const user = byNormalizedName.get(key);
    if (user) {
      resolved.push({ handle, user });
    }
  }

  return resolved;
}

// Rewrites every occurrence of a resolved mention's handle in `text` into a
// markdown link to the mentioned user's profile, leaving unresolved handles
// (and anything past the MAX_MENTIONS cap) as plain text.
function linkifyMentions(text, resolvedMentions) {
  if (!text || resolvedMentions.length === 0) {
    return text;
  }

  const userByNormalizedHandle = new Map(
    resolvedMentions.map(({ handle, user }) => [normalizeHandle(handle), user])
  );

  return text.replace(MENTION_PATTERN, (fullMatch, rawHandle) => {
    const user = userByNormalizedHandle.get(normalizeHandle(rawHandle));
    return user ? `[@${rawHandle}](/profile/${user._id})` : fullMatch;
  });
}

// Parses, resolves, and linkifies the @mentions in a post/comment body
// before it's saved. Returns the (possibly rewritten) content plus the
// resolved mentions, so the caller can write notifications off the same
// list without re-parsing.
async function processMentions(content) {
  const handles = extractMentionHandles(content);
  const mentionedUsers = await resolveMentionedUsers(handles);
  return {
    content: linkifyMentions(content, mentionedUsers),
    mentionedUsers
  };
}

// Writes a 'mention' notification for each distinct mentioned user except
// `actorId` - mentioning yourself notifies no one.
async function notifyMentionedUsers({ postId, actorId, commentId, mentionedUsers }) {
  const recipients = mentionedUsers.filter(
    ({ user }) => user._id.toString() !== actorId.toString()
  );

  if (recipients.length === 0) {
    return;
  }

  await Notification.insertMany(
    recipients.map(({ user }) => ({
      user: user._id,
      post: postId,
      comment: commentId,
      actor: actorId,
      type: 'mention'
    }))
  );
}

module.exports = {
  MAX_MENTIONS,
  normalizeHandle,
  extractMentionHandles,
  resolveMentionedUsers,
  linkifyMentions,
  processMentions,
  notifyMentionedUsers
};
