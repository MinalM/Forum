"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLDClient = exports.initializeLDClient = void 0;
const node_server_sdk_1 = require("@launchdarkly/node-server-sdk");
const node_server_sdk_otel_1 = require("@launchdarkly/node-server-sdk-otel");
let ldClient;
const initializeLDClient = async () => {
    const sdkKey = process.env.LD_SDK_KEY;
    if (!sdkKey) {
        console.warn('LaunchDarkly SDK Key not found. Feature flags will default.');
        return;
    }
    const options = {
        hooks: [
            new node_server_sdk_otel_1.TracingHook(),
        ],
    };
    ldClient = (0, node_server_sdk_1.init)(sdkKey, options);
    try {
        await ldClient.waitForInitialization();
        console.log('LaunchDarkly Server SDK initialized');
    }
    catch (error) {
        console.error('LaunchDarkly Server SDK failed to initialize', error);
    }
};
exports.initializeLDClient = initializeLDClient;
const getLDClient = () => {
    return ldClient;
};
exports.getLDClient = getLDClient;
//# sourceMappingURL=ldClient.js.map