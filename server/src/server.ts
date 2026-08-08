import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { json, urlencoded } from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import MongoStore from 'connect-mongo';
import path from 'path';
dotenv.config();

// Set default values for required environment variables
if (!process.env.JWT_EXPIRE) {
  process.env.JWT_EXPIRE = '24h';
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Import existing JS modules
const users = require('../routes/users');
const posts = require('../routes/posts');
const comments = require('../routes/comments');
const categories = require('../routes/categories');
const reports = require('../routes/reports');
const errorMiddleware = require('../middleware/error');

// Configure Passport
require('../config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN || 'https://cerulean-marshmallow-003d16.netlify.app']
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:2000', 'http://127.0.0.1:2000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

import { requestCounter, requestDuration } from './instrumentation/metrics';
import { recordForSentinel } from './instrumentation/sentinel-reporter';

app.use(async (req, res, next) => {
  const startTime = Date.now();
  const artificialDelay = parseInt(process.env.ARTIFICIAL_LATENCY_MS || '0');
  if (artificialDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, artificialDelay));
  }
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route ? req.route.path : req.path;

    requestCounter.add(1, {
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    });

    requestDuration.record(duration, {
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    });

    recordForSentinel(duration);
  });
  next();
});

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

import { experimentContextMiddleware } from './middleware/experimentContext';
app.use(experimentContextMiddleware);

// Routes
app.use('/api/users', users);
app.use('/api/categories', categories);
app.use('/api/posts', posts);
app.use('/api/posts/:postId/comments', comments);
app.use('/api/comments', comments);
app.use('/api/reports', reports);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    environment: process.env.NODE_ENV,
    dbState: mongoose.connection.readyState
  });
});

// OTEL Diagnostics (for troubleshooting)
import otelDiagnostics from './routes/otel-diagnostics';
app.use('/api', otelDiagnostics);

// Error Handler
app.use(errorMiddleware);

import { logger } from './utils/logger';
import { initExperimentation, shutdownExperimentation } from './services/experimentation';

// Without a listener, Node's EventEmitter throws on an unhandled 'error'
// event, so a post-startup blip (e.g. a mongoose monitor timeout when Docker
// Desktop restarts) took down the whole API instead of letting the driver
// auto-reconnect. Log it and let /api/health's dbState reflect the state.
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

const startServer = async () => {
  // Connect to Mongo
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB Connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }

  await initExperimentation();
  logger.info('Experimentation service initialized');

  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });

  process.on('SIGTERM', async () => {
    await shutdownExperimentation();
    process.exit(0);
  });
};

if (process.env.NODE_ENV !== 'test' || process.env.START_SERVER === 'true') {
  startServer();
}

export { startServer };
export default app;
