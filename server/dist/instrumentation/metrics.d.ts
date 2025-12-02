export declare const requestCounter: import("@opentelemetry/api").Counter<import("@opentelemetry/api").Attributes>;
export declare const postCreatedCounter: import("@opentelemetry/api").Counter<import("@opentelemetry/api").Attributes>;
export declare const flagEvaluationCounter: import("@opentelemetry/api").Counter<import("@opentelemetry/api").Attributes>;
export declare const requestDuration: import("@opentelemetry/api").Histogram<import("@opentelemetry/api").Attributes>;
export declare const dbQueryDuration: import("@opentelemetry/api").Histogram<import("@opentelemetry/api").Attributes>;
export declare const activeConnectionsGauge: import("@opentelemetry/api").ObservableGauge<import("@opentelemetry/api").Attributes>;
export declare const updateActiveConnections: (count: number) => void;
