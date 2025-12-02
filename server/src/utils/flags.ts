import { getLDClient } from './ldClient';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { flagEvaluationCounter } from '../instrumentation/metrics';

export const evaluateFlag = async (
    flagKey: string,
    defaultValue: any,
    context: any
) => {
    const client = getLDClient();
    const span = trace.getActiveSpan();

    if (!client) {
        if (span) {
            span.setAttribute('feature_flag.evaluation_error', 'client_not_initialized');
        }
        return defaultValue;
    }

    try {
        const detail = await client.variationDetail(flagKey, context, defaultValue);

        flagEvaluationCounter.add(1, {
            flag_key: flagKey,
            variation: String(detail.variationIndex),
            reason: detail.reason.kind
        });

        if (span) {
            span.setAttribute(`feature_flag.${flagKey}.value`, String(detail.value));
            span.setAttribute(`feature_flag.${flagKey}.variation`, String(detail.variationIndex));
            span.setAttribute(`feature_flag.${flagKey}.reason`, String(detail.reason.kind));
        }

        return detail.value;
    } catch (error) {
        if (span) {
            span.recordException(error as Error);
            span.setAttribute('feature_flag.evaluation_error', (error as Error).message);
        }
        return defaultValue;
    }
};
