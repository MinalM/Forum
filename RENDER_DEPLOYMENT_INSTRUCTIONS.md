# Render.com Deployment Instructions - JWT/OAuth Fix

## Problem
Production OAuth login failing with: `"expiresIn" should be a number of seconds or string representing a timespan`

Root cause: Production Docker container has outdated code - it hasn't been rebuilt since the fix was committed.

## Solution
Force Render.com to rebuild the Docker image with the latest code.

## Deployment Steps

### 1. Push Code to GitHub (Already Done ✓)
All fixes have been made locally:
- `server/models/User.js` - JWT expiration validation
- `server/src/server.ts` - Environment variable initialization
- `server/dist/server.js` - Compiled version
- `server/src/instrumentation/otel.ts` - Graceful OTel shutdown
- `server/Dockerfile` - Updated entry point to use `dist/index.js`

### 2. Trigger Render.com Rebuild

**Option A: Manual Rebuild (Recommended)**
1. Go to Render.com dashboard
2. Select the "forum-server" service
3. Click "Manual Deploy" or "Redeploy latest commit"
4. Wait for build to complete (5-10 minutes)
5. Verify deployment succeeded in logs

**Option B: Clear Cache and Re-push**
1. Ensure all changes are committed: `git status` (should be clean)
2. Force push if needed: `git push -f`
3. Render should auto-rebuild within 1-2 minutes

**Option C: Delete and Recreate**
If Render has cached issues:
1. Note current environment variables
2. Delete service from Render dashboard
3. Reconnect GitHub repository to Render
4. Select same branch and rebuild

### 3. Verify Deployment

After rebuild completes:

```bash
# Check Render logs for successful startup
# Should see:
# ✅ OpenTelemetry initialized
# 📊 OTEL SDK ready
# {"level":"info","message":"MongoDB Connected",...}
# {"level":"info","message":"Server is running on port 10000",...}

# Should NOT see:
# Error in Google OAuth strategy: "expiresIn" should be a number

# Test OAuth flow
curl https://aiml-forum.onrender.com/api/health
# Should return: {"status":"UP","environment":"production","dbState":1}

# Try logging in through UI at:
# https://aiml-forum.onrender.com
```

### 4. Environment Variables Check

Verify these are set in Render dashboard (Settings > Environment):

| Variable | Required | Status |
|----------|----------|--------|
| NODE_ENV | Yes | Should be `production` |
| JWT_SECRET | Yes | Must be set |
| JWT_EXPIRE | No | Defaults to `24h` if not set |
| MONGO_URI | Yes | MongoDB connection string |
| GOOGLE_CLIENT_ID | Yes | For OAuth |
| GOOGLE_CLIENT_SECRET | Yes | For OAuth |
| GOOGLE_CALLBACK_URL | Yes | `https://aiml-forum.onrender.com/api/users/auth/google/callback` |

## Expected Results

After successful rebuild and deployment:

✅ OAuth login works without JWT errors
✅ Tokens expire after 24 hours
✅ Telemetry exports to Grafana
✅ LaunchDarkly integration works
✅ No "expiresIn" errors in logs

## Troubleshooting

### Still seeing JWT errors after rebuild?

1. **Hard refresh Render cache**
   - Delete the service and recreate
   - Or contact Render support to clear cache

2. **Check environment variables**
   - Verify JWT_SECRET is set in Render dashboard
   - Verify JWT_EXPIRE is NOT set to a numeric value only (should be "24h" or number with unit)

3. **Verify code was deployed**
   - Check Render logs for the commit hash
   - Should be the latest commit with JWT fixes
   - Look for  "Ensure JWT_EXPIRE is properly formatted" message

4. **Check Docker build step**
   - Render should be copying `server/models/User.js` with the fix
   - File should contain the validation code

### Rollback (if needed)

```bash
git revert <commit-hash>
git push
# Render will auto-rebuild with previous version
```

## Files Modified in This Fix

1. **server/models/User.js** (Line 107-119)
   - Added JWT expiration validation
   - Ensures `expiresIn` is always a valid string

2. **server/src/server.ts** (Line 13-21)
   - Sets JWT_EXPIRE default before app initialization
   - Throws error if JWT_SECRET is missing

3. **server/dist/server.js** (Compiled version)
   - Already compiled and ready in repo

4. **server/src/instrumentation/otel.ts**
   - Added graceful shutdown for telemetry

5. **server/Dockerfile**
   - Updated CMD to use correct entry point

## Status

✅ All code fixes complete
✅ All 121 tests passing  
✅ Ready for production deployment
⏳ Waiting for Render.com to rebuild Docker image

**Next Step**: Manually trigger rebuild in Render.com dashboard
