import LaunchDarkly from 'launchdarkly-node-server-sdk';
import { TracingHook } from '@launchdarkly/node-server-sdk-otel';

let ldClient: LaunchDarkly.LDClient;

export const initializeLDClient = async (): Promise<void> => {
    const sdkKey = process.env.LD_SDK_KEY;
    if (!sdkKey) {
        console.warn('LaunchDarkly SDK Key not found. Feature flags will default.');
        return;
    }

    const options: LaunchDarkly.LDOptions = {
        hooks: {
            beforeEvaluation: [new TracingHook()],
        },
    };

    ldClient = LaunchDarkly.init(sdkKey, options);

    try {
        await ldClient.waitForInitialization();
        console.log('LaunchDarkly Server SDK initialized');
    } catch (error) {
        console.error('LaunchDarkly Server SDK failed to initialize', error);
    }
};

export const getLDClient = (): LaunchDarkly.LDClient => {
    return ldClient;
};
