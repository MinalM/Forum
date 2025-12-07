import { init, LDClient, LDOptions } from '@launchdarkly/node-server-sdk';
import { TracingHook } from '@launchdarkly/node-server-sdk-otel';

let ldClient: LDClient;

export const initializeLDClient = async (): Promise<void> => {
    const sdkKey = process.env.LD_SDK_KEY;
    if (!sdkKey) {
        console.warn('LaunchDarkly SDK Key not found. Feature flags will default.');
        return;
    }

    const options: LDOptions = {
        hooks: [
            new TracingHook(),
        ],
    };

    ldClient = init(sdkKey, options);

    try {
        await ldClient.waitForInitialization();
        console.log('LaunchDarkly Server SDK initialized');
    } catch (error) {
        console.error('LaunchDarkly Server SDK failed to initialize', error);
    }
};

export const getLDClient = (): LDClient => {
    return ldClient;
};
