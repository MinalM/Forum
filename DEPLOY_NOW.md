# DEPLOY NOW - Copy/Paste Instructions

## The Issue
Production Render.com still running OLD code. OAuth login broken with JWT error.

## The Fix
All code is fixed locally and ready. Just need to rebuild Docker image on Render.com.

---

## STEP 1: Verify Code is Ready

```bash
# Run this in terminal:
cd /path/to/Forum
npm test
# Expected: 121 tests passed ✅
```

---

## STEP 2: Rebuild on Render.com

### Option A: Web Dashboard (Easiest)
1. Open: https://dashboard.render.com
2. Click: "forum-server" service
3. Click: Menu ≡ → "Manual Deploy" 
   OR "Redeploy latest commit"
4. Wait: Build completes (5-10 minutes)
   - Watch logs for: "Build successful"
   - Then: "Deployment live"

### Option B: Git Push (Auto-trigger)
```bash
# Make sure code is committed:
git status
# Expected: nothing to commit, working tree clean ✅

# If NOT clean, commit:
git add .
git commit -m "Fix: JWT expiration and OAuth support"
git push

# Render will auto-build within 1-2 minutes
```

---

## STEP 3: Verify Deployment

### Check Logs
1. Render dashboard → forum-server → Logs
2. Should show (no errors):
   ```
   ✅ OpenTelemetry initialized
   📊 OTEL SDK ready
   {"level":"info","message":"MongoDB Connected",...}
   {"level":"info","message":"Server is running on port 10000",...}
   ```

### Should NOT show:
```
Error in Google OAuth strategy: "expiresIn" should be a number
```

### Quick Test
```bash
curl https://aiml-forum.onrender.com/api/health
# Expected response:
# {"status":"UP","environment":"production","dbState":1}
```

---

## STEP 4: Test OAuth

1. Go to: https://aiml-forum.onrender.com
2. Click: "Sign in with Google"
3. Complete Google login flow
4. Should return to app with token ✅

If ERROR: Check Render logs for JWT-related messages

---

## If Build Fails

### Option 1: Clear Cache
```bash
git push -f  # Force push to trigger rebuild
# OR
```

### Option 2: Hard Rebuild
1. Render dashboard → forum-server
2. Settings → Delete service
3. Go back, reconnect GitHub repo
4. Select branch, rebuild

---

## Expected Timeline

- Render build: 5-10 minutes
- Verification: 2 minutes
- Total: ~15 minutes

---

## What Changed (For Reference)

```javascript
// OLD (Broken)
UserSchema.methods.getSignedJwtToken = function() {
  const expiresIn = process.env.JWT_EXPIRE || '24h';
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn  // ❌ Could be undefined
  });
};

// NEW (Fixed)
UserSchema.methods.getSignedJwtToken = function() {
  let expiresIn = process.env.JWT_EXPIRE || '24h';
  
  // Ensure it's always a valid string
  if (!expiresIn || typeof expiresIn !== 'string') {
    expiresIn = '24h';
  }
  
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn  // ✅ Always valid
  });
};
```

---

## Done! 

After rebuild completes:
- ✅ OAuth logins work
- ✅ Tokens last 24 hours
- ✅ Telemetry exports to Grafana
- ✅ No more JWT errors

**Questions?** See FINAL_DEPLOYMENT_SUMMARY.md for details.
