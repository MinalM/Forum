# Jaeger Trace Interpretation Guide

## 📍 Jaeger UI Locations

When you visit `http://localhost:16686/search`, you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│  Jaeger UI                                                  │
├─────────────────────────────────────────────────────────────┤
│ Left Panel          │        Main Panel                      │
│ - Service Dropdown  │  - Trace List                         │
│ - Operation Filter  │  - Timeline Visualization             │
│ - Lookback Duration │  - Span Details                       │
│ - Limit & Min Dur.  │  - Service Map                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Step 1: Filter Traces (Left Panel)

### Service Dropdown
- **Current**: `forum-server` (your Node.js application)
- Click to see other services if you have multiple apps

### Operation Dropdown
Shows all HTTP operations your app handles:
- `GET /api/health` - Health check
- `POST /api/posts` - Create post
- `GET /api/posts` - List posts
- `MongoDB` operations (auto-instrumented)
- `ld.client.variation` - LaunchDarkly flag evaluations

### Lookback Duration
- Default: `1h` (last hour)
- Change to `15m` to see only recent traces
- Useful if you just made a request

### Limit & Min Duration
- **Limit**: Shows up to 20 traces (default)
- **Min Duration**: Filter out fast operations (e.g., show only >100ms)

---

## 📊 Step 2: Read the Trace List (Main Panel)

### Example Trace Entry
```
GET /api/health
├─ 1.23ms    ✓ Success (status 200)
├─ timeline  |────────────|
└─ 2025-12-08 06:10:45.123Z
```

### What Each Column Means

| Column | Meaning | Example |
|--------|---------|---------|
| **Operation** | HTTP method + path or operation name | `GET /api/health` |
| **Duration** | Total time from start to finish | `1.23ms` |
| **Status** | ✓ Success or ✗ Error | `✓` green = OK, `✗` red = error |
| **Timeline** | Visual representation | `|────────────|` |
| **Timestamp** | When the trace occurred | `2025-12-08 06:10:45.123Z` |

---

## 🎯 Step 3: Click a Trace to View Details

Click any trace row to expand and see the **span waterfall**.

### The Span Waterfall (Detailed View)

```
GET /api/health (0.00ms - 2.34ms) [Status: OK]
├─ GET /api/health (0.00ms - 2.10ms)
│  ├─ query span_processor (0.10ms - 0.50ms)
│  ├─ MongoDB: find (0.60ms - 1.20ms)
│  ├─ LaunchDarkly: variation (0.30ms - 0.80ms)
│  └─ serialize response (1.30ms - 1.80ms)
└─ response sent (2.10ms - 2.34ms)
```

### Span Anatomy
Each span shows:
```
Span Name (Start Time - End Time) [Attributes]
├─ Duration: 1.20ms
├─ Service: forum-server
├─ Operation: GET
├─ Resource: /api/health
└─ Tags: {...attributes...}
```

---

## 🏗️ Understanding Span Hierarchy (Parent-Child)

### What It Means
- **Parent Span**: The outermost operation (your HTTP request)
- **Child Spans**: Operations that happen inside the parent

### Example: POST /api/posts

```
POST /api/posts (0.00ms - 125.50ms) ← Parent Span (HTTP request)
├─ MongoDB: find (10.00ms - 15.50ms) ← Query database
│  └─ (network latency + processing)
├─ MongoDB: create (20.00ms - 80.50ms) ← Create new post
│  └─ (network latency + processing)
├─ ld.client.variation (40.00ms - 42.10ms) ← Check feature flag
│  └─ (LaunchDarkly evaluation)
└─ serialize + response (100.00ms - 125.00ms) ← Send response
```

**Key Insight**: Child spans must complete before parent span completes.

---

## 🔑 Important Span Attributes (Tags)

Click on any span to see its attributes:

### HTTP Spans
```
http.method: GET
http.url: http://localhost:2000/api/health
http.status_code: 200
http.request.body.length: 0
http.response.body.length: 124
```

### MongoDB Spans
```
db.system: mongodb
db.operation: find
db.name: ai_ml_forum
db.mongodb.collection: posts
db.statement: {...query...}
```

### LaunchDarkly Spans
```
feature_flag.key: your-flag-name
feature_flag.variation: true / false
feature_flag.variation_index: 0 / 1
feature_flag.reason: OFF_USER / ON_USER / FALLTHROUGH
ld.context.key: user-id-123
```

### Trace ID & Span ID
```
trace_id: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
span_id: fedcba9876543210
parent_span_id: 1234567890abcdef
```

---

## 🟢 Green Spans (Success)

Good signs:
- ✅ `http.status_code: 200`
- ✅ `otel.status_code: OK`
- ✅ No `exception` attributes
- ✅ Expected duration (< 100ms for simple operations)

---

## 🔴 Red Spans (Errors)

What to look for:
- ❌ `http.status_code: 404, 500, etc.`
- ❌ `otel.status_code: ERROR`
- ❌ Has `exception` attribute with error message
- ❌ Unexpectedly long duration

### Example Error Span
```
POST /api/posts (0.00ms - 250.50ms) [Status: ERROR]
├─ MongoDB: create (10.00ms - 200.50ms) [Status: OK]
└─ Exception: ValidationError: Post validation failed
   ├─ message: Title is required
   ├─ stack: at validatePost (/app/validators.js:45)
```

---

## 📈 Performance Analysis

### Identifying Bottlenecks

**Look for**:
1. **Spans taking >1000ms** - Slow operations
2. **Sequential MongoDB calls** - Could be parallelized
3. **Long gaps between spans** - Waiting/processing time

