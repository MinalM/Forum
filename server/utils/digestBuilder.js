const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Subscription = require('../models/Subscription');
const { rankUnansweredForUser } = require('./postCounters');

// Matches RECOMMENDED_LIMIT in server/controllers/posts.js's "You can
// answer these" rail - same ranking (server/utils/feedRanking.js via
// rankUnansweredForUser), applied to the digest email instead of the rail.
const UNANSWERED_LIMIT = 5;

// One user's weekly digest: new answers/replies since `since` on posts they
// authored or are subscribed to (comments by the user themself don't
// count), plus up to UNANSWERED_LIMIT unanswered questions matching their
// profile. Returns null for an opted-out user, or one whose digest would be
// entirely empty - a blank email is worse than no email.
async function buildDigestForUser(user, since) {
  if (!user || user.notificationPrefs?.digest === 'off') {
    return null;
  }

  const [activity, unansweredQuestions] = await Promise.all([
    buildActivity(user, since),
    rankUnansweredForUser(Post, user, {
      limit: UNANSWERED_LIMIT,
      select: 'title slug tags aiMlLevel category createdAt',
      populate: { path: 'category', select: 'name' }
    })
  ]);

  if (activity.length === 0 && unansweredQuestions.length === 0) {
    return null;
  }

  return { user, activity, unansweredQuestions };
}

// New comments since `since` on any post the user authored or subscribed
// to, grouped by post. Excludes the user's own comments (they already know
// about those) and hidden/moderated ones.
async function buildActivity(user, since) {
  const [ownPostIds, subscribedPostIds] = await Promise.all([
    Post.find({ user: user._id }).distinct('_id'),
    Subscription.find({ user: user._id }).distinct('post')
  ]);

  const watchedPostIds = Array.from(
    new Set([...ownPostIds, ...subscribedPostIds].map(id => id.toString()))
  );

  if (watchedPostIds.length === 0) {
    return [];
  }

  const comments = await Comment.find({
    post: { $in: watchedPostIds },
    user: { $ne: user._id },
    isHidden: { $ne: true },
    createdAt: { $gt: since }
  })
    .select('content post user createdAt')
    .populate('user', 'name')
    .populate('post', 'title slug')
    .sort({ createdAt: 1 })
    .lean();

  const byPost = new Map();
  for (const comment of comments) {
    // The post itself could have been deleted between the lookup above and
    // this query - Comment cascade-deletes with its post, but a race is
    // cheap to guard against.
    if (!comment.post) continue;

    const key = comment.post._id.toString();
    if (!byPost.has(key)) {
      byPost.set(key, { post: comment.post, comments: [] });
    }
    byPost.get(key).comments.push({
      _id: comment._id,
      content: comment.content,
      author: comment.user,
      createdAt: comment.createdAt
    });
  }

  return Array.from(byPost.values());
}

// Builds every recipient's digest, skipping opted-out users and ones with
// nothing new (buildDigestForUser returns null for both).
async function buildWeeklyDigests(users, since) {
  const digests = [];
  for (const user of users) {
    const digest = await buildDigestForUser(user, since);
    if (digest) {
      digests.push(digest);
    }
  }
  return digests;
}

module.exports = { buildDigestForUser, buildWeeklyDigests, UNANSWERED_LIMIT };
