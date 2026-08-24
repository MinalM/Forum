const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  aiMlExperience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  currentRole: {
    type: String
  },
  targetRole: {
    type: String
  },
  skills: [String],
  // Defaults true so existing users are never retroactively sent through
  // the post-signup onboarding step - only registerUser/passport set this
  // false, for accounts created after the step existed.
  onboardingCompleted: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: 'default-avatar.jpg'
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String
  },
  bannedUntil: {
    type: Date
  },
  bannedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  bannedAt: {
    type: Date
  },
  unbannedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  unbannedAt: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  // Ensure JWT_EXPIRE is properly formatted and is a string
  let expiresIn = process.env.JWT_EXPIRE || '24h';
  
  // Ensure it's a string and not null/undefined
  if (!expiresIn || typeof expiresIn !== 'string') {
    expiresIn = '24h';
  }
  
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
