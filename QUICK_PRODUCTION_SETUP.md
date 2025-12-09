# Quick Action Plan: Production Deployment

## Your Current Setup
- **Backend**: Render.com (Node.js)
- **Frontend**: Netlify (React)
- **Database**: MongoDB Atlas
- **Feature Flags**: LaunchDarkly

---

## 🎯 Recommended Path: Grafana Cloud (5 minutes setup)

### Step 1: Create Grafana Cloud Account (2 min)
```
1. Go to https://grafana.com/auth/sign-up/create-account
2. Sign up with email
3. Create organization (e.g., "Forum")
4. Verify email
```

**After signup, you'll have**:
- Organization name
- Username (usually a number)
- URL: `https://grafana.com/orgs/your-number`

### Step 2: Enable OTLP (1 min)
Inside Grafana Cloud:
```
Home → Connections → Data Sources
→ Search "Tempo" → Click it
→ You'll see OTLP endpoint info
```

**Copy these**:
```
OTLP Endpoint: https://otlp-gateway-prod-us-central1.grafana.net/otlp
```

(Replace `us-central1` with your region)

### Step 3: Create API Token (1 min)
```
Account settings (gear icon) → API Keys & Tokens
→ Create API Token
→ Name: "Forum Render Backend"
→ Copy the token (save safely!)
```

### Step 4: Create Base64 Header (30 sec)
```bash
# On your computer, open terminal/PowerShell
# Replace USERNAME with your Grafana username (usually number)
# Replace API_TOKEN with your token from Step 3

USERNAME="123456"          # ← Your Grafana username
API_TOKEN="glc_xxxxx"      # ← Your token

# Run this:
echo -n "$USERNAME:$API_TOKEN" | base64

# You'll get output like:
# MTIzNDU2Omdsbl9xxxxxxxxxxxxxxxxxxxx
# Copy this value!
```

**Windows PowerShell**:
```powershell
$USERNAME = "123456"
$API_TOKEN = "glc_xxxxx"
$AUTH = "$USERNAME:$API_TOKEN"
$BYTES = [System.Text.Encoding]::UTF8.GetBytes($AUTH)
$BASE64 = [Convert]::ToBase64String($BYTES)
Write-Host $BASE64
```

### Step 5: Add to Render (1 min)
1. Go to https://dashboard.render.com
2. Click your `forum-server` service
3. Go to **Settings** → **Environment**
4. Add these variables:

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20MTIzNDU2Omdsbl9xxxxxxxxxxxxxxxxxxxx
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_SERVICE_NAME=forum-server-prod
LD_SDK_KEY=sdk-xxxxx
NODE_ENV=production
```

**Important**: Replace:
- `MTIzNDU2Omdsbl9xxxxxxxxxxxxxxxxxxxx` with your base64 value from Step 4
- `sdk-xxxxx` with your LaunchDarkly SDK key (from LaunchDarkly Dashboard)

### Step 6: Deploy (automatic)
```bash
git add .
git commit -m "Enable OTEL production"
git push origin main
# Render auto-deploys!
```

Check Render logs:
```
Render Dashboard → Your service → Logs
Look for: "✅ OpenTelemetry initialized"
```

### Step 7: View Traces (30 sec)
1. Go to https://grafana.com/orgs/your-org
2. Click **Explore**
3. Select **Tempo** data source
4. Filter by service: `forum-server-prod`
5. See your production traces!

---

## 🎯 Get Your LaunchDarkly SDK Key

1. Go to https://app.launchdarkly.com
2. Click your account → **Account Settings**
3. Go to **Authorization** → **SDK Keys**
4. Copy **Server-side SDK Key** (NOT Client-side!)
5. Add to Render as `LD_SDK_KEY=sdk-xxxxx`

---

## 🚀 Testing It Works

After deployment, make requests to your app:

```bash
# Test endpoint
curl https://your-render-app.onrender.com/api/health

