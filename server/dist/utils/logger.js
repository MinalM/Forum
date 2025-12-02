"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const api_1 = require("@opentelemetry/api");
const { combine, timestamp, json, printf } = winston_1.default.format;
const otelFormat = winston_1.default.format((info) => {
    const span = api_1.trace.getSpan(api_1.context.active());
    if (span) {
        const spanContext = span.spanContext();
        info.trace_id = spanContext.traceId;
        info.span_id = spanContext.spanId;
    }
    return info;
})();
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), otelFormat, json()),
    transports: [
        new winston_1.default.transports.Console()
    ],
});
//# sourceMappingURL=logger.js.map