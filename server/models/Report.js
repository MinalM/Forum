const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['post', 'comment', 'user'],
    required: [true, 'Please specify report type']
  },
  post: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Comment'
  },
  reportedUser: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  reportedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Please provide a reason for the report'],
    maxlength: [500, 'Reason cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  resolvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  resolutionNotes: {
    type: String,
    maxlength: [500, 'Resolution notes cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});

// A user can only report the same content once
ReportSchema.index(
  { reportedBy: 1, post: 1, type: 1 }, 
  { unique: true, sparse: true }
);

ReportSchema.index(
  { reportedBy: 1, comment: 1, type: 1 }, 
  { unique: true, sparse: true }
);

ReportSchema.index(
  { reportedBy: 1, reportedUser: 1, type: 1 }, 
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Report', ReportSchema);