import { Router } from 'express';
import { trace } from '@opentelemetry/api';

const router = Router();

/**
 * Test endpoint to verify OTEL configuration and connectivity
 * GET /api/otel-diagnostics
 */
router.get('/otel-diagnostics', async (req, res) => {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        configuration: {
            endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'NOT SET',
            metricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'NOT SET',
            serviceName: process.env.OTEL_SERVICE_NAME || 'NOT SET',
            hasAuthHeaders: !!process.env.OTEL_EXPORTER_OTLP_HEADERS,
            nodeEnv: process.env.NODE_ENV || 'development',
        },
        tests: {
            tracerAvailable: false,
            spanCreated: false,
            exporterReachable: 'UNKNOWN',
        },
    };

    // Test 1: Check if tracer is available
    try {
        const tracer = trace.getTracer('diagnostic-tracer');
        diagnostics.tests.tracerAvailable = !!tracer;

        // Test 2: Try to create a test span
        const span = tracer.startSpan('diagnostic-test-span');
        span.setAttribute('test.type', 'diagnostic');
        span.setAttribute('test.timestamp', Date.now());
        span.addEvent('Diagnostic test event');

        diagnostics.tests.spanCreated = true;
        diagnostics.tests.traceId = span.spanContext().traceId;
        diagnostics.tests.spanId = span.spanContext().spanId;

        // End span after a brief delay to ensure it gets exported
        setTimeout(() => span.end(), 100);
    } catch (error: any) {
        diagnostics.tests.tracerError = error.message;
    }

    // Test 3: Try to reach the OTLP endpoint
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
        try {
            const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

            // Parse headers
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
                const headerString = process.env.OTEL_EXPORTER_OTLP_HEADERS;
                headerString.split(',').forEach(header => {
                    const [key, value] = header.trim().split('=');
                    if (key && value) {
                        headers[key] = value;
                    }
                });
            }

            // Try to connect (with timeout)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({ test: 'connectivity' }),
                signal: controller.signal,
            }).catch((error: any) => {
                clearTimeout(timeoutId);
                throw error;
            });

            clearTimeout(timeoutId);

            diagnostics.tests.exporterReachable = 'YES';
            diagnostics.tests.exporterStatus = response.status;
            diagnostics.tests.exporterStatusText = response.statusText;
        } catch (error: any) {
            diagnostics.tests.exporterReachable = 'NO';
            diagnostics.tests.exporterError = error.message;

            if (error.name === 'AbortError') {
                diagnostics.tests.exporterError = 'Connection timeout (5s)';
            }
        }
    } else {
        diagnostics.tests.exporterReachable = 'NO_ENDPOINT_CONFIGURED';
    }

    // Recommendations based on results
    const recommendations: string[] = [];

    if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
        recommendations.push('⚠️ OTEL_EXPORTER_OTLP_ENDPOINT is not set. Set it to your collector URL.');
    }

    if (!process.env.OTEL_SERVICE_NAME) {
        recommendations.push('⚠️ OTEL_SERVICE_NAME is not set. Set it to identify your service (e.g., "forum-server").');
    }

    if (diagnostics.tests.exporterReachable === 'NO') {
        recommendations.push('❌ Cannot reach OTLP endpoint. Check URL, firewall, and network connectivity.');
    }

    if (diagnostics.tests.exporterStatus === 401 || diagnostics.tests.exporterStatus === 403) {
        recommendations.push('🔒 Authentication failed. Check OTEL_EXPORTER_OTLP_HEADERS.');
    }

    if (diagnostics.tests.exporterReachable === 'YES' && diagnostics.tests.exporterStatus === 200) {
        recommendations.push('✅ OTLP endpoint is reachable and accepting requests!');
    }

    if (!diagnostics.tests.tracerAvailable) {
        recommendations.push('❌ OpenTelemetry tracer not available. Check if OTEL SDK is initialized.');
    }

    if (diagnostics.tests.spanCreated && diagnostics.tests.exporterReachable === 'YES') {
        recommendations.push(`✅ Test span created with trace ID: ${diagnostics.tests.traceId}`);
        recommendations.push('🔍 Check Grafana for this trace in the next 1-2 minutes.');
    }

    diagnostics.recommendations = recommendations;

    res.json(diagnostics);
});

/**
 * Create a manual test trace
 * GET /api/test-trace
 */
router.get('/test-trace', (req, res) => {
    const tracer = trace.getTracer('test-tracer');
    const span = tracer.startSpan('manual-test-operation');

    span.setAttribute('test.type', 'manual');
    span.setAttribute('test.user', 'diagnostic');
    span.setAttribute('http.method', 'GET');
    span.setAttribute('http.url', '/api/test-trace');

    span.addEvent('Test trace started');

    // Simulate some work
    setTimeout(() => {
        span.addEvent('Test work completed');
        span.end();

        res.json({
            success: true,
            message: 'Test trace created and exported',
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId,
            instructions: [
                '1. Copy the traceId above',
                '2. Go to Grafana → Explore → Select Tempo data source',
                '3. Search for this trace ID',
                '4. You should see the trace with name "manual-test-operation"',
                '5. If not visible, wait 1-2 minutes for export and try again',
            ],
        });
    }, 100);
});

export default router;
