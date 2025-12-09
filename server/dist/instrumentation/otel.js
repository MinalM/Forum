"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const instrumentation_winston_1 = require("@opentelemetry/instrumentation-winston");
let sdk = null;
const initTelemetry = () => {
    // Parse headers from OTEL_EXPORTER_OTLP_HEADERS env var
    const headerString = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
    const headers = {};
    if (headerString) {
        // Parse "Authorization=Basic XXX,Custom=Value" format
        headerString.split(',').forEach(header => {
            const parts = header.trim().split('=');
            if (parts[0] && parts[1]) {
                headers[parts[0]] = parts[1];
            }
        });
    }
    const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        headers: headers,
    });
    const metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
        exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter({
            url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
            headers: headers,
        }),
        exportIntervalMillis: 60000,
    });
    sdk = new sdk_node_1.NodeSDK({
        traceExporter,
        metricReader,
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
            }),
            new instrumentation_winston_1.WinstonInstrumentation(),
        ],
        serviceName: process.env.OTEL_SERVICE_NAME || 'forum-server',
    });
    sdk.start();
    console.log('🔍 OTel Configuration:');
    console.log(`  - Exporter: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'}`);
    console.log(`  - Service: ${process.env.OTEL_SERVICE_NAME || 'forum-server'}`);
    console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  - Auth Headers: ${Object.keys(headers).length > 0 ? 'Configured ✓' : 'None'}`);
    console.log('✅ OpenTelemetry initialized - spans will be exported on each request');
    // Log after small delay to ensure SDK is ready
    setTimeout(() => {
        console.log('📊 OTEL SDK ready - waiting for trace exports...');
    }, 100);
    return { sdk };
};
exports.initTelemetry = initTelemetry;
//# sourceMappingURL=otel.js.map
