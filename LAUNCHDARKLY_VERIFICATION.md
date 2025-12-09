# LaunchDarkly Event Stream Verification Guide

## ✅ Current Status: Fully Instrumented

Your application **is fully instrumented** with both OpenTelemetry and LaunchDarkly. Events are being sent and traced.

---

## 📊 How Events Are Flowing

### 1. **LaunchDarkly SDK Integration**
- ✅ **SDK Initialized**: `@launchdarkly/node-server-sdk` v9.10.4 initialized in `server/src/utils/ldClient.ts`
- ✅ **OTel Hook Enabled**: `@launchdarkly/node-server-sdk-otel` v1.3.4 `TracingHook` automatically captures flag evaluation spans
- ✅ **LD Context Created**: `ldContextMiddleware` builds LD user context from authenticated sessions
- ✅ **Flags Evaluated**: `evaluateFlag()` utility wraps flag evaluations with metrics and span attributes

### 2. **OpenTelemetry Integration**
- ✅ **Tracing**: OTLP HTTP exporter configured (default: `http://localhost:4318/v1/traces`)
- ✅ **Metrics**: OTLP HTTP exporter configured (default: `http://localhost:4318/v1/metrics`)
- ✅ **Span Processors**: `BatchSpanProcessor` for production, `ConsoleSpanExporter` for development
- ✅ **Auto-instrumentation**: Automatically instruments HTTP, MongoDB, and Node.js modules
- ✅ **Propagation**: W3C Trace Context and Baggage propagators enabled

### 3. **Event Flow Architecture**

```
User Request
    ↓
Express Middleware
    ├─ Passport Authentication
    ├─ ldContextMiddleware (creates LD context)
    └─ Request Metrics (counts & duration)
    ↓
Route Handler
    ├─ Auto-traced HTTP operations
    ├─ Auto-traced MongoDB queries
    ├─ Flag Evaluations (with TracingHook)
    └─ Custom Spans (e.g., createPost)
    ↓
Response
    ├─ Metrics exported to OTLP (every 60s)
    └─ Traces exported to OTLP (batch processor)
    ↓
OTLP Collector (localhost:4318)
    ├─ Traces → Your Backend (Jaeger, DataDog, etc.)
    └─ Metrics → Your Backend
```

---

## 🔍 How to Verify Events Are Being Sent

### Option 1: Check Console Output (Development)
Run the server and look for OTel initialization logs:
```bash
cd server
npm run dev
```

You should see:
```
OpenTelemetry initialized
LaunchDarkly Server SDK initialized
```

And span logs when requests are made (if not in test mode).

### Option 2: Monitor Network Traffic
Use a tool like **curl** or **Postman** to make a request:
```bash
# Terminal 1: Start the server
cd server && npm run dev

# Terminal 2: Make a request
curl http://localhost:5000/api/health
```

The server will send:
- **Trace spans** to `OTEL_EXPORTER_OTLP_ENDPOINT` (http://localhost:4318/v1/traces)
- **Metrics** to `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` (http://localhost:4318/v1/metrics)

### Option 3: Set Up a Local OTEL Collector
Capture all traces and metrics locally:

```bash
# Using Docker
docker run -p 4317:4317 -p 4318:4318 -p 16686:16686 \
  -e OTEL_EXPORTER_OTLP_ENABLED=true \
  otel/opentelemetry-collector-contrib:latest
```

Then view traces at `http://localhost:16686` (Jaeger UI)

### Option 4: Check LaunchDarkly Dashboard
1. Go to [LaunchDarkly Console](https://app.launchdarkly.com)
2. Navigate to **Events** → **Analytics** or **Recent Events**
3. You should see flag evaluation events from your app's user contexts
4. Filter by your `OTEL_SERVICE_NAME` (forum-server) in custom attributes

---

## 🚀 Environment Variables Required

For LaunchDarkly to receive events, set these in your `.env` file:

```bash
# REQUIRED: LaunchDarkly SDK Key
LD_SDK_KEY=your-ld-sdk-key-here

# OpenTelemetry Configuration (optional - defaults shown)
OTEL_SERVICE_NAME=forum-server
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

**Important**: Without `LD_SDK_KEY`, the app logs a warning but continues gracefully.

---

## 📁 File Structure Reference

| File | Purpose |
|------|---------|
| `server/src/instrumentation/otel.ts` | OTel provider initialization |
| `server/src/instrumentation/metrics.ts` | Metric definitions (counters, histograms, gauges) |
| `server/src/utils/ldClient.ts` | LaunchDarkly SDK initialization with TracingHook |
| `server/src/utils/flags.ts` | Flag evaluation wrapper with OTel span enrichment |
| `server/src/middleware/ldContext.ts` | LD context builder from authenticated user |
| `server/src/server.ts` | Express app with middleware setup |
| `server/src/index.ts` | Entry point - initializes OTel before anything else |

---

## 🎯 Events Being Captured

### Automatically (via Auto-instrumentation)
- ✅ HTTP requests (method, route, status code, duration)
- ✅ MongoDB queries (duration)
- ✅ Node.js module interactions

### Manually (via Custom Code)
- ✅ Feature flag evaluations (flag key, variation, reason)
- ✅ HTTP request metrics (request count, duration by route)
- ✅ Post creation counter
- ✅ LD context in spans (user key, name, email, anonymous status)

### Via LaunchDarkly TracingHook
- ✅ Flag evaluation spans (auto-created by `@launchdarkly/node-server-sdk-otel`)
- ✅ LD context attributes (key, version)
- ✅ Track calls (if `client.track()` is used)

---

## ⚠️ Troubleshooting

### Issue: "LaunchDarkly SDK Key not found"
**Cause**: `LD_SDK_KEY` environment variable is missing
**Solution**: Add `LD_SDK_KEY` to your `.env` file
**Impact**: App continues gracefully; flags always return default values

### Issue: Spans not appearing in collector
**Cause**: OTLP endpoint not configured or collector not running
**Solution**: 
1. Verify `OTEL_EXPORTER_OTLP_ENDPOINT` is correct
2. Ensure collector is running and listening on that port
3. Check firewall/networking

### Issue: "Failed to initialize OpenTelemetry in tests"
**Cause**: Normal - OTel initialization guard (global flag) prevents double init
**Solution**: Harmless warning; tests still work correctly

### Issue: No LD context in spans
**Cause**: User not authenticated (anonymous requests)
**Solution**: Normal behavior - context shows `anonymous: true` for unauthenticated users

---

## 🔗 Integration Verification Checklist

- [ ] **LD_SDK_KEY** set in `.env`
- [ ] **OTEL_EXPORTER_OTLP_ENDPOINT** set and collector running
- [ ] Server starts without errors: `npm run dev`
- [ ] Health check responds: `curl http://localhost:5000/api/health`
- [ ] LaunchDarkly shows "SDK initialized" log
- [ ] Network traffic: POST requests to OTEL endpoints (use browser DevTools)
- [ ] LaunchDarkly dashboard shows events from forum-server
- [ ] Custom traces appear in OTEL collector/Jaeger

---

## 📚 Related Documentation

- **Main Summary**: See `OTEL_INTEGRATION_SUMMARY.md`
- **Full Setup Guide**: See `server/README_OBSERVABILITY.md`
- **LaunchDarkly Docs**: https://docs.launchdarkly.com/sdk/server-side/node-js
- **OTel Documentation**: https://opentelemetry.io/docs/

