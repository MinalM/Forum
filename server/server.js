const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS with credentials
const allowedOrigins = process.env.CI 
  ? ['http://localhost:3000', 'http://127.0.0.1:3000'] // CI environment
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:2000', 'http://127.0.0.1:2000']; // Local development

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
require('./config/passport');

// Route files
const users = require('./routes/users');
const posts = require('./routes/posts');
const comments = require('./routes/comments');
const categories = require('./routes/categories');

// Mount routers
app.use('/api/users', users);
app.use('/api/categories', categories);
app.use('/api/posts', posts);
app.use('/api/posts/:postId/comments', comments); // Mount nested routes first
app.use('/api/comments', comments); // Then mount standalone routes

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get system info
    const systemInfo = {
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now(),
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      port: process.env.PORT || 5000
    };

    res.status(200).json({
      status: 'UP',
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      system: systemInfo
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      error: error.message
    });
  }
});

// Error handler
app.use(require('./middleware/error'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.NODE_ENV === 'test'
      ? global.__MONGO_URI__
      : (process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum');

    const options = {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    await mongoose.connect(mongoUri, options);

    if (process.env.NODE_ENV !== 'test') {
      console.log('MongoDB Connected...');
    }

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Only connect to DB and start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  // Use PORT from environment variable, defaulting to 5000 for CI if not set
  const PORT = process.env.CI ? 5000 : (process.env.PORT || 2000);
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

module.exports = app;