# Then check Grafana
https://grafana.com/orgs/your-org
→ Explore → Tempo
→ Filter by service: forum-server-prod
→ You should see the trace!
```

---

## 📊 What You'll See in Grafana

### Trace View
```
POST /api/posts (150ms total)
├─ HTTP request handling (0-150ms)
├─ MongoDB: insertOne (10-80ms)
├─ LaunchDarkly: variation (90-110ms) ← Flag evaluation
└─ Response (110-150ms)
```

### Metrics
- `http.server.requests` - HTTP request count
- `http.server.duration` - Request latency
- `posts.created` - Posts created counter
- `feature_flag.evaluations` - Flag evaluations

### Logs (via Loki)
- All logs with trace_id for correlation
- Search by trace_id to see all logs for a request

---

## ❌ If Traces Don't Appear

### Checklist:
1. ✅ Is `OTEL_EXPORTER_OTLP_ENDPOINT` set in Render?
   ```
   Render → Settings → Environment
   → Should have OTEL_EXPORTER_OTLP_ENDPOINT
   ```

2. ✅ Is the header correct?
   ```
   Should be: Authorization=Basic%20<base64>
   Note the %20 (URL-encoded space)
   ```

3. ✅ Can Render reach Grafana?
   ```
   Render Logs → Search for "export"
   Look for errors about connection/auth
   ```

4. ✅ Did you redeploy after setting env vars?
   ```
   Render → Your service → Manual Deploy
   ```

5. ✅ Have you made requests to your app?
   ```
   curl https://your-render-app.onrender.com/api/health
   ```

---

## 📋 Environment Variables Quick Reference

### What You Need to Add to Render

```env
# OTEL (Required for traces)
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20<your-base64>
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
OTEL_SERVICE_NAME=forum-server-prod

# LaunchDarkly (Optional but recommended)
LD_SDK_KEY=sdk-xxxxx

# Existing variables (keep these!)
NODE_ENV=production
MONGO_URI=<your-atlas-url>
JWT_SECRET=<your-secret>
GOOGLE_CLIENT_ID=<your-id>
GOOGLE_CLIENT_SECRET=<your-secret>
```

---

## 🎯 Optional: Enable Frontend Tracing

If you want to trace React on Netlify:

1. Install packages:
   ```bash
   cd client
   npm install @opentelemetry/sdk-web @opentelemetry/exporter-trace-otlp-http
   ```

2. Initialize in `src/index.tsx` (before React.render)
3. Add to Netlify env vars:
   ```
   REACT_APP_OTEL_ENDPOINT=https://otlp-gateway-prod-us-central1.grafana.net/otlp
   ```

---

## ✅ Verification Checklist

- [ ] Grafana Cloud account created
- [ ] OTLP endpoint copied
- [ ] API token created
- [ ] Base64 header generated
- [ ] Render env vars set
- [ ] Backend redeployed
- [ ] Made a test request to /api/health
- [ ] Traces visible in Grafana
- [ ] LD_SDK_KEY added to Render
- [ ] LaunchDarkly flags appearing in traces

---

## 🔗 Links You'll Need

- Grafana Cloud: https://grafana.com/
- Your Grafana Org: https://grafana.com/orgs/your-org
- Render Dashboard: https://dashboard.render.com
- Your Render Service: https://dashboard.render.com → select service
- LaunchDarkly: https://app.launchdarkly.com
- Your Backend URL: https://your-render-app.onrender.com

---

## 💡 Pro Tips

1. **Use Grafana Explore with Tempo**:
   - Better UI than basic Jaeger
   - Can correlate logs + traces + metrics
   - Free tier is generous

2. **Set Service Name Clearly**:
   ```
   OTEL_SERVICE_NAME=forum-server-prod
   ```
   This way you can easily filter in Grafana

3. **Watch Logs While Deploying**:
   ```
   Render → Your service → Logs
   → Tail -f (follow logs in real-time)
   ```

4. **Test Locally First** (optional):
   ```bash
   OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway... npm start
   # Should show "✅ OpenTelemetry initialized"
   ```

---

## 📞 Need Help?

If something doesn't work:
1. Check Render logs for errors
2. Check Grafana for incoming data
3. Verify auth header is correct (URL-encoded)
4. Try with public endpoint first (no auth)
5. Check OTEL_EXPORTER_OTLP_ENDPOINT is reachable

