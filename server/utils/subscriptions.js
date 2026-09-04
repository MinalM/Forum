const Subscription = require('../models/Subscription');
const TagSubscription = require('../models/TagSubscription');
const Notification = require('../models/Notification');

// Idempotently subscribes a user to a post. Safe to call on every post a
// member authors or comments on, even if they're already subscribed.
async function subscribeUserToPost(userId, postId) {
  await Subscription.findOneAndUpdate(
    { user: userId, post: postId },
    { $setOnInsert: { user: userId, post: postId } },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

// Writes a notification for every subscriber to `postId` except `actorId`
// (the member whose new answer/reply just triggered this).
async function notifySubscribers({ postId, actorId, commentId, type }) {
  const subscriptions = await Subscription.find({
    post: postId,
    user: { $ne: actorId }
  });

  if (subscriptions.length === 0) {
    return;
  }

  await Notification.insertMany(
    subscriptions.map(subscription => ({
      user: subscription.user,
      post: postId,
      comment: commentId,
      actor: actorId,
      type
    }))
  );
}

// Writes a 'tag_post' notification for every member following any of
// `tags` (case-insensitive), except `actorId` - the post's own author.
// Followers of more than one matching tag are notified once, not once per
// matching tag.
async function notifyTagFollowers({ postId, actorId, tags }) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return;
  }

  const normalizedTags = tags.map(tag => tag.toLowerCase());

  const followerIds = await TagSubscription.find({
    tag: { $in: normalizedTags },
    user: { $ne: actorId }
  }).distinct('user');

  if (followerIds.length === 0) {
    return;
  }

  await Notification.insertMany(
    followerIds.map(userId => ({
      user: userId,
      post: postId,
      actor: actorId,
      type: 'tag_post'
    }))
  );
}

module.exports = { subscribeUserToPost, notifySubscribers, notifyTagFollowers };
