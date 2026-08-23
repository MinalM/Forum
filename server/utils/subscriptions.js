const Subscription = require('../models/Subscription');
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

module.exports = { subscribeUserToPost, notifySubscribers };
