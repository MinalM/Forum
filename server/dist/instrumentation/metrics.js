"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateActiveConnections = exports.activeConnectionsGauge = exports.dbQueryDuration = exports.requestDuration = exports.userSessionCounter = exports.postViewCounter = exports.commentCreatedCounter = exports.userLoginOAuthCounter = exports.userLoginCounter = exports.userSignupCounter = exports.postCreatedCounter = exports.requestCounter = void 0;
const api_1 = require("@opentelemetry/api");
const meter = api_1.metrics.getMeter('forum-server-metrics');
exports.requestCounter = meter.createCounter('http.server.requests', {
    description: 'Count of HTTP requests',
});
exports.postCreatedCounter = meter.createCounter('posts.created', {
    description: 'Number of posts created',
});
exports.userSignupCounter = meter.createCounter('user.signup', {
    description: 'Number of user signups (regular registration)',
});
exports.userLoginCounter = meter.createCounter('user.login', {
    description: 'Number of user logins',
});
exports.userLoginOAuthCounter = meter.createCounter('user.login.oauth', {
    description: 'Number of OAuth logins',
});
exports.commentCreatedCounter = meter.createCounter('comments.created', {
    description: 'Number of comments created',
});
exports.postViewCounter = meter.createCounter('posts.views', {
    description: 'Number of post views',
});
exports.userSessionCounter = meter.createCounter('user.sessions', {
    description: 'Number of user sessions created',
});
exports.requestDuration = meter.createHistogram('http.server.duration', {
    description: 'Duration of HTTP requests',
    unit: 'ms',
});
exports.dbQueryDuration = meter.createHistogram('database.query.duration', {
    description: 'Duration of database queries',
    unit: 'ms',
});
exports.activeConnectionsGauge = meter.createObservableGauge('active.connections', {
    description: 'Number of active connections',
});
let activeConnections = 0;
exports.activeConnectionsGauge.addCallback((observableResult) => {
    observableResult.observe(activeConnections);
});
const updateActiveConnections = (count) => {
    activeConnections = count;
};
exports.updateActiveConnections = updateActiveConnections;
//# sourceMappingURL=metrics.js.map