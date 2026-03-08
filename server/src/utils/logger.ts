import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const { combine, timestamp, json, printf } = winston.format;

const otelFormat = winston.format((info) => {
    const span = trace.getSpan(context.active());
    if (span) {
        const spanContext = span.spanContext();
        info.trace_id = spanContext.traceId;
        info.span_id = spanContext.spanId;

        // trace_id and span_id are present for correlation with OTEL traces.
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
