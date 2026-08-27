const mongoose = require('mongoose');

const SavedPostSchema = new mongoose.Schema({
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

// A member has a given post saved at most once.
SavedPostSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('SavedPost', SavedPostSchema);
