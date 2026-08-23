const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// A member is subscribed to a given post at most once.
SubscriptionSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
