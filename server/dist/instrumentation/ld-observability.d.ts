export declare const initLD_Observability: () => import("@launchdarkly/node-server-sdk").LDClient | null;
export declare const trackLD_Event: (eventName: string, userContext: any, metricData?: any) => Promise<boolean>;
