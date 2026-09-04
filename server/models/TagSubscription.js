const mongoose = require('mongoose');

const TagSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  tag: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// A member follows a given tag at most once.
TagSubscriptionSchema.index({ user: 1, tag: 1 }, { unique: true });

module.exports = mongoose.model('TagSubscription', TagSubscriptionSchema);
