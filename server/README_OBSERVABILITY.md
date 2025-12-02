# Observability Setup

This application is instrumented with OpenTelemetry (OTel) for traces, metrics, and logs, and integrated with LaunchDarkly for feature flagging context.

## Configuration

The following environment variables are required:

| Variable | Description | Example |
|----------|-------------|---------|
| `OTEL_SERVICE_NAME` | Name of the service | `forum-server` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP Trace Endpoint | `http://localhost:4318/v1/traces` |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | OTLP Metrics Endpoint | `http://localhost:4318/v1/metrics` |
| `LD_SDK_KEY` | LaunchDarkly Server SDK Key | `sdk-key-here` |

## Features

### Tracing
- **Auto-instrumentation**: HTTP (Express), MongoDB (Mongoose), and more.
- **Manual Instrumentation**: Critical paths like `createPost` are manually instrumented with custom attributes.
- **LaunchDarkly Integration**: Active spans are enriched with feature flag evaluation details (`feature_flag.key`, `value`, `variation`, `reason`).

### Metrics
- **HTTP Metrics**: `http.server.requests` (Counter), `http.server.duration` (Histogram).
- **Business Metrics**: `posts.created` (Counter), `feature_flag.evaluations` (Counter).
- **System Metrics**: Standard Node.js metrics (CPU, Memory) via auto-instrumentation.

### Context Propagation
- Uses W3C Trace Context and Baggage propagators.
- LaunchDarkly context is created from the authenticated user and propagated to spans.

## Development

To run the server with observability enabled:

```bash
npm run dev
```

Ensure you have an OTLP collector (like Jaeger, Prometheus, or a vendor agent) running at the configured endpoints.

## Troubleshooting

- **Missing Traces**: Check `OTEL_EXPORTER_OTLP_ENDPOINT`. Ensure the collector is reachable.
- **LaunchDarkly Errors**: Verify `LD_SDK_KEY`. Check logs for "LaunchDarkly Server SDK initialized".
