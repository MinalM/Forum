"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateFlag = void 0;
const ldClient_1 = require("./ldClient");
const api_1 = require("@opentelemetry/api");
const metrics_1 = require("../instrumentation/metrics");
const evaluateFlag = async (flagKey, defaultValue, context) => {
    const client = (0, ldClient_1.getLDClient)();
    const span = api_1.trace.getActiveSpan();
    if (!client) {
        if (span) {
            span.setAttribute('feature_flag.evaluation_error', 'client_not_initialized');
        }
        return defaultValue;
    }
    try {
        const detail = await client.variationDetail(flagKey, context, defaultValue);
        metrics_1.flagEvaluationCounter.add(1, {
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
    }
    catch (error) {
        if (span) {
            span.recordException(error);
            span.setAttribute('feature_flag.evaluation_error', error.message);
        }
        return defaultValue;
    }
};
exports.evaluateFlag = evaluateFlag;
//# sourceMappingURL=flags.js.map