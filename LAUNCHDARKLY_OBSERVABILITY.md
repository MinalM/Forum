# Using LaunchDarkly Observability SDK (Alternative to OTEL)

## 📍 Overview

LaunchDarkly provides its own observability integration that sends events **directly to LaunchDarkly** without needing a separate OTEL collector. This is a simpler alternative to Grafana/DataDog if you primarily care about:
- Feature flag evaluations
- Flag performance impact
- Flag-related errors
- User context with flags

---

## ✅ Advantages of LD Observability SDK

| Feature | LD Observability | OTEL + Grafana |
|---------|------------------|-----------------|
| **Setup Time** | 5 min | 15 min |
| **Cost** | Included | $0-$100 |
| **Trace UI** | LD Dashboard | Grafana/Jaeger |
| **Flag Analytics** | ✅ Native | ✅ Via spans |
| **HTTP Metrics** | ✅ Yes | ✅ Yes |
| **MongoDB Traces** | ❌ No | ✅ Yes |
| **Custom Spans** | ❌ No | ✅ Yes |
| **Logs Correlation** | ❌ No | ✅ Yes (Loki) |

---

## 🎯 When to Use LD Observability SDK

### ✅ Use LD Observability if:
- You primarily care about feature flag performance
- You want data in LaunchDarkly dashboard (no extra services)
- You need simple HTTP + flag metrics
- You prefer minimal setup

### ✅ Use OTEL (Grafana) if:
- You need comprehensive tracing (all DB queries, etc.)
- You want advanced debugging (span waterfall, etc.)
- You care about overall system health
- You need logs correlation

### ✅ Use BOTH if:
- You want flag insights in LD dashboard AND comprehensive tracing
- Maximum observability (recommended for production)

---

## 🚀 Quick Setup: LD Observability SDK Only

### Option 1: Replace OTEL with LD Observability

**Current Setup**:
```typescript
// server/src/instrumentation/otel.ts
const sdk = new NodeSDK({
  traceExporter,
  metricReader,
  instrumentations: [...]
})
sdk.start()
```

**Switch to LD Observability**:
```typescript
// server/src/instrumentation/ld-observability.ts
import { init as initObs } from '@launchdarkly/observability-sdk-node'

export const initObservability = () => {
  const observer = initObs({
    sdkKey: process.env.LD_SDK_KEY,
    environment: process.env.NODE_ENV,
  })
  
  console.log('✅ LaunchDarkly Observability initialized')
  return observer
}
```

Then call in `server/src/index.ts`:
```typescript
import { initObservability } from './instrumentation/ld-observability'

if (!(global as any).__LD_OBS_INITIALIZED__) {
  initObservability()
  (global as any).__LD_OBS_INITIALIZED__ = true
}
```

### Option 2: Use BOTH (Recommended)

Keep OTEL for comprehensive tracing, but also send flag events to LD:

```typescript
// server/src/instrumentation/index.ts
import { initTelemetry } from './otel'
import { initObservability } from './ld-observability'

export const initInstrumentation = () => {
  initTelemetry()      // All traces to Grafana
  initObservability()  // Flag events to LaunchDarkly
}
```

---

## 📋 LD Observability SDK Installation

### Step 1: Install Package
```bash
cd server
npm install @launchdarkly/observability-sdk-node
```

### Step 2: Create Instrumentation File

Create `server/src/instrumentation/ld-observability.ts`:

```typescript
import { init as initObservability } from '@launchdarkly/observability-sdk-node'

export const initLD_Observability = () => {
  if (!process.env.LD_SDK_KEY) {
    console.warn('⚠️ LD_SDK_KEY not found. LaunchDarkly observability disabled.')
    return null
  }

  try {
    const observer = initObservability({
      // Required
      sdkKey: process.env.LD_SDK_KEY,
      
      // Optional but recommended
      environment: process.env.NODE_ENV || 'development',
      
      // Service metadata
      serviceMetadata: {
        serviceName: process.env.OTEL_SERVICE_NAME || 'forum-server',
        serviceVersion: '1.0.0',
      },
      
      // Send events to LD (not external collector)
      exporters: {
        enabled: true,
      },
    })

    console.log('✅ LaunchDarkly Observability SDK initialized')
    console.log(`  - Service: forum-server`)
    console.log(`  - Environment: ${process.env.NODE_ENV}`)
    console.log('  - Flag events sent to LaunchDarkly Dashboard')

    return observer
  } catch (error) {
    console.error('❌ Failed to initialize LaunchDarkly observability:', error)
    return null
  }
}
```

