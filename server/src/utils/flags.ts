import { getLDClient } from './ldClient';
import { trace } from '@opentelemetry/api';
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
        // The TracingHook will automatically create spans and add attributes
        const detail = await client.variationDetail(flagKey, context, defaultValue);

        // We still keep our custom metric for now
        flagEvaluationCounter.add(1, {
            flag_key: flagKey,
            variation: String(detail.variationIndex),
            reason: detail.reason.kind
        });

        return detail.value;
    } catch (error) {
        if (span) {
            span.recordException(error as Error);
            span.setAttribute('feature_flag.evaluation_error', (error as Error).message);
        }
        return defaultValue;
    }
};
