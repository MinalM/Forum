import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('forum-server-metrics');

// Counters
export const requestCounter = meter.createCounter('http.server.requests', {
    description: 'Count of HTTP requests',
});

export const postCreatedCounter = meter.createCounter('posts.created', {
    description: 'Number of posts created',
});

export const flagEvaluationCounter = meter.createCounter('feature_flag.evaluations', {
    description: 'Number of feature flag evaluations',
});

// User Authentication Counters
export const userSignupCounter = meter.createCounter('user.signup', {
    description: 'Number of user signups (regular registration)',
});

export const userLoginCounter = meter.createCounter('user.login', {
    description: 'Number of user logins',
});

export const userLoginOAuthCounter = meter.createCounter('user.login.oauth', {
    description: 'Number of OAuth logins',
});

// Content Counters
export const commentCreatedCounter = meter.createCounter('comments.created', {
    description: 'Number of comments created',
});

export const postViewCounter = meter.createCounter('posts.views', {
    description: 'Number of post views',
});

// Session Counters
export const userSessionCounter = meter.createCounter('user.sessions', {
    description: 'Number of user sessions created',
});

// Histograms
export const requestDuration = meter.createHistogram('http.server.duration', {
    description: 'Duration of HTTP requests',
    unit: 'ms',
});

export const dbQueryDuration = meter.createHistogram('database.query.duration', {
    description: 'Duration of database queries',
    unit: 'ms',
});

// Gauges (using Observable Gauge)
export const activeConnectionsGauge = meter.createObservableGauge('active.connections', {
    description: 'Number of active connections',
});

// Example of setting the gauge value (needs to be done via callback)
// In a real app, you'd hook this into your connection pool
let activeConnections = 0;
activeConnectionsGauge.addCallback((observableResult) => {
    observableResult.observe(activeConnections);
});

export const updateActiveConnections = (count: number) => {
    activeConnections = count;
};
