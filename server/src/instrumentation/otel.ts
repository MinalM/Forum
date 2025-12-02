import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor, SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

export const initTelemetry = () => {
    const resource = resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'forum-server',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // --- Tracing Setup ---
    const tracerProvider = new NodeTracerProvider({
        resource: resource,
    });

    const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    // Cast to any to avoid linter issues with addSpanProcessor if types are mismatched
    (tracerProvider as any).addSpanProcessor(new BatchSpanProcessor(traceExporter));

    if (process.env.NODE_ENV !== 'production') {
        (tracerProvider as any).addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    tracerProvider.register({
        propagator: new CompositePropagator({
            propagators: [
                new W3CTraceContextPropagator(),
                new W3CBaggagePropagator(),
            ],
        }),
    });

    registerInstrumentations({
        tracerProvider: tracerProvider,
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
            }),
            new WinstonInstrumentation(),
        ],
    });

    // --- Metrics Setup ---
    const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
        }),
        exportIntervalMillis: 60000,
    });

    const meterProvider = new MeterProvider({
        resource: resource,
        readers: [metricReader],
    });

    console.log('OpenTelemetry initialized');

    return { tracerProvider, meterProvider };
};
