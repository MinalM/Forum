import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
export declare const initTelemetry: () => {
    tracerProvider: NodeTracerProvider;
    meterProvider: MeterProvider;
};