### Step 3: Initialize in Server Startup

In `server/src/index.ts`:

```typescript
import { initTelemetry } from './instrumentation/otel'
import { initLD_Observability } from './instrumentation/ld-observability'

// Initialize OpenTelemetry (for Grafana tracing)
if (!(global as any).__OTEL_INITIALIZED__) {
  initTelemetry()
  (global as any).__OTEL_INITIALIZED__ = true
}

// Initialize LaunchDarkly Observability (for LD Dashboard)
if (!(global as any).__LD_OBS_INITIALIZED__) {
  initLD_Observability()
  (global as any).__LD_OBS_INITIALIZED__ = true
}

// Import the server
import './server'
```

### Step 4: Update package.json

Make sure your `server/package.json` includes:

```json
{
  "dependencies": {
    "@launchdarkly/observability-sdk-node": "^1.0.0",
    "@launchdarkly/node-server-sdk": "^9.10.4",
    "@opentelemetry/sdk-node": "^0.208.0",
    // ... other deps
  }
}
```

---

## 🎯 What LD Observability Captures

### Automatically Tracked
- ✅ Feature flag evaluations
- ✅ Flag values (true/false)
- ✅ Variation index
- ✅ Evaluation reason
- ✅ User context (key, name, email)
- ✅ Request latency
- ✅ Error rates

### Visible in LaunchDarkly Dashboard
1. **Experimentation Tab** → See flag evaluation metrics
2. **Analytics Tab** → See flag performance over time
3. **Audit Log** → See flag evaluation events

---

## 📊 Viewing Data in LaunchDarkly Dashboard

### Option 1: Native LD Dashboard (Simplest)

After deploying with LD Observability SDK:

```
LaunchDarkly Dashboard → Your Project → Analytics
├─ Feature Flags → Select a flag
├─ Show performance metrics:
│  ├─ Evaluation count over time
│  ├─ Variation split (how many got ON vs OFF)
│  ├─ User segments affected
│  └─ Performance impact (if A/B test)
└─ See evaluation events in real-time
```

### Option 2: LD + OTEL (Comprehensive)

Combine both:
- **LD Dashboard**: Flag-specific analytics
- **Grafana**: Full request tracing, DB queries, logs

---

## 🚀 Hybrid Approach (RECOMMENDED)

Use BOTH for maximum visibility:

```typescript
// server/src/index.ts

// 1. OTEL for comprehensive tracing (to Grafana)
import { initTelemetry } from './instrumentation/otel'
if (!(global as any).__OTEL_INITIALIZED__) {
  initTelemetry()
  (global as any).__OTEL_INITIALIZED__ = true
}

// 2. LD Observability for flag analytics (to LD Dashboard)
import { initLD_Observability } from './instrumentation/ld-observability'
if (!(global as any).__LD_OBS_INITIALIZED__) {
  initLD_Observability()
  (global as any).__LD_OBS_INITIALIZED__ = true
}

import './server'
```

### What You Get

**In LaunchDarkly Dashboard**:
- Flag evaluation metrics
- User segments using flags
- Flag impact on users
- A/B test results

**In Grafana Cloud**:
- Full request traces
- MongoDB query details
- HTTP latency breakdown
- Logs correlated with traces

---

## 📋 Environment Variables

### For LD Observability Only
```bash
LD_SDK_KEY=sdk-xxxxx
NODE_ENV=production
OTEL_SERVICE_NAME=forum-server-prod
```

### For LD Observability + OTEL (Recommended)
```bash
# LaunchDarkly
LD_SDK_KEY=sdk-xxxxx

# OpenTelemetry (to Grafana)
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-xx.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20<base64>
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-xx.grafana.net/otlp
OTEL_SERVICE_NAME=forum-server-prod

# General
NODE_ENV=production
MONGO_URI=<your-mongodb>
JWT_SECRET=<your-secret>
```

---

## 🎯 Step-by-Step: Add LD Observability to Your Project

### Step 1: Install Package
```bash
cd server
npm install @launchdarkly/observability-sdk-node
```

### Step 2: Create File
Create `server/src/instrumentation/ld-observability.ts` with code from above

### Step 3: Update `server/src/index.ts`
```typescript
import { initTelemetry } from './instrumentation/otel'
import { initLD_Observability } from './instrumentation/ld-observability'

// OTEL first
if (!(global as any).__OTEL_INITIALIZED__) {
  initTelemetry()
  (global as any).__OTEL_INITIALIZED__ = true
}

// Then LD Observability
if (!(global as any).__LD_OBS_INITIALIZED__) {
  initLD_Observability()
  (global as any).__LD_OBS_INITIALIZED__ = true
}

import './server'
```

