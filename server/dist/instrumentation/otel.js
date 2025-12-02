"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = void 0;
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_node_2 = require("@opentelemetry/sdk-trace-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const core_1 = require("@opentelemetry/core");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const instrumentation_winston_1 = require("@opentelemetry/instrumentation-winston");
const initTelemetry = () => {
    const resource = (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'forum-server',
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });
    const tracerProvider = new sdk_trace_node_1.NodeTracerProvider({
        resource: resource,
    });
    const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });
    tracerProvider.addSpanProcessor(new sdk_trace_node_2.BatchSpanProcessor(traceExporter));
    if (process.env.NODE_ENV !== 'production') {
        tracerProvider.addSpanProcessor(new sdk_trace_node_2.SimpleSpanProcessor(new sdk_trace_node_2.ConsoleSpanExporter()));
    }
    tracerProvider.register({
        propagator: new core_1.CompositePropagator({
            propagators: [
                new core_1.W3CTraceContextPropagator(),
                new core_1.W3CBaggagePropagator(),
            ],
        }),
    });
    (0, instrumentation_1.registerInstrumentations)({
        tracerProvider: tracerProvider,
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
            }),
            new instrumentation_winston_1.WinstonInstrumentation(),
        ],
    });
    const metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
        exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter({
            url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
        }),
        exportIntervalMillis: 60000,
    });
    const meterProvider = new sdk_metrics_1.MeterProvider({
        resource: resource,
        readers: [metricReader],
    });
    console.log('OpenTelemetry initialized');
    return { tracerProvider, meterProvider };
};
exports.initTelemetry = initTelemetry;
//# sourceMappingURL=otel.js.map