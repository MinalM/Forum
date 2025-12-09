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

// Set default values for required environment variables before loading app
if (!process.env.JWT_EXPIRE) {
  process.env.JWT_EXPIRE = '24h';
}

let app;
try {
  // Try to load compiled TypeScript version first
  app = require('./dist/server').default;
} catch (error) {
  console.warn('Failed to load compiled server, falling back to alternative', error.message);
  // This shouldn't normally happen, but just in case
  process.exit(1);
}

module.exports = app;
