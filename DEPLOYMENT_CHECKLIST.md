# ✅ DEPLOYMENT CHECKLIST - Hybrid Observability

## 🎯 Implementation Status: ✅ COMPLETE

All changes for hybrid OTEL + LaunchDarkly observability have been implemented and tested locally.

---

## 📋 Pre-Deployment Checklist

### Local Verification (Do These Now)
- [ ] Files created:
  - [ ] `server/src/instrumentation/ld-observability.ts`
  - [ ] `server/dist/instrumentation/ld-observability.js`
- [ ] Files updated:
  - [ ] `server/src/index.ts` (imports ld-observability)
  - [ ] `server/dist/index.js` (imports ld-observability)
- [ ] Startup verified locally:
  ```bash
  cd server && node dist/index.js
  # Should show both messages:
  # ✅ OpenTelemetry initialized
  # ⚠️ LaunchDarkly SDK not initialized (expected without LD_SDK_KEY)
  ```

### Git Preparation
- [ ] Review changes:
  ```bash
  git status
  # Should show 2 new files + 2 modified files
  ```
- [ ] Commit locally:
  ```bash
  git add .
  git commit -m "Implement hybrid OTEL + LaunchDarkly observability"
  ```

---

## 🌍 Production Setup (Before Deploying)

### Grafana Cloud Setup (5 min)
- [ ] Create account: `https://grafana.com`
- [ ] Verify email
- [ ] Create organization
- [ ] Get OTLP endpoint:
  ```
  https://otlp-gateway-prod-us-central1.grafana.net/otlp
  ```
- [ ] Create API token (copy & save safely)
- [ ] Generate base64 header:
  ```bash
  # macOS/Linux
  echo -n "username:token" | base64
  
  # Windows PowerShell
  $AUTH = "username:token"
  [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($AUTH))
  ```
- [ ] Copy base64 result

### LaunchDarkly Setup (1 min)
- [ ] Login to LaunchDarkly: `https://app.launchdarkly.com`
- [ ] Get SDK Key:
  - [ ] Account settings → Authorization → SDK Keys
  - [ ] Copy **Server-side SDK Key** (NOT Client-side)

### Render Configuration (2 min)
- [ ] Go to: `https://dashboard.render.com`
- [ ] Select your `forum-server` service
- [ ] Go to **Settings** → **Environment**
- [ ] Add variables (exact values from above):

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20YOUR_BASE64_HERE
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_SERVICE_NAME=forum-server-prod
LD_SDK_KEY=sdk-YOUR_KEY_HERE
```

- [ ] **Replace**:
  - `YOUR_BASE64_HERE` with your base64 value
  - `sdk-YOUR_KEY_HERE` with your LD SDK key

---

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
# In your project root
git push origin main
# Render auto-deploys within 1-2 minutes
```

### Step 2: Monitor Deployment
- [ ] Go to Render Dashboard
- [ ] Select your service
- [ ] Go to **Logs**
- [ ] Watch for deployment to complete
- [ ] Look for both initialization messages:
  ```
  ✅ OpenTelemetry initialized
  ✅ LaunchDarkly Observability Integration Active
  ```

### Step 3: Test in Production
- [ ] Make a request to your app:
  ```bash
  curl https://your-render-app.onrender.com/api/health
  ```
- [ ] Wait 10-30 seconds for data to arrive
- [ ] Check both dashboards

---

## ✅ Post-Deployment Verification

### Check Grafana Cloud (5 min)
- [ ] Go to: `https://grafana.com/orgs/your-org`
- [ ] Click **Explore**
- [ ] Select **Tempo** data source
- [ ] Filter by service: `forum-server-prod`
- [ ] Should see traces from your requests
- [ ] Click a trace to see full waterfall

### Check LaunchDarkly Dashboard (5 min)
- [ ] Go to: `https://app.launchdarkly.com`
- [ ] Select your project
- [ ] Go to **Analytics** tab
- [ ] Select a feature flag
- [ ] Should see evaluation metrics
- [ ] Go to **Events** tab
- [ ] Should see events if you made requests

### Check Render Logs (1 min)
- [ ] Go to Render Dashboard
- [ ] Select your service
- [ ] **Logs** tab
- [ ] Search for:
  - [ ] `OpenTelemetry initialized`
  - [ ] `LaunchDarkly Observability Integration`
- [ ] No error messages about export failures

---

## 🔄 If Something's Wrong

### Problem: No traces in Grafana
**Steps**:
1. Check Render logs for errors (search "export")
2. Verify `OTEL_EXPORTER_OTLP_ENDPOINT` is set correctly
3. Verify auth header has `%20` (not space)
4. Wait 30 seconds and try again
5. Make another request to generate fresh trace

