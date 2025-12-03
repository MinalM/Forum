"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testOtelIntegration = void 0;
const api_1 = require("@opentelemetry/api");
const flags_1 = require("../utils/flags");
const logger_1 = require("../utils/logger");
const testOtelIntegration = async (req, res) => {
    const tracer = api_1.trace.getTracer('forum-server');
    return tracer.startActiveSpan('testOtelIntegration', async (span) => {
        try {
            span.setAttribute('test.type', 'otel_ld_integration');
            span.setAttribute('user.id', req.user?.id || 'anonymous');
            logger_1.logger.info('Testing OTel and LD integration', {
                endpoint: '/api/test/otel',
                user: req.user?.id
            });
            const ldContext = req.ldContext || {
                kind: 'user',
                key: 'test-user',
                anonymous: true
            };
            const enableNewFeature = await (0, flags_1.evaluateFlag)('enable-new-feature', false, ldContext);
            span.addEvent('flag_evaluated', {
                'flag.key': 'enable-new-feature',
                'flag.value': String(enableNewFeature)
            });
            logger_1.logger.info('Flag evaluation complete', {
                flagKey: 'enable-new-feature',
                flagValue: enableNewFeature
            });
            await new Promise(resolve => setTimeout(resolve, 100));
            span.setStatus({ code: api_1.SpanStatusCode.OK });
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
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: api_1.SpanStatusCode.ERROR });
            logger_1.logger.error('Test failed', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
        finally {
            span.end();
        }
    });
};
exports.testOtelIntegration = testOtelIntegration;
//# sourceMappingURL=testOtel.js.map