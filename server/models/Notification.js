const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // The subscriber this notification is for.
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
  comment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Comment',
    required: true
  },
  // The member whose new answer/reply triggered this notification.
  actor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['answer', 'reply'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

NotificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
