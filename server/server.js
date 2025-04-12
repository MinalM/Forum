const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN || 'https://cerulean-marshmallow-003d16.netlify.app'] // Production environment
  : process.env.CI
    ? ['http://localhost:3000', 'http://127.0.0.1:3000'] // CI environment
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:2000', 'http://127.0.0.1:2000']; // Local development

console.log('Allowed Origins:', allowedOrigins); // Debug logging
console.log('NODE_ENV:', process.env.NODE_ENV); // Debug logging
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN); // Debug logging

app.use(cors({
  origin: function(origin, callback) {
    console.log('Request Origin:', origin); // Debug logging
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
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
const reports = require('./routes/reports');

// Mount routers
app.use('/api/users', users);
app.use('/api/categories', categories);
app.use('/api/posts', posts);
app.use('/api/posts/:postId/comments', comments); // Mount nested routes first
app.use('/api/comments', comments); // Then mount standalone routes
app.use('/api/reports', reports); // Add reports routes

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
      port: process.env.PORT || 2000
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

    // Log MongoDB connection string (with credentials redacted)
    const redactedUri = mongoUri.replace(
      /(mongodb\+srv:\/\/)([^:]+):([^@]+)@/,
      '$1[username]:[password]@'
    );
    console.log('Attempting MongoDB connection with URI:', redactedUri);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Enable Mongoose debug mode
    mongoose.set('debug', (collectionName, method, query, doc) => {
      console.log(`\n[MongoDB Query] ${collectionName}.${method}`, {
        query: JSON.stringify(query),
        doc: JSON.stringify(doc),
        timestamp: new Date().toISOString()
      });
    });

    // Add response logging
    const originalExec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = async function() {
      const startTime = Date.now();
      try {
        const result = await originalExec.apply(this, arguments);
        const endTime = Date.now();
        console.log(`\n[MongoDB Response] ${this.mongooseCollection.name}.${this.op}`, {
          result: JSON.stringify(result),
          duration: `${endTime - startTime}ms`,
          timestamp: new Date().toISOString()
        });
        return result;
      } catch (error) {
        console.error(`\n[MongoDB Error] ${this.mongooseCollection.name}.${this.op}`, {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };

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
  const PORT = process.env.PORT || 2000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

module.exports = app;
