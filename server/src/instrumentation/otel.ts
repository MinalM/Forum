import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

let sdk: NodeSDK | null = null;

export const initTelemetry = () => {
    // Parse headers from OTEL_EXPORTER_OTLP_HEADERS env var
    const headerString = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
    const headers: Record<string, string> = {};
    
    if (headerString) {
        // Parse "Authorization=Basic XXX,Custom=Value" format
        headerString.split(',').forEach(header => {
            const [key, value] = header.trim().split('=');
            if (key && value) {
                headers[key] = value;
            }
        });
    }

    const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        headers: headers,
    });

    const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
            headers: headers,
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
    console.log(`  - Auth Headers: ${Object.keys(headers).length > 0 ? 'Configured ✓' : 'None'}`);
    console.log('✅ OpenTelemetry initialized - spans will be exported on each request');
    
    // Log after small delay to ensure SDK is ready
    setTimeout(() => {
        console.log('📊 OTEL SDK ready - waiting for trace exports...');
    }, 100);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('🔌 SIGTERM received - flushing telemetry...');
        if (sdk) {
            await sdk.shutdown();
            console.log('✓ Telemetry flushed and SDK shut down');
        }
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('🔌 SIGINT received - flushing telemetry...');
        if (sdk) {
            await sdk.shutdown();
            console.log('✓ Telemetry flushed and SDK shut down');
        }
        process.exit(0);
    });

    return { sdk };
};

