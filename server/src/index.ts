import { initTelemetry } from './instrumentation/otel';
import { initLD_Observability } from './instrumentation/ld-observability';

// Initialize OpenTelemetry before any other modules (only if not already initialized)
if (!(global as any).__OTEL_INITIALIZED__) {
    initTelemetry();
    (global as any).__OTEL_INITIALIZED__ = true;
}

// Initialize LaunchDarkly Observability Integration (hybrid approach)
if (!(global as any).__LD_OBS_INITIALIZED__) {
    initLD_Observability();
    (global as any).__LD_OBS_INITIALIZED__ = true;
}

// Import the server (this will load Express and other dependencies)
import './server';
