const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

describe('User Model Test', () => {
  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should validate required fields', async () => {
    const userWithoutRequired = new User({
      aiMlExperience: 'beginner'
    });

    try {
      await userWithoutRequired.validate();
    } catch (error) {
      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
    }
  });

  it('should validate email format', async () => {
    const userWithInvalidEmail = new User({
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123'
    });

    try {
      await userWithInvalidEmail.validate();
    } catch (error) {
      expect(error.errors.email).toBeDefined();
      expect(error.errors.email.message).toBe('Please add a valid email');
    }
  });

  it('should hash password before saving', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    await user.save();
    expect(user.password).not.toBe('password123');
    const isMatch = await bcrypt.compare('password123', user.password);
    expect(isMatch).toBe(true);
  });

  it('should not hash password if not modified', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    await user.save();
    const hashedPassword = user.password;

    user.name = 'Updated Name';
    await user.save();
    expect(user.password).toBe(hashedPassword);
  });

  it('should generate JWT token', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    await user.save();
    const token = user.getSignedJwtToken();
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toEqual(user._id.toString());
  });

  it('should match password correctly', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    await user.save();
    const isMatch = await user.matchPassword('password123');
    expect(isMatch).toBe(true);

    const isNotMatch = await user.matchPassword('wrongpassword');
    expect(isNotMatch).toBe(false);
  });

  it('should enforce password length', async () => {
    const userWithShortPassword = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: '12345'
    });

    try {
      await userWithShortPassword.validate();
    } catch (error) {
      expect(error.errors.password).toBeDefined();
      expect(error.errors.password.message).toBe('Password must be at least 6 characters');
    }
  });

  it('should validate role enum values', async () => {
    const userWithInvalidRole = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'invalid-role'
    });

    try {
      await userWithInvalidRole.validate();
    } catch (error) {
      expect(error.errors.role).toBeDefined();
    }
  });

  // Defaults true so a document created (or hydrated from a pre-existing
  // record) without the field explicitly set is never sent through the
  // post-signup onboarding step - only registerUser/passport opt fresh
  // signups in with an explicit false.
  it('should default onboardingCompleted to true', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'onboarding-default@example.com',
      password: 'password123'
    });

    expect(user.onboardingCompleted).toBe(true);
  });

  // The bare filename 'default-avatar.jpg' resolves relative to the
  // current client route instead of to a real asset, producing a broken
  // image for every user until they set a real avatar.
  it('should default avatar to a resolvable asset path, not a bare filename', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'avatar-default@example.com',
      password: 'password123'
    });

    expect(user.avatar).toBe('/images/default-avatar1.png');
  });

  // Defaults to 'weekly' so the digest (server/utils/digestBuilder.js) is
  // opt-out, not opt-in - a member has to explicitly turn it off.
  it('should default notificationPrefs.digest to weekly', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'digest-default@example.com',
      password: 'password123'
    });

    expect(user.notificationPrefs.digest).toBe('weekly');
  });

  it('should allow opting out of the digest', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'digest-opt-out@example.com',
      password: 'password123',
      notificationPrefs: { digest: 'off' }
    });

    expect(user.notificationPrefs.digest).toBe('off');
  });

  it('should reject an invalid digest preference', async () => {
    const userWithInvalidDigest = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      notificationPrefs: { digest: 'daily' }
    });

    try {
      await userWithInvalidDigest.validate();
    } catch (error) {
      expect(error.errors['notificationPrefs.digest']).toBeDefined();
    }
  });
});