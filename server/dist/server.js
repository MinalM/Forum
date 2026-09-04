"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const express_2 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const passport_1 = __importDefault(require("passport"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
dotenv_1.default.config();
if (!process.env.JWT_EXPIRE) {
    process.env.JWT_EXPIRE = '24h';
}
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const users = require('../routes/users');
const posts = require('../routes/posts');
const comments = require('../routes/comments');
const categories = require('../routes/categories');
const reports = require('../routes/reports');
const subscriptions = require('../routes/subscriptions');
const tagSubscriptions = require('../routes/tagSubscriptions');
const notifications = require('../routes/notifications');
const savedPosts = require('../routes/savedPosts');
const errorMiddleware = require('../middleware/error');
require('../config/passport');
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.CORS_ORIGIN || 'https://cerulean-marshmallow-003d16.netlify.app']
    : [
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:2000', 'http://127.0.0.1:2000',
        'http://localhost:4173', 'http://127.0.0.1:4173'
    ];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
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
app.use((0, express_2.json)());
app.use((0, express_2.urlencoded)({ extended: true }));
app.use((0, cookie_parser_1.default)());
const metrics_1 = require("./instrumentation/metrics");
const sentinel_reporter_1 = require("./instrumentation/sentinel-reporter");
app.use(async (req, res, next) => {
    const startTime = Date.now();
    const artificialDelay = parseInt(process.env.ARTIFICIAL_LATENCY_MS || '0');
    if (artificialDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, artificialDelay));
    }
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const route = req.route ? req.route.path : req.path;
        metrics_1.requestCounter.add(1, {
            method: req.method,
            route: route,
            status_code: res.statusCode.toString()
        });
        metrics_1.requestDuration.record(duration, {
            method: req.method,
            route: route,
            status_code: res.statusCode.toString()
        });
        (0, sentinel_reporter_1.recordForSentinel)(duration);
    });
    next();
});
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
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
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
const experimentContext_1 = require("./middleware/experimentContext");
app.use(experimentContext_1.experimentContextMiddleware);
app.use('/api/users', users);
app.use('/api/categories', categories);
app.use('/api/posts', posts);
app.use('/api/posts/:postId/comments', comments);
app.use('/api/comments', comments);
app.use('/api/reports', reports);
app.use('/api/subscriptions', subscriptions);
app.use('/api/tags', tagSubscriptions);
app.use('/api/notifications', notifications);
app.use('/api/saved-posts', savedPosts);
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        environment: process.env.NODE_ENV,
        dbState: mongoose_1.default.connection.readyState
    });
});
const otel_diagnostics_1 = __importDefault(require("./routes/otel-diagnostics"));
app.use('/api', otel_diagnostics_1.default);
const sitemap_1 = __importDefault(require("./routes/sitemap"));
app.use(sitemap_1.default);
app.use(errorMiddleware);
const logger_1 = require("./utils/logger");
const experimentation_1 = require("./services/experimentation");
mongoose_1.default.connection.on('error', (err) => {
    logger_1.logger.error('MongoDB connection error:', err);
});
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum';
        await mongoose_1.default.connect(mongoUri);
        logger_1.logger.info('MongoDB Connected');
    }
    catch (err) {
        logger_1.logger.error('MongoDB connection error:', err);
        process.exit(1);
    }
    await (0, experimentation_1.initExperimentation)();
    logger_1.logger.info('Experimentation service initialized');
    app.listen(PORT, () => {
        logger_1.logger.info(`Server is running on port ${PORT}`);
    });
    process.on('SIGTERM', async () => {
        await (0, experimentation_1.shutdownExperimentation)();
        process.exit(0);
    });
};
exports.startServer = startServer;
if (process.env.NODE_ENV !== 'test' || process.env.START_SERVER === 'true') {
    startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map