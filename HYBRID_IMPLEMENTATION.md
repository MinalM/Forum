# Hybrid OTEL + LaunchDarkly Observability Implementation

## ✅ Implementation Complete

Your application now uses the **hybrid approach** with:
- **OTEL** (OpenTelemetry) → Grafana Cloud (comprehensive tracing)
- **LaunchDarkly Observability** → LD Dashboard (flag analytics)

---

## 📁 Files Added/Modified

### New Files
- `server/src/instrumentation/ld-observability.ts` - LD observability integration
- `server/dist/instrumentation/ld-observability.js` - Compiled version

### Modified Files
- `server/src/index.ts` - Initialize both OTEL and LD observability
- `server/dist/index.js` - Compiled version updated

---

## 🔄 How It Works

### Architecture
```
Your App
  ├─→ OTEL Spans ────→ Grafana Cloud
  │   (via OTEL_EXPORTER_OTLP_ENDPOINT)
  │   ├─ HTTP requests
  │   ├─ MongoDB queries
  │   ├─ Flag evaluations
  │   └─ Logs with trace_id
  │
  └─→ LD Events ─────→ LaunchDarkly Dashboard
      (via LD SDK)
      ├─ Flag evaluations
      ├─ Flag values
      ├─ User contexts
      └─ Custom events
```

### What Happens on Each Request

1. **Request arrives** → Express middleware
2. **OTEL auto-instrumentation** → Creates span
3. **Flag evaluated** (e.g., `evaluateFlag()`)
   - ✅ Creates OTEL span (sent to Grafana)
   - ✅ Tracked as LD event (sent to LD Dashboard)
4. **Response sent** → Span closed, data exported
5. **Data appears in both places**:
   - Grafana: Detailed trace waterfall
   - LD Dashboard: Flag analytics

---

## 🚀 Using the LD Observability Integration

### Basic: Just Use Feature Flags

No code changes needed! Your existing flag evaluations automatically:

```typescript
// In your route handler
import { evaluateFlag } from './utils/flags'

const enableNotifications = await evaluateFlag(
  'enable-notifications',
  false,
  req.ldContext
)

// ✅ Automatically:
// 1. Creates OTEL span with flag details
// 2. Sends event to LD Dashboard
// 3. Tracked with user context
```

### Advanced: Track Custom Events

Use the new `trackLD_Event` function to track application events:

```typescript
// In your route handler
import { trackLD_Event } from '../instrumentation/ld-observability'

// After creating a post
const post = await Post.create({
  title: req.body.title,
  content: req.body.content,
  authorId: req.user.id
})

// Track the event in LaunchDarkly
await trackLD_Event(
  'post-created',
  req.ldContext,
  {
    postId: post._id,
    category: post.category,
    wordCount: post.content.split(' ').length
  }
)

console.log('Post created and tracked in LD')
```

This event will appear in:
- **LaunchDarkly Dashboard** → Events tab
- **User profile** → Event history
- **Grafana** → As a metric in the trace

### Example: Tracking Multiple Events

```typescript
// server/controllers/posts.js (or posts.ts if migrating)

const { trackLD_Event } = require('../instrumentation/ld-observability')

exports.createPost = async (req, res, next) => {
  try {
    const post = await Post.create({
      title: req.body.title,
      content: req.body.content,
      authorId: req.user.id,
      category: req.body.category
    })

    // Track in LaunchDarkly
    await trackLD_Event('post_created', req.ldContext, {
      postId: post._id.toString(),
      category: post.category,
      contentLength: post.content.length,
      timestamp: new Date().toISOString()
    })

    res.status(201).json(post)
  } catch (error) {
    await trackLD_Event('post_creation_failed', req.ldContext, {
      error: error.message
    })
    next(error)
  }
}
```

---

## 📊 What You'll See in Each Dashboard

### LaunchDarkly Dashboard

**Analytics Tab**:
```
Feature Flag: "enable-notifications"
├─ Total Evaluations: 1,234 (today)
├─ Variation Split:
│  ├─ ON (true): 618 (50.1%)
│  └─ OFF (false): 616 (49.9%)
├─ User Segments:
│  ├─ premium: 100 users (ON)
│  ├─ trial: 50 users (OFF)
│  └─ anonymous: 1,084 users
└─ Average Latency Impact: +1.2ms
```

**Events Tab**:
```
post_created
├─ Count: 45 (today)
├─ Last event: 2 minutes ago
├─ Metadata:
│  ├─ postId: "507f1f77bcf86cd799439011"
│  ├─ category: "general"
│  ├─ contentLength: 1523
│  └─ User: "user-123"
```

### Grafana Cloud

**Trace View**:
```
POST /api/posts (145ms) ✓
├─ HTTP request (0-10ms)
├─ MongoDB: find user (10-30ms)
├─ LD: variation (enable-notifications) (30-50ms)
│  └─ Value: true, Variation: 0
├─ MongoDB: insert post (50-120ms)
├─ LD: track event (post_created) (120-140ms)
└─ Response (140-145ms)
```

**Logs (via Loki)**:
```
timestamp: 2025-12-08T06:30:00Z
level: info
message: "Post created successfully"
trace_id: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
span_id: "fedcba9876543210"
user_id: "user-123"
post_id: "507f1f77bcf86cd799439011"
```

---

## 🎯 Environment Variables (Production)

### Add to Render.com

