import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

let sdk: NodeSDK | null = null;

export const initTelemetry = () => {
    const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
        }),
        exportIntervalMillis: 60000,
    });

    sdk = new NodeSDK({
        traceExporter,
        metricReader,
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
            }),
            new WinstonInstrumentation(),
        ],
        serviceName: process.env.OTEL_SERVICE_NAME || 'forum-server',
    });

    sdk.start();

    console.log('🔍 OTel Configuration:');
    console.log(`  - Exporter: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'}`);
    console.log(`  - Service: ${process.env.OTEL_SERVICE_NAME || 'forum-server'}`);
    console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('✅ OpenTelemetry initialized');

    return { sdk };
};

