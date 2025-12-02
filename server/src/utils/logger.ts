import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const { combine, timestamp, json, printf } = winston.format;

const otelFormat = winston.format((info) => {
    const span = trace.getSpan(context.active());
    if (span) {
        const spanContext = span.spanContext();
        info.trace_id = spanContext.traceId;
        info.span_id = spanContext.spanId;

        // Add LaunchDarkly context if available in the active span attributes
        // Note: Attributes are not directly accessible from the span object in the API
        // We rely on the fact that we added them to the span, but for logging, 
        // we might need to pass them explicitly or rely on the fact that they are in the trace.
        // However, for this requirement, we'll ensure trace_id and span_id are present.
    }
    return info;
})();

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        otelFormat,
        json()
    ),
    transports: [
        new winston.transports.Console()
    ],
});
