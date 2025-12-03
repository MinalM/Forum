"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLDClient = exports.initializeLDClient = void 0;
const launchdarkly_node_server_sdk_1 = __importDefault(require("launchdarkly-node-server-sdk"));
let ldClient;
const initializeLDClient = async () => {
    const sdkKey = process.env.LD_SDK_KEY;
    if (!sdkKey) {
        console.warn('LaunchDarkly SDK Key not found. Feature flags will default.');
        return;
    }
    const logLevel = (process.env.LD_LOG_LEVEL || 'info');
    const options = {
        logger: launchdarkly_node_server_sdk_1.default.basicLogger({
            level: logLevel,
            destination: console.log
        })
    };
    ldClient = launchdarkly_node_server_sdk_1.default.init(sdkKey, options);
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