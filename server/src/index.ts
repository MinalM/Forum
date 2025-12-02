import { initTelemetry } from './instrumentation/otel';

// Initialize OpenTelemetry before any other modules (only if not already initialized)
if (!(global as any).__OTEL_INITIALIZED__) {
    initTelemetry();
    (global as any).__OTEL_INITIALIZED__ = true;
}

// Import the server (this will load Express and other dependencies)
import './server';
