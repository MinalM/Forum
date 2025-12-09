# Production OTEL & LaunchDarkly Deployment Guide

## 🚀 Overview

To enable OTEL in production, you need:
1. **OTEL Collector** - Runs on a server and receives spans from your app
2. **Backend** - Stores and visualizes spans (Jaeger, Grafana Loki, DataDog, etc.)
3. **Environment Variables** - Configure endpoints in Render & Netlify

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Production Architecture                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Render (Backend)           Netlify (Frontend)                 │
│  ┌──────────────────┐       ┌──────────────┐                  │
│  │ Node.js App      │       │ React SPA    │                  │
│  │ (forum-server)   │       │ (client)     │                  │
│  └────────┬─────────┘       └──────────────┘                  │
│           │                                                     │
│           └─────→ OTEL Collector (your-collector.com:4318)    │
│                                                                 │
│           ┌──────────────────────────────────────┐             │
│           ↓ sends spans to                        ↓            │
│      ┌─────────────┐                      ┌──────────────┐    │
│      │   Jaeger    │                      │ LaunchDarkly │   │
│      │   UI        │                      │ Dashboard    │    │
│      └─────────────┘                      └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Option 1: Use a Managed OTEL Backend (Easiest)

### Choice A: Grafana Cloud (Recommended)
- **Cost**: Free tier available
- **Includes**: Jaeger UI + Loki logging + Prometheus metrics
- **Setup**: 5 minutes

### Choice B: DataDog
- **Cost**: ~$0.10 per million spans + logs
- **Includes**: Full observability platform
- **Setup**: 5 minutes

### Choice C: New Relic
- **Cost**: Free tier + paid
- **Includes**: APM + infrastructure monitoring
- **Setup**: 5 minutes

### Choice D: Self-Hosted Jaeger
- **Cost**: Server cost only (~$5-10/month on Render)
- **Setup**: 10 minutes
- **Best for**: Privacy, complete control

---

## 🟢 Option 1A: Grafana Cloud (Step-by-Step)

### Step 1: Create Grafana Cloud Account
1. Visit https://grafana.com/auth/sign-up/create-account
2. Sign up (free tier available)
3. Go to **Connections** → **Grafana Agent**

### Step 2: Get Your OTLP Endpoint
In Grafana Cloud:
```
OTLP Endpoint: https://otlp-gateway-prod-xx.grafana.net/otlp
API Key: (copy from settings)
```

### Step 3: Configure Render Environment Variables
On Render.com for your backend:

**Settings** → **Environment**

Add:
```
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-xx.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20<base64(username:api-key)>
OTEL_SERVICE_NAME=forum-server-prod
NODE_ENV=production
```

**To create the Authorization header**:
```bash
# On your local machine
echo -n "username:api-key" | base64
# Output: dXNlcm5hbWU6YXBpLWtleQ==
```

Then in Render, set:
```
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20dXNlcm5hbWU6YXBpLWtleQ==
```

### Step 4: Deploy to Render
1. Commit your code with updated `server/src/instrumentation/otel.ts`
2. Push to GitHub
3. Render auto-deploys
4. Check logs for: `✅ OpenTelemetry initialized`

### Step 5: View Traces in Grafana
1. Go to https://grafana.com/d/your-dashboard
2. Click **Jaeger** in the sidebar
3. Select `forum-server-prod` service
4. See your production traces!

---

## 🟢 Option 1B: DataDog (Step-by-Step)

### Step 1: Create DataDog Account
1. Visit https://www.datadoghq.com/
2. Sign up (free tier or trial)
3. Get your **API Key** from **Settings** → **API Keys**

### Step 2: Configure Render Environment Variables

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://http-intake.logs.datadoghq.com/v1/input
OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=<your-api-key>
OTEL_SERVICE_NAME=forum-server-prod
NODE_ENV=production
```

### Step 3: Deploy & View
1. Push to GitHub
2. Render auto-deploys
3. Go to DataDog **APM** → **Traces**
4. Filter by `forum-server-prod`

---

## 🟡 Option 1C: Self-Hosted Jaeger on Render

### Step 1: Create a New Service on Render
1. Go to https://dashboard.render.com
2. **New** → **Web Service**
3. Select Docker
4. Use this image: `jaegertracing/all-in-one:latest`

### Step 2: Configure Jaeger Service
```
Name: forum-jaeger
Region: (choose closest to your backend)
Plan: Free Tier (will be slower) or Starter ($7/month)
```

**Environment Variables**:
```
COLLECTOR_OTLP_ENABLED=true
COLLECTOR_OTLP_HOST_METRICS=0.0.0.0
COLLECTOR_OTLP_HTTP_HOST_METRICS=0.0.0.0
```

### Step 3: Get Jaeger URL
After deployment, Render gives you:
```
https://forum-jaeger-xxxx.onrender.com
```

### Step 4: Configure Backend Service on Render
In your forum-server settings:

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://forum-jaeger-xxxx.onrender.com/v1/traces
OTEL_SERVICE_NAME=forum-server-prod
NODE_ENV=production
```

