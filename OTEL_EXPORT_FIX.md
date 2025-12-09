# 🔍 OTEL Export Debugging - Quick Fix

## Problem Identified

Your logs show OTEL initialized, but **traces are not reaching Grafana or LaunchDarkly**. The issue is:

**Root Cause**: The `OTEL_EXPORTER_OTLP_HEADERS` environment variable (with auth credentials) was not being passed to the OTLP exporter during initialization.

---

## ✅ Fix Applied

### Code Changes Made
1. **Updated `server/src/instrumentation/otel.ts`**:
   - Now explicitly parses `OTEL_EXPORTER_OTLP_HEADERS` env variable
   - Passes headers to both trace and metric exporters
   - Added logging to show if headers are configured

2. **Updated `server/dist/instrumentation/otel.js`**:
   - Compiled version with header parsing

3. **Updated LD Observability logging**:
   - Clearer messages about what's happening

---

## 🚀 What to Do Now

### Step 1: Redeploy to Render

```bash
git add .
git commit -m "Fix OTEL header configuration for Grafana export"
git push origin main
# Render auto-deploys
```

### Step 2: Check Render Logs for These Messages

Look for:
```
🔍 OTel Configuration:
  - Exporter: https://otlp-gateway-prod-us-west-0.grafana.net/otlp
  - Service: forum-server
  - Environment: production
  - Auth Headers: Configured ✓
✅ OpenTelemetry initialized - spans will be exported on each request
📊 OTEL SDK ready - waiting for trace exports...
✅ LaunchDarkly Observability Integration Active
  - Flag evaluations create OTEL spans
  - Events will be sent to LaunchDarkly Dashboard
  - Service: forum-server
  - Environment: production
```

### Step 3: Make Test Requests

```bash
# Make some requests to your app
curl https://your-app.onrender.com/api/health
```

### Step 4: Check Grafana Within 30 Seconds

Go to: `https://grafana.com/orgs/your-org/explore`

1. Select **Tempo** data source
2. Filter by service: `forum-server`
3. Look for traces from your requests

---

## 🔧 If Still Not Working

### Debug: Check Environment Variables

On Render, go to **Settings** → **Environment** and verify:

```
✅ OTEL_EXPORTER_OTLP_ENDPOINT is set
✅ OTEL_EXPORTER_OTLP_HEADERS is set (with Authorization=Basic...)
✅ OTEL_EXPORTER_OTLP_METRICS_ENDPOINT is set
✅ OTEL_SERVICE_NAME is set
✅ LD_SDK_KEY is set
```

### Debug: Check Header Format

The header should be formatted as:
```
Authorization=Basic%20<base64-encoded>
```

NOT:
```
Authorization=Basic <base64-encoded>  (space instead of %20)
Authorization: Basic <base64-encoded> (colon not equals)
```

### Debug: Check Grafana Connectivity

The endpoint should be reachable without auth errors. From Render logs, you might see (this is normal):
```
Connection error attempting to connect to collector
```

This is expected if the endpoint requires authentication and headers aren't being sent.

---

## 📊 How Headers Are Now Parsed

The fix parses headers like this:

```typescript
// Input: "Authorization=Basic XXX,Custom=Value"
// Output: { Authorization: "Basic XXX", Custom: "Value" }
```

So your Render environment variable should be:
```
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20YOUR_BASE64_HERE
```

---

## ✅ Verification Checklist

After redeploying:

- [ ] Render logs show "Auth Headers: Configured ✓"
- [ ] No "failed to export" or "connection refused" errors
- [ ] Make a test request to your app
- [ ] Wait 30 seconds
- [ ] Traces appear in Grafana
- [ ] Events appear in LaunchDarkly Dashboard
- [ ] LD Observability message appears in logs

---

## 🎯 Quick Summary

**What was wrong**:
- OTEL exporter created without auth headers
- Requests to Grafana failed with 401 or connection errors
- Spans were created but never exported

**What's fixed**:
- Now explicitly parses `OTEL_EXPORTER_OTLP_HEADERS` env var
- Passes auth headers to exporters
- Clearer logging to verify configuration

**Next step**:
- Deploy and verify traces appear in Grafana

---

## 📞 Still Having Issues?

1. **Check Render logs** for the new auth header message
2. **Verify environment variable format** is exactly right
3. **Wait 30-60 seconds** after making requests (batch export delay)
4. **Make a new request** to generate fresh traces
5. **Check both Grafana and LD Dashboard** for data

If still stuck, check these documents:
- `OTEL_PRODUCTION_DEPLOYMENT.md` - Production troubleshooting
- `QUICK_PRODUCTION_SETUP.md` - Setup verification
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist
