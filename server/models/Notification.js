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
  // Set for 'answer'/'reply' notifications; absent for 'tag_post' ones,
  // which are about a new post, not a comment.
  comment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Comment'
  },
  // The member whose new answer/reply/post triggered this notification.
  actor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['answer', 'reply', 'tag_post'],
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
