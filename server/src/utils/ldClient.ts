import LaunchDarkly from 'launchdarkly-node-server-sdk';

let ldClient: LaunchDarkly.LDClient;

export const initializeLDClient = async (): Promise<void> => {
    const sdkKey = process.env.LD_SDK_KEY;
    if (!sdkKey) {
        console.warn('LaunchDarkly SDK Key not found. Feature flags will default.');
        return;
    }

    ldClient = LaunchDarkly.init(sdkKey);

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