### Step 5: Deploy & View
1. Redeploy your backend
2. Make requests to your app
3. Visit `https://forum-jaeger-xxxx.onrender.com` to see Jaeger UI

---

## 🎯 Quick Comparison Table

| Option | Cost | Setup Time | UI | Best For |
|--------|------|-----------|----|----|
| **Grafana Cloud** | Free tier | 5 min | ✓ Jaeger + Logs | Simplicity + Logs |
| **DataDog** | ~$100/mo | 5 min | ✓ Full APM | Enterprise |
| **Self-Hosted Jaeger** | $7-50/mo | 10 min | ✓ Jaeger | Privacy + Control |
| **New Relic** | Free tier | 5 min | ✓ Full APM | Infrastructure monitoring |

---

## 🔗 LaunchDarkly Integration for Production

### Already Configured!
Your backend automatically sends LD context with every trace because:

1. **LD SDK initialized**: `server/src/utils/ldClient.ts` uses `LD_SDK_KEY`
2. **LD context middleware**: `server/src/middleware/ldContext.ts` extracts user context
3. **LD TracingHook**: `@launchdarkly/node-server-sdk-otel` auto-creates spans for flag evaluations
4. **Metrics**: Flag evaluations counted in `feature_flag.evaluations` metric

### What You Need to Do

#### On Render (Backend)
Just add your LD SDK key:

```
LD_SDK_KEY=sdk-xxxxx-from-launchdarkly
LD_LOG_LEVEL=info
```

Get the key from:
1. LaunchDarkly Dashboard
2. **Account Settings** → **Authorization** → **SDK Keys**
3. Copy the **Server-side SDK Key** (not Client-side)

#### Flag Evaluations in Traces
When you check a feature flag in your code:

```typescript
const flagValue = await evaluateFlag('my-flag', false, req.ldContext);
```

This creates a span in your trace:
```
ld.client.variation
├─ feature_flag.key: my-flag
├─ feature_flag.value: true
├─ feature_flag.variation_index: 0
├─ feature_flag.reason: ON_USER
└─ ld.context.key: user-123
```

Visible in Jaeger/Grafana/DataDog!

---

## 📋 Environment Variables Checklist

### Render (Backend)
```bash
# OTEL - Required
OTEL_EXPORTER_OTLP_ENDPOINT=<your-collector-endpoint>
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=<your-metrics-endpoint>
OTEL_SERVICE_NAME=forum-server-prod

# LaunchDarkly - Optional but recommended
LD_SDK_KEY=sdk-xxxxx
LD_LOG_LEVEL=info

# General
NODE_ENV=production
PORT=5000
MONGO_URI=<your-production-mongodb-url>
JWT_SECRET=<your-secret>
```

### Netlify (Frontend - Optional)
The frontend doesn't need OTEL by default, but if you want to trace client-side errors:

```
REACT_APP_OTEL_ENABLED=true
REACT_APP_OTEL_ENDPOINT=<your-collector-endpoint>
REACT_APP_LD_CLIENT_ID=<your-ld-client-id>
```

(This requires additional frontend instrumentation - see section below)

---

## 🎯 Step-by-Step: Deploy with Grafana Cloud (Recommended)

### 1. Create Grafana Cloud Account
```
https://grafana.com/auth/sign-up/create-account
→ Click "Create free account"
→ Verify email
→ Create organization (e.g., "Forum Company")
```

### 2. Get OTLP Endpoint & API Key
```
https://grafana.com/orgs/ → Select your org
→ Stack → "Grafana"
→ Configuration → Agent (or Loki/Tempo settings)
→ Get: 
   - OTLP Endpoint: https://otlp-gateway-prod-xx.grafana.net/otlp
   - Username: (default is number like "123456")
   - API Token: (create new token)
```

### 3. Create Base64-Encoded Header
```bash
# On your local machine
USERNAME="123456"
API_TOKEN="glc_xxxxx"
echo -n "$USERNAME:$API_TOKEN" | base64
# Output: MTIzNDU2Omdsbl9xxxxx
```

### 4. Add to Render Dashboard
```
https://dashboard.render.com
→ Select your "forum-server" service
→ Settings → Environment
→ Add variables:

OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20MTIzNDU2Omdsbl9xxxxx
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_SERVICE_NAME=forum-server-prod
LD_SDK_KEY=sdk-xxxxx
NODE_ENV=production
```

### 5. Deploy
```bash
git add .
git commit -m "Enable OTEL for production"
git push origin main
# Render auto-deploys
```

### 6. View Traces
```
https://grafana.com/orgs/ → Your Org
→ Connections → Data Sources
→ Select "Tempo" (traces storage)
→ Query Traces
→ Filter by service: "forum-server-prod"
```

Or if you have Jaeger enabled:
```
→ Dashboards → Jaeger
→ Select "forum-server-prod"
→ See traces!
```

---

## 📊 How It All Connects

