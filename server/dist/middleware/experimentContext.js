"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.experimentContextMiddleware = void 0;
const api_1 = require("@opentelemetry/api");
const experimentContextMiddleware = (req, res, next) => {
    const user = req.user;
    const experimentUser = user
        ? {
            userID: user.id.toString(),
            email: user.email,
            custom: {
                role: user.role,
                authProvider: user.authProvider,
            },
        }
        : {
            userID: `anon-${req.sessionID || 'unknown'}`,
        };
    req.experimentUser = experimentUser;
    const span = api_1.trace.getActiveSpan();
    if (span) {
        span.setAttribute('experiment.user.id', experimentUser.userID);
    }
    next();
};
exports.experimentContextMiddleware = experimentContextMiddleware;
//# sourceMappingURL=experimentContext.js.map