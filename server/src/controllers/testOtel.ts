import { Request, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { evaluateFlag } from '../utils/flags';
import { logger } from '../utils/logger';

export const testOtelIntegration = async (req: Request, res: Response) => {
    const tracer = trace.getTracer('forum-server');

    return tracer.startActiveSpan('testOtelIntegration', async (span) => {
        try {
            // Add custom attributes
            span.setAttribute('test.type', 'otel_ld_integration');
            span.setAttribute('user.id', (req as any).user?.id || 'anonymous');

            // Log with trace context
            logger.info('Testing OTel and LD integration', {
                endpoint: '/api/test/otel',
                user: (req as any).user?.id
            });

            // Evaluate a LaunchDarkly flag
            const ldContext = (req as any).ldContext || {
                kind: 'user',
                key: 'test-user',
                anonymous: true
            };

            const enableNewFeature = await evaluateFlag(
                'enable-new-feature',
                false,
                ldContext
            );

            // Add span event
            span.addEvent('flag_evaluated', {
                'flag.key': 'enable-new-feature',
                'flag.value': String(enableNewFeature)
            });

            logger.info('Flag evaluation complete', {
                flagKey: 'enable-new-feature',
                flagValue: enableNewFeature
            });

            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 100));

            span.setStatus({ code: SpanStatusCode.OK });

            res.status(200).json({
                success: true,
                message: 'OTel and LD integration test successful',
                data: {
                    flagEvaluated: 'enable-new-feature',
                    flagValue: enableNewFeature,
                    traceId: span.spanContext().traceId,
                    spanId: span.spanContext().spanId,
                    ldContext: ldContext
                }
            });
        } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
            logger.error('Test failed', { error: (error as Error).message });

            res.status(500).json({
                success: false,
                error: (error as Error).message
            });
        } finally {
            span.end();
        }
    });
};
