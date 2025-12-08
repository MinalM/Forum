"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ldClient_1 = require("../utils/ldClient");
/**
 * LaunchDarkly Observability Integration
 *
 * This module leverages the LaunchDarkly SDK's built-in observability features:
 * - TracingHook: Automatically creates spans for flag evaluations
 * - Event tracking: Sends events to LD analytics
 * - Metrics: Tracks flag evaluation metrics
 *
 * The TracingHook is already initialized in ldClient.ts with OTEL integration,
 * so all flag evaluations automatically:
 * 1. Create OTEL spans (sent to Grafana)
 * 2. Get tracked as events (sent to LaunchDarkly)
 */
const initLD_Observability = () => {
    const client = (0, ldClient_1.getLDClient)();
    if (!client) {
        console.warn('⚠️ LaunchDarkly SDK not initialized. Observability disabled.');
        return null;
    }
    try {
        console.log('✅ LaunchDarkly Observability Integration Active');
        console.log('  - Flag evaluations create OTEL spans');
        console.log('  - Spans sent to Grafana Cloud (OTEL_EXPORTER_OTLP_ENDPOINT)');
        console.log('  - Flag events sent to LaunchDarkly Dashboard');
        console.log('  - Service: forum-server');
        console.log('  - Environment:', process.env.NODE_ENV || 'development');
        return client;
    }
    catch (error) {
        console.error('❌ Failed to initialize LaunchDarkly observability:', error);
        return null;
    }
};
exports.initLD_Observability = initLD_Observability;
/**
 * Track custom events in LaunchDarkly
 * These events appear in LD Dashboard and are correlated with flag evaluations
 *
 * @param eventName - Name of the event (e.g., 'post-created')
 * @param userContext - User context from request
 * @param metricData - Optional metrics/data to track with the event
 */
const trackLD_Event = async (eventName, userContext, metricData) => {
    const client = (0, ldClient_1.getLDClient)();
    if (!client) {
        console.warn('LaunchDarkly client not available for event tracking');
        return false;
    }
    try {
        // Track the event in LaunchDarkly
        await client.track(eventName, userContext, metricData);
        console.log(`✅ Tracked event in LaunchDarkly: ${eventName}`);
        return true;
    }
    catch (error) {
        console.error(`Failed to track event '${eventName}':`, error);
        return false;
    }
};
exports.trackLD_Event = trackLD_Event;
//# sourceMappingURL=ld-observability.js.map
