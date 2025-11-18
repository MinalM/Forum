const passport = require('passport');
const User = require('../models/User');

// Configure Passport to use Google OAuth only if environment variables are set
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  
  // Log callback URL for debugging
  console.log('Google OAuth Callback URL:', process.env.GOOGLE_CALLBACK_URL);
  console.log('Google OAuth Client ID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'not set');
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // User exists, return the user
            return done(null, user);
          }

          // Check if user exists with the same email
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // User exists with email but no googleId, update the user
            user.googleId = profile.id;
            user.authProvider = 'google';
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }

          // Create new user
          const newUser = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            authProvider: 'google',
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : 'default-avatar.jpg'
          });

          return done(null, newUser);
        } catch (err) {
          console.error('Error in Google OAuth strategy:', err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.log('Google OAuth credentials not found. Google authentication is disabled.');
}

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
