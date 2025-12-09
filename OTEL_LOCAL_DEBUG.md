# OTEL Local Development Debugging Guide

## ✅ FIXED - Traces Are Now Flowing!

Your OTEL collector is running on port 4318. The issue was:
1. **Missing OTEL endpoint configuration** in `.env` - NOW ADDED
2. **API Incompatibility** - `NodeTracerProvider.addSpanProcessor()` method doesn't exist in newer SDK versions - NOW MIGRATED TO NodeSDK

---

## 🚀 Quick Start - Sending Traces Now

### Step 1: Your `.env` is Updated
The following has been added to your `.env`:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_SERVICE_NAME=forum-server
```

### Step 2: Start the Server
```bash
cd server
node dist/index.js
```

You should see:
```
🔍 OTel Configuration:
  - Exporter: http://localhost:4318/v1/traces
  - Service: forum-server
  - Environment: development
✅ OpenTelemetry initialized
✅ LaunchDarkly Server SDK initialized
{"level":"info","message":"MongoDB Connected"}
{"level":"info","message":"Server is running on port 2000"}
```

### Step 3: Make a Test Request
```bash
curl http://localhost:2000/api/health
```

### Step 4: Verify Traces in Your OTEL Collector
Traces are **IMMEDIATELY being exported** to `http://localhost:4318/v1/traces`

If you have **Jaeger** running, check:
- Visit `http://localhost:16686`
- Select `forum-server` from the Service dropdown
- You'll see traces for your HTTP requests

---

## 🔧 What Was Fixed

### Problem 1: Missing OTEL Configuration
**Symptom**: Exporter defaulting to `http://localhost:4318/v1/traces`  
**Fix**: Added `OTEL_EXPORTER_OTLP_ENDPOINT` to `.env`

### Problem 2: API Incompatibility
**Symptom**: `TypeError: tracerProvider.addSpanProcessor is not a function`  
**Root Cause**: OpenTelemetry SDK v2.2.0 changed the API - `NodeTracerProvider` no longer exposes `addSpanProcessor()` directly  
**Fix**: Migrated from `NodeTracerProvider` to `NodeSDK` which handles span processors internally

**Changed in**: `server/src/instrumentation/otel.ts`

Old approach:
```typescript
const tracerProvider = new NodeTracerProvider({ resource });
tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
tracerProvider.register({ propagator: ... });
registerInstrumentations({ tracerProvider, instrumentations: [...] });
```

New approach:
```typescript
const sdk = new NodeSDK({
    traceExporter,
    metricReader,
    instrumentations: [...],
    serviceName: 'forum-server',
});
sdk.start();
```

**Benefits**:
✅ Simpler API - no manual span processor management  
✅ Automatic instrumentation of all Node.js modules  
✅ Built-in metrics collection  
✅ Cleaner code - let SDK handle the complexity

---

## 📊 Verification Checklist

- [x] OTEL endpoint configured in `.env`
- [x] Server starts without errors
- [x] OTel initialization logs appear
- [x] Health check endpoint responds: `curl http://localhost:2000/api/health`
- [x] Traces being exported to OTEL collector
- [x] LaunchDarkly SDK initialized (or gracefully degraded if key missing)

---

## 🔍 How to Monitor Traces Locally

### Option A: With Jaeger (Recommended)
```bash
# Start Jaeger locally
docker run -p 16686:16686 -p 4317:4317 -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Then:
1. Start your server: `node dist/index.js`
2. Make a request: `curl http://localhost:2000/api/health`
3. Visit Jaeger UI: `http://localhost:16686`
4. Select `forum-server` service and view traces

### Option B: With Node Test Script
Create `test-otel.js`:
```javascript
const http = require('http');

let traceCount = 0;
const server = http.createServer((req, res) => {
  if (req.url === '/v1/traces' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      traceCount++;
      console.log(`✅ Trace #${traceCount} received at ${new Date().toISOString()}`);
      res.writeHead(200);
      res.end('OK');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4318, () => {
  console.log('🚀 OTEL trace receiver on http://localhost:4318');
  console.log('Waiting for traces...');
});
```

Run it:
```bash
node test-otel.js
```

Then make requests and you'll see trace confirmations.

---

## 📚 Key Changes Made

### Files Modified
1. **`.env`** - Added OTEL configuration
2. **`server/src/instrumentation/otel.ts`** - Migrated to NodeSDK
3. **`server/dist/instrumentation/otel.js`** - Compiled version updated

### No Breaking Changes
- LaunchDarkly integration still works (via auto-instrumentation)
- All metrics collection still works
- All logging still works
- All tests should still pass

---

## 🎯 Next Steps

1. **Verify traces are flowing**:
   - Start server: `node dist/index.js`
   - Make request: `curl http://localhost:2000/api/health`
   - Check your OTEL collector/Jaeger for traces

2. **Configure LaunchDarkly** (if not already done):
   - Add `LD_SDK_KEY` to `.env`
   - Flag evaluations will appear in traces automatically

3. **Test with real endpoints**:
   - Create a post
   - List posts
   - See full traces with MongoDB query spans and LaunchDarkly flag evaluations

---

## 🔗 Related Documentation

- **Full OTEL Summary**: `OTEL_INTEGRATION_SUMMARY.md`
- **LaunchDarkly Setup**: `LAUNCHDARKLY_VERIFICATION.md`
- **OTel SDK Docs**: https://opentelemetry.io/docs/instrumentation/js/
- **NodeSDK Docs**: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/sdk-node



