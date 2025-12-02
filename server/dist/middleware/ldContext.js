"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ldContextMiddleware = void 0;
const api_1 = require("@opentelemetry/api");
const ldContextMiddleware = (req, res, next) => {
    const user = req.user;
    const context = {
        kind: 'user',
        key: user ? user.id.toString() : 'anonymous',
        name: user ? user.name : undefined,
        email: user ? user.email : undefined,
        anonymous: !user
    };
    req.ldContext = context;
    const span = api_1.trace.getActiveSpan();
    if (span) {
        span.setAttribute('ld.context.key', context.key);
    }
    next();
};
exports.ldContextMiddleware = ldContextMiddleware;
//# sourceMappingURL=ldContext.js.map