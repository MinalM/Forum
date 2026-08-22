const mongoose = require('mongoose');
const { MAX_TAG_LENGTH, MAX_TAGS } = require('../utils/normalizeTags');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  content: {
    type: String,
    required: [true, 'Please add content']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: true
  },
  tags: {
    type: [String],
    validate: [
      {
        validator: tags => tags.length <= MAX_TAGS,
        message: `A post cannot have more than ${MAX_TAGS} tags`
      },
      {
        validator: tags => tags.every(tag => tag.length <= MAX_TAG_LENGTH),
        message: `Each tag must be ${MAX_TAG_LENGTH} characters or fewer`
      }
    ]
  },
  upvotes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  // Denormalised count of all comments (including replies) on this post,
  // kept in sync by the comment controllers — Post.comments is a
  // reverse-populate virtual and can't be filtered or sorted on in a query.
  commentCount: {
    type: Number,
    default: 0,
    index: true
  },
  // Denormalised upvotes.length - downvotes.length, kept in sync by the vote
  // controllers — a plain Model.find() can't sort on the voteCount virtual.
  score: {
    type: Number,
    default: 0,
    index: true
  },
  views: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isAnnouncement: {
    type: Boolean,
    default: false
  },
  isSolved: {
    type: Boolean,
    default: false
  },
  aiMlLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert', 'all'],
    default: 'all'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastModeratedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  lastModeratedAt: {
    type: Date
  },
  moderationReason: {
    type: String
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create post slug from the title
PostSchema.pre('save', function(next) {
  this.slug = this.title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '') + '-' + Date.now().toString().slice(-6);
  next();
});

// Cascade delete comments when a post is deleted
PostSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  await this.model('Comment').deleteMany({ post: this._id });
  next();
});

PostSchema.pre('findOneAndDelete', async function(next) {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    await doc.model('Comment').deleteMany({ post: doc._id });
  }
  next();
});

// Reverse populate with comments
PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  justOne: false
});

// Get vote count
PostSchema.virtual('voteCount').get(function() {
  return this.upvotes.length - this.downvotes.length;
});

module.exports = mongoose.model('Post', PostSchema);