### Step 4: Deploy
```bash
git add .
git commit -m "Add LaunchDarkly Observability SDK"
git push origin main
# Render auto-deploys
```

### Step 5: Verify in LaunchDarkly Dashboard
```
https://app.launchdarkly.com
→ Your project
→ Analytics
→ Should see flag evaluation events coming in
```

---

## 🔄 Comparison: OTEL vs LD Observability vs Both

### OTEL Only (Current Setup)
```
Your App → OTEL Spans → Grafana Cloud
           
Pros: Complete tracing, DB queries, logs
Cons: No flag-specific analytics in LD
```

### LD Observability Only (Simpler)
```
Your App → LD Events → LaunchDarkly Dashboard
           
Pros: Simple, flag analytics in LD, no extra services
Cons: No DB tracing, limited debugging
```

### BOTH (Recommended)
```
Your App ─→ OTEL Spans ──→ Grafana Cloud
         └→ LD Events ──→ LaunchDarkly Dashboard
           
Pros: Complete visibility + flag analytics
Cons: Two services, but both free/cheap
```

---

## 📊 Example: What You'll See

### In LaunchDarkly Dashboard (Flag Evaluation View)
```
Feature Flag: "enable-notifications"
├─ Total evaluations (last 24h): 15,234
├─ Variation split:
│  ├─ ON (true): 7,892 (51.8%)
│  └─ OFF (false): 7,342 (48.2%)
├─ Users affected:
│  ├─ Segment "premium": 500 users (ON)
│  ├─ Segment "trial": 300 users (OFF)
│  └─ Anonymous: 14,434 users (fallthrough)
└─ Performance impact: +2.3ms avg latency
```

### In Grafana (Full Trace View)
```
POST /api/posts (145ms)
├─ HTTP setup (0-10ms)
├─ LD: variation evaluation (15-35ms) ← flag check
├─ MongoDB: find user (40-60ms)
├─ MongoDB: insert post (65-120ms)
├─ LD: track event (125-140ms)
└─ Response (140-145ms)
```

---

## ⚙️ Advanced: Custom Flag Events

If you want to send custom events to LD:

```typescript
import { getLDClient } from './utils/ldClient'

// In your route handler
const client = getLDClient()

if (client) {
  // Track custom event
  await client.track('post-created', req.ldContext, {
    postId: post.id,
    category: post.category,
    wordCount: post.content.length,
  })
  
  console.log('Tracked post-created event in LaunchDarkly')
}
```

This event appears in:
- LaunchDarkly Dashboard → Events
- Chronological event list
- User profile (which events they triggered)

---

## 🎯 Recommendation

### For Your Project
I recommend the **BOTH approach**:

1. **Keep OTEL** (already working, sending to local Grafana)
2. **Add LD Observability** (5 min setup, flag analytics)

**Benefits**:
- ✅ Keep comprehensive tracing in Grafana
- ✅ Add flag-specific analytics in LD Dashboard
- ✅ Both work independently
- ✅ Total setup time: 5 minutes

**Cost**:
- ✅ OTEL: Free (Grafana Cloud free tier)
- ✅ LD Observability: Free (included with LD)
- ✅ Total: $0

---

## 📚 Links & Docs

- **LD Observability SDK Docs**: https://launchdarkly.com/docs/sdk/observability
- **LD Node SDK Docs**: https://launchdarkly.com/docs/sdk/server-side/node-js
- **LD Analytics Tab**: In your LD Dashboard under "Analytics"
- **LD Experimentation**: For A/B testing with flags

---

## 🚀 Next Steps

Choose one:

### Option A: Add LD Observability (Recommended)
1. Run: `npm install @launchdarkly/observability-sdk-node`
2. Create `server/src/instrumentation/ld-observability.ts`
3. Update `server/src/index.ts`
4. Deploy
5. Check LaunchDarkly Dashboard for flag events

### Option B: Keep OTEL Only
- You already have this working
- Just deploy to production with Grafana Cloud
- No changes needed

### Option C: Switch to LD Observability Only
- Remove OTEL instrumentation
- Add LD Observability
- Deploy
- Simpler but less comprehensive tracing

**My recommendation**: Do Option A (Add LD Observability while keeping OTEL)