```env
# OTEL Configuration (for Grafana)
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20<base64>
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_SERVICE_NAME=forum-server-prod

# LaunchDarkly Configuration (for LD Dashboard)
LD_SDK_KEY=sdk-xxxxx
LD_LOG_LEVEL=info

# General
NODE_ENV=production
PORT=5000
MONGO_URI=<your-mongodb>
JWT_SECRET=<your-secret>
```

---

## ✅ Verification Checklist

### Local Testing
- [ ] Start server: `node dist/index.js`
- [ ] Check logs show both initializations:
  ```
  ✅ OpenTelemetry initialized
  ✅ LaunchDarkly Observability Integration Active
  ```
- [ ] Make request: `curl http://localhost:2000/api/health`
- [ ] Traces appear in local Jaeger

### Production Testing
- [ ] Deploy to Render
- [ ] Check Render logs for both initialization messages
- [ ] Make requests to your app
- [ ] Check Grafana Cloud for traces
- [ ] Check LaunchDarkly Dashboard → Analytics for flag events

---

## 🔍 Troubleshooting

### Problem: LD Observability not initializing

**Check**:
1. `LD_SDK_KEY` is set
2. LaunchDarkly SDK initialized before observability
3. Check logs: `LD_OBS_INITIALIZED` flag

**Fix**:
```bash
# On Render, check logs
Render Dashboard → Your service → Logs
→ Search for: "LaunchDarkly Observability Integration"
```

### Problem: Custom events not appearing in LD Dashboard

**Check**:
1. Using `trackLD_Event()` with correct parameters
2. LD SDK key is valid
3. User context passed correctly

**Example fix**:
```typescript
// Make sure req.ldContext exists
import { trackLD_Event } from '../instrumentation/ld-observability'

await trackLD_Event(
  'my-event',
  req.ldContext,  // ← Must have user context
  { data: 'value' }
)
```

### Problem: Spans not showing in both places

**Check**:
1. OTEL_EXPORTER_OTLP_ENDPOINT configured
2. LD_SDK_KEY configured
3. Both initialization guards passed
4. Request actually hit the app

**Verify**:
```typescript
// In server startup, you should see:
✅ OTel Configuration: ...
✅ OpenTelemetry initialized
✅ LaunchDarkly Observability Integration Active
```

---

## 📈 Example: Complete Flow

### Request: Creating a Post

```typescript
// 1. Request arrives
POST /api/posts

// 2. Middleware processes (LD context created)
ldContext = { key: "user-123", name: "John", email: "john@example.com" }

// 3. Controller logic
const enableNotifications = await evaluateFlag('enable-notifications', false, ldContext)
// ✅ OTEL span created
// ✅ LD event tracked

const post = await Post.create({ title, content, authorId: user.id })
// ✅ MongoDB span in OTEL trace

await trackLD_Event('post_created', ldContext, { postId: post.id })
// ✅ Custom event sent to LD Dashboard
// ✅ Metric in OTEL trace

// 4. Response sent
res.json(post)

// 5. Data exported
// → Trace appears in Grafana (with all spans: HTTP, MongoDB, flags)
// → Events appear in LD Dashboard (flag eval + custom event)
```

---

## 🎓 Key Points

### OTEL (Grafana Cloud)
- **For**: Debugging, performance analysis, complete tracing
- **Shows**: Traces, spans, logs, metrics
- **Data**: HTTP, MongoDB, all custom spans
- **UI**: Jaeger, Grafana Explore

### LD Observability (LaunchDarkly Dashboard)
- **For**: Flag analytics, user segments, A/B testing
- **Shows**: Flag evaluations, user impact, events
- **Data**: Flag checks, custom events, metrics
- **UI**: LD Analytics, Events tab

### Working Together
- Each request creates OTEL span (→ Grafana)
- Flag evaluations tracked as LD events (→ LD Dashboard)
- Custom events trackable via `trackLD_Event()` (→ LD Dashboard)
- Both systems independent but complementary

---

## 🚀 Next Steps

### Immediate
1. ✅ Verify local startup shows both init messages
2. ✅ Test hybrid approach locally with `curl` requests
3. ✅ Commit changes to GitHub

### Before Production
1. Set up Grafana Cloud (if not done)
2. Get OTLP endpoint and auth header
3. Add environment variables to Render
4. Test in production
5. Monitor both dashboards

### After Production
1. Check Grafana for traces
2. Check LD Dashboard for flag events
3. Add custom event tracking as needed
4. Monitor performance in both places

---

## 📚 Related Documentation

- `OTEL_LOCAL_DEBUG.md` - Local development
- `OTEL_PRODUCTION_DEPLOYMENT.md` - Production setup (Grafana)
- `QUICK_PRODUCTION_SETUP.md` - Quick start guide
- `LAUNCHDARKLY_VERIFICATION.md` - LD integration
- `JAEGER_TRACE_GUIDE.md` - How to read traces

---

## 💡 Pro Tips

1. **Use different event names for tracking**:
   - `post_created` (lowercase, underscores) - appears in LD Dashboard
   - `post_creation_failed` - track errors separately
   - `user_logged_in` - track important actions

2. **Include meaningful metadata**:
   ```typescript
   await trackLD_Event('post_created', ldContext, {
     postId: post._id,
     category: post.category,
     wordCount: post.content.split(' ').length,
     timestamp: new Date().toISOString()
   })
   ```

3. **Check both dashboards for insights**:
   - LD: "Which flags affect which users?"
   - Grafana: "Which database query is slow?"

4. **Use flags + events for A/B testing**:
   - Enable new feature with flag
   - Track usage with custom event
   - Analyze in LD Dashboard