### Example: Slow Query
```
POST /api/posts (0.00ms - 5000.50ms) ⚠️ SLOW
├─ MongoDB: find (0.00ms - 4500.00ms) ⚠️ REALLY SLOW
│  └─ db.statement: db.posts.find({userId: "123"})
├─ LaunchDarkly: variation (4510.00ms - 4520.00ms)
└─ response (4530.00ms - 5000.00ms)
```

**Insight**: MongoDB find() took 4.5 seconds! Check:
- Is there a slow query?
- Are indexes missing?
- Is network latency high?

---

## 🔗 Service Map

To see how your services connect:
1. Click **Service Graph** (top menu)
2. Shows: `forum-server` → `MongoDB` → `LaunchDarkly`
3. Displays:
   - Request volume (arrows)
   - Error rates (red highlights)
   - P95/P99 latency

---

## 📊 Common Trace Patterns

### Pattern 1: Simple Health Check
```
GET /api/health (0.00ms - 1.50ms) ✓
└─ (no child spans - fast network call)
```

### Pattern 2: Database Query
```
GET /api/posts (0.00ms - 50.00ms) ✓
├─ MongoDB: find (5.00ms - 40.00ms) [collection: posts]
└─ serialize (41.00ms - 49.00ms)
```

### Pattern 3: Create with Flag Check
```
POST /api/posts (0.00ms - 150.00ms) ✓
├─ MongoDB: insertOne (10.00ms - 80.00ms) [collection: posts]
├─ LaunchDarkly: variation (90.00ms - 110.00ms) [flag: enable-notifications]
└─ HTTP POST to notification-service (120.00ms - 145.00ms)
```

### Pattern 4: Error Case
```
POST /api/posts (0.00ms - 25.00ms) ✗ ERROR 400
├─ MongoDB: find (5.00ms - 8.00ms) [collection: posts]
├─ validation (8.00ms - 20.00ms)
└─ exception: ValidationError [title required]
```

---

## 🎯 What to Check First

### 1. **Request Duration**
- **< 50ms**: ✓ Excellent
- **50-200ms**: ✓ Good
- **200-500ms**: ⚠️ Check what's slow
- **> 500ms**: 🔴 Investigate

### 2. **Error Rate**
- Click on operation
- See how many red traces vs green traces
- High errors? → Check exception messages

### 3. **MongoDB Queries**
- Look at `db.statement` in MongoDB spans
- Are queries specific? (using indexes)
- Are there N+1 queries? (same query repeated)

### 4. **LaunchDarkly Latency**
- LD spans usually 10-50ms
- > 100ms? → Check LD network
- Missing spans? → Flag evaluation might be failing

---

## 🔍 Debugging Common Issues

### Issue: Trace Shows No Child Spans

**Possible Causes**:
- Operation too fast (< 1μs)
- Auto-instrumentation not active
- Sampling excluded the span

**Fix**:
- Check `OTEL_TRACES_SAMPLER` env var
- Verify instrumentations are registered
- Lower sampling ratio in config

### Issue: Missing MongoDB Spans

**Check**:
- Is MongoDB instrumentation enabled?
- Are you using the MongoDB driver directly?
- Check console logs for instrumentation warnings

### Issue: LaunchDarkly Spans Show Errors

**Look for**:
- `feature_flag.evaluation_error: client_not_initialized`
  → Missing `LD_SDK_KEY` env var
- `feature_flag.evaluation_error: unknown_flag`
  → Flag key doesn't exist in LaunchDarkly
- Network timeout
  → Check LaunchDarkly service availability

---

## 🎨 Timeline Visualization

The waterfall chart shows **when spans run**:

```
Time →

Span A: |========|
Span B:         |====|        (starts after A)
Span C:     |==========|      (overlaps with A)

Sequential: A → B (B waits for A)
Parallel:   A and C run together (A and C overlap)
```

**Performance Tip**: Parallel spans are faster than sequential!

---

## 📋 Trace Search Filters

Use the left panel to find specific traces:

```
Service: forum-server
Operation: POST /api/posts
Lookback: 15m
Status: Error (to find failed requests)
Min Duration: 100ms (show only slow requests)
```

This helps you find:
- All errors in last 15 minutes
- All slow requests (>100ms)
- Specific operation patterns

---

## 🚀 Next Steps

1. **Find a trace** in the list
2. **Click it** to expand
3. **Look for**:
   - Total duration
   - Child spans and their durations
   - Error spans (red)
   - MongoDB, HTTP, LaunchDarkly spans
4. **Check attributes** for details (click span)
5. **Look for patterns** in multiple traces

---

## 📚 Quick Reference

| What to Look For | Location | What It Means |
|------------------|----------|---------------|
| Total duration | Trace header | How long the request took |
| Child spans | Waterfall | What operations happened |
| Span color | Left bar | Green = OK, Red = Error |
| http.status_code | Span details | HTTP response code |
| db.statement | MongoDB span | The actual database query |
| exception | Error spans | Error message and stack |
| feature_flag.value | LD span | Whether flag is ON/OFF |

---

## 💡 Common Questions

**Q: Why does my trace have no child spans?**
A: Could be too fast, not instrumented, or sampling. Check env vars and instrumentation registration.

**Q: How do I see what data was sent to MongoDB?**
A: Click on the MongoDB span, scroll to "Tags", look for `db.statement` attribute.

**Q: Is my request slow?**
A: Compare duration to other similar requests. < 100ms is usually good for simple ops.

**Q: Why is LaunchDarkly taking so long?**
A: Check network latency, flag cache, or if it's actually the bottleneck (look at span duration).

**Q: How do I find errors?**
A: Filter by operation, look for red traces, or use min/max duration filters.