### Problem: No events in LaunchDarkly
**Steps**:
1. Check `LD_SDK_KEY` is set in Render
2. Check Render logs for LD initialization message
3. Verify LD_SDK_KEY is valid (copy from account settings)
4. Make request with flag evaluation
5. Wait 10 seconds

### Problem: Application crashing
**Steps**:
1. Check Render logs for error
2. Common issues:
   - Typo in OTEL endpoint
   - Invalid base64 in headers
   - Syntax error in env vars
3. Fix environment variable in Render
4. Redeploy: **Manual Deploy** button in Render

---

## 📊 Success Indicators

### ✅ Indicators That Everything Works

**In Grafana**:
- [ ] Traces appear within 30 seconds
- [ ] Can click trace and see waterfall
- [ ] See HTTP, MongoDB, and flag spans
- [ ] Timeline shows proper nesting

**In LaunchDarkly**:
- [ ] Analytics show flag evaluations
- [ ] Variation split shows accurate counts
- [ ] Events tab shows events if tracking

**In Render Logs**:
- [ ] Both init messages appear
- [ ] No error messages
- [ ] No "Failed to export" messages

---

## 🎯 Optional Next Steps (After Confirming Working)

### Add Custom Event Tracking
In your route handlers, use:
```typescript
import { trackLD_Event } from '../instrumentation/ld-observability'

await trackLD_Event('post_created', req.ldContext, {
  postId: post._id,
  category: post.category
})
```

### Create Grafana Dashboards
1. Go to Grafana
2. Create new dashboard
3. Add Tempo queries for traces
4. Add Prometheus queries for metrics
5. Add Loki queries for logs

### Set Up LD A/B Tests
1. Go to LaunchDarkly
2. Create experiment
3. Select flag
4. Select users by segment
5. Track conversion events
6. View results in Analytics

---

## 🎓 Understanding the Data

### What Goes to Grafana
- All HTTP requests (method, path, status, duration)
- All database queries (operation, collection, duration)
- Flag evaluations (flag key, value, reason)
- Custom spans (if you create them)
- Logs (with trace_id for correlation)

### What Goes to LaunchDarkly
- Flag evaluations (which flag, what user, what value)
- Custom tracked events (anything you send via trackLD_Event)
- User contexts (key, name, email)
- Evaluation metrics (count by variation)

### How They Relate
- Grafana shows **TECHNICAL details** (performance, queries)
- LaunchDarkly shows **BUSINESS impact** (which users, which flags)
- Both use same trace context (can correlate)

---

## ⏱️ Timeline

| Step | Task | Time | When |
|------|------|------|------|
| 1 | Grafana setup | 5 min | Before deploy |
| 2 | LD SDK key copy | 1 min | Before deploy |
| 3 | Render env vars | 2 min | Before deploy |
| 4 | Push to GitHub | <1 min | Now |
| 5 | Render deploys | 1-2 min | Auto |
| 6 | Test requests | 2 min | After deploy |
| 7 | Check dashboards | 5 min | After deploy |
| **Total** | | **~20 min** | |

---

## ✅ Final Checklist Before Pushing

- [ ] All changes committed locally
- [ ] No uncommitted changes (git status shows clean)
- [ ] Grafana account ready (OTLP endpoint, auth header)
- [ ] LaunchDarkly SDK key copied
- [ ] Render env vars prepared (ready to paste)
- [ ] Render service selected (not another service)
- [ ] Ready to make requests to app for testing

---

## 🚀 Ready to Deploy!

When all items above are checked:

```bash
# Push to production
git push origin main

# Wait 1-2 minutes for Render to deploy

# Check logs
# Check Grafana
# Check LaunchDarkly

# Done! ✅
```

---

## 📞 Having Issues?

1. **Check documentation**: `IMPLEMENTATION_COMPLETE.md`
2. **Check logs**: Render Dashboard → Logs
3. **Common fixes**:
   - Auth header format (needs `%20` for space)
   - SDK key validity (copy from account settings)
   - Endpoint typos (copy from Grafana exactly)
4. **Still stuck?**: Check the detailed guides:
   - `QUICK_PRODUCTION_SETUP.md`
   - `OTEL_PRODUCTION_DEPLOYMENT.md`
   - `LAUNCHDARKLY_OBSERVABILITY.md`

---

## 🎉 You've Got This!

Your observability solution is ready for production.

**Summary**:
✅ OTEL + Grafana for comprehensive tracing  
✅ LaunchDarkly for flag analytics  
✅ Both systems independent  
✅ Production-ready code  
✅ Full documentation  

**Time to deploy and get insights!** 🚀
