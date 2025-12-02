// This file redirects to the compiled TypeScript output
// ensuring that legacy imports (like in tests) get the new code.

// Initialize OpenTelemetry only if not already initialized
if (!global.__OTEL_INITIALIZED__) {
  try {
    const { initTelemetry } = require('./dist/instrumentation/otel');
    initTelemetry();
    global.__OTEL_INITIALIZED__ = true;
  } catch (error) {
    console.warn('Failed to initialize OpenTelemetry in legacy server.js:', error);
  }
}

const app = require('./dist/server').default;
module.exports = app;
