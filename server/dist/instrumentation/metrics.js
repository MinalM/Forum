"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateActiveConnections = exports.activeConnectionsGauge = exports.dbQueryDuration = exports.requestDuration = exports.flagEvaluationCounter = exports.postCreatedCounter = exports.requestCounter = void 0;
const api_1 = require("@opentelemetry/api");
const meter = api_1.metrics.getMeter('forum-server-metrics');
exports.requestCounter = meter.createCounter('http.server.requests', {
    description: 'Count of HTTP requests',
});
exports.postCreatedCounter = meter.createCounter('posts.created', {
    description: 'Number of posts created',
});
exports.flagEvaluationCounter = meter.createCounter('feature_flag.evaluations', {
    description: 'Number of feature flag evaluations',
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