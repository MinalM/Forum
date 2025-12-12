"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackLD_Event = exports.initLD_Observability = void 0;
const ldClient_1 = require("../utils/ldClient");
const initLD_Observability = () => {
    const client = (0, ldClient_1.getLDClient)();
    if (!client) {
        console.warn('⚠️ LaunchDarkly SDK not initialized. Observability disabled.');
        return null;
    }
    try {
        console.log('✅ LaunchDarkly Observability Integration Active');
        console.log('  - Flag evaluations create OTEL spans');
        console.log('  - Events will be sent to LaunchDarkly Dashboard');
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
const trackLD_Event = async (eventName, userContext, metricData) => {
    const client = (0, ldClient_1.getLDClient)();
    if (!client) {
        console.warn('LaunchDarkly client not available for event tracking');
        return false;
    }
    try {
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