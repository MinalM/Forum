import LaunchDarkly from 'launchdarkly-node-server-sdk';

let ldClient: LaunchDarkly.LDClient;

export const initializeLDClient = async (): Promise<void> => {
    const sdkKey = process.env.LD_SDK_KEY;
    if (!sdkKey) {
        console.warn('LaunchDarkly SDK Key not found. Feature flags will default.');
        return;
    }

    // Enable debug logging for LaunchDarkly
    const logLevel = (process.env.LD_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';
    const options: LaunchDarkly.LDOptions = {
        logger: LaunchDarkly.basicLogger({
            level: logLevel,
            destination: console.log
        })
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