```
Your Request Flow:
┌──────────────────┐
│ User makes       │
│ POST /api/posts  │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ Render Backend (Node.js)             │
│ - HTTP span created                  │
│ - MongoDB query spans created        │
│ - LaunchDarkly flag evaluated (span) │
│ - All spans batched                  │
└────────┬─────────────────────────────┘
         │ OTLP HTTPS POST
         ↓
┌──────────────────────────────────────┐
│ Grafana Cloud OTLP Endpoint          │
│ (or DataDog/New Relic/Self-Hosted)   │
└────────┬─────────────────────────────┘
         │ Forward to storage
         ↓
┌──────────────────────────────────────┐
│ Trace Backend                        │
│ - Tempo (traces)                     │
│ - Loki (logs)                        │
│ - Prometheus (metrics)               │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ Your Dashboard                       │
│ http://grafana.com/your-dashboard    │
│ - View traces                        │
│ - See LD flag evaluations            │
│ - Monitor performance                │
└──────────────────────────────────────┘
```

---

## 🚨 Troubleshooting Production

### Problem: No Traces Appearing

**Check**:
1. **OTEL_EXPORTER_OTLP_ENDPOINT is set**
   ```bash
   # On Render, check logs:
   # "✅ OpenTelemetry initialized"
   # "- Exporter: https://otlp-gateway-prod..."
   ```

2. **Collector endpoint is reachable**
   ```bash
   # Test from Render logs
   curl -X POST https://otlp-gateway-prod-xx.grafana.net/otlp/v1/traces
   # Should return 200 or authentication error (not connection refused)
   ```

3. **Authorization header correct**
   ```bash
   # Test with:
   curl -X POST \
     -H "Authorization: Basic <base64-encoded>" \
     https://otlp-gateway-prod-xx.grafana.net/otlp/v1/traces
   ```

### Problem: "Failed to export spans"

**Cause**: Network or authentication issue

**Fix**:
1. Check `OTEL_EXPORTER_OTLP_HEADERS` is URL-encoded
   - `%20` instead of space
   - `%3D` instead of `=`

2. Try without headers first:
   ```
   OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector:4318
   # (internal network, no auth needed)
   ```

3. Check Render logs for full error:
   ```
   Render Dashboard → Logs
   → Search for "export"
   ```

### Problem: LaunchDarkly Flags Not Showing in Traces

**Check**:
1. `LD_SDK_KEY` is set on Render
2. You're actually calling `evaluateFlag()` in your code
3. Flag key exists in LaunchDarkly

**Verify**:
```typescript
// In your route handler
const flagValue = await evaluateFlag('test-flag', false, req.ldContext);
// This should create a span
```

---

## 🎓 Advanced: Frontend Instrumentation (Optional)

If you want to trace React/JavaScript on Netlify:

### Step 1: Install OTEL in Frontend
```bash
cd client
npm install \
  @opentelemetry/api \
  @opentelemetry/sdk-web \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/auto-instrumentations-web
```

### Step 2: Initialize in React
```typescript
// src/index.tsx
import { initTelemetry } from './instrumentation/otel'

initTelemetry()

// Rest of your app...
import App from './App'
```

### Step 3: Create Frontend Instrumentation
```typescript
// src/instrumentation/otel.ts
import { BasicTracerProvider } from '@opentelemetry/sdk-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

export const initTelemetry = () => {
  const exporter = new OTLPTraceExporter({
    url: process.env.REACT_APP_OTEL_ENDPOINT || 'http://localhost:4318/v1/traces'
  })
  
  const provider = new BasicTracerProvider()
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
  provider.register()
}
```

### Step 4: Deploy to Netlify
```
Netlify Dashboard → Site settings → Build & deploy → Environment
→ Add:
REACT_APP_OTEL_ENDPOINT=https://your-collector.com/v1/traces
```

---

## 📋 Summary: What to Do Now

### Immediate Actions:
1. ✅ Choose a backend (Grafana Cloud recommended)
2. ✅ Get OTLP endpoint + credentials
3. ✅ Add environment variables to Render
4. ✅ Add LD_SDK_KEY to Render
5. ✅ Deploy backend
6. ✅ Verify traces appear

### Optional:
- Add frontend OTEL instrumentation
- Add custom dashboards
- Set up alerts
- Configure sampling rates

---

## 🔗 Quick Links

- **Grafana Cloud**: https://grafana.com/
- **DataDog**: https://www.datadoghq.com/
- **New Relic**: https://newrelic.com/
- **LaunchDarkly**: https://launchdarkly.com/
- **Render Docs**: https://render.com/docs
- **Netlify Env Vars**: https://docs.netlify.com/configure-builds/environment-variables/

---

## 📚 Related Documentation

- `OTEL_LOCAL_DEBUG.md` - Local development setup
- `LAUNCHDARKLY_VERIFICATION.md` - LD integration details
- `JAEGER_TRACE_GUIDE.md` - How to read traces
- `QUICK_FIX_SUMMARY.md` - What was fixed locally

