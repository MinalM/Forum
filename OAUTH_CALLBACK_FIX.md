# OAuth Callback 500 Error - Fix Instructions

## Problem
You're getting a 500 error on the OAuth callback URL. The error is coming from the JWT token generation in the `googleCallback` function.

## Root Cause
The production Docker container on Render.com is still running the **OLD code** before my fixes were applied. It doesn't have the JWT expiration validation.

When Google auth completes and calls `user.getSignedJwtToken()`, it's hitting the old broken code that throws the "expiresIn" error.

## Solution: Rebuild Docker Image on Render.com

### Critical: This MUST be done immediately

#### Method 1: Web Dashboard (Easiest)

1. **Go to Render Dashboard**
   - Open: https://dashboard.render.com
   - Sign in if needed

2. **Select Your Service**
   - Click on "forum-server" (the Node.js service)

3. **Manual Deploy**
   - Click the three-dot menu (⋯) in top right
   - Click "Manual Deploy" or "Redeploy latest commit"
   - Confirm when prompted

4. **Wait for Build**
   - Watch the "Activity" or "Logs" tab
   - Look for: "Building" → "Build successful" → "Deployment live"
   - This takes 5-10 minutes

5. **Verify**
   - Once "Deployment live" appears, wait 1 minute
   - Go back to your app: https://aiml-forum.onrender.com
   - Try OAuth login again

#### Method 2: Force Git Push

```bash
# In your repo:
git status
# Should show: "nothing to commit, working tree clean"

# If there are changes, commit them:
git add .
git commit -m "Deploy JWT fixes"

# Force push to trigger rebuild:
git push -f

# Render will detect the push and auto-rebuild within 1-2 minutes
```

#### Method 3: Complete Service Rebuild

If above doesn't work:

1. **Render Dashboard** → "forum-server"
2. **Settings** → Scroll down → "Delete Service"
3. Confirm deletion
4. Go back to Render home
5. "New" → "Web Service" → Connect GitHub → Select your repo
6. Deploy

---

## Expected Flow After Rebuild

```
OAuth Login Flow:
1. User clicks "Sign in with Google"
2. Google redirects to: /api/users/auth/google/callback?code=...
3. Server receives code and authenticates with Google ✅
4. Server creates NEW user or finds existing user ✅
5. Server calls user.getSignedJwtToken() ✅
   - Now with my fix, this ALWAYS returns valid '24h' token
6. Server redirects with token ✅
7. Frontend receives token and saves it ✅
8. User is logged in ✅
```

---

## Testing After Rebuild

### 1. Check Render Logs
- Dashboard → forum-server → Logs
- Should see:
  ```
  ✅ OpenTelemetry initialized
  📊 OTEL SDK ready
  {"level":"info","message":"MongoDB Connected",...}
  Server is running on port 10000
  ```
- Should NOT see:
  ```
  Error in Google OAuth strategy: "expiresIn"
  ```

### 2. Test OAuth Flow
1. Go to: https://aiml-forum.onrender.com
2. Click "Sign in with Google"
3. Complete Google login
4. Should redirect back to app with a token
5. You should be logged in ✅

### 3. Check Browser Console
- Open DevTools (F12)
- Check Console tab for errors
- Go to Application → Cookies
- Should see `token` cookie with value

---

## If Still Failing

### Check 1: Verify Environment Variables
1. Render Dashboard → forum-server → Settings
2. Scroll to "Environment"
3. Verify these are set:
   - `GOOGLE_CLIENT_ID` ✓
   - `GOOGLE_CLIENT_SECRET` ✓
   - `GOOGLE_CALLBACK_URL=https://aiml-forum.onrender.com/api/users/auth/google/callback` ✓
   - `JWT_SECRET` ✓

### Check 2: Verify Callback URL
1. Google Cloud Console → Your App
2. Authorized redirect URIs should include:
   - `https://aiml-forum.onrender.com/api/users/auth/google/callback`
3. If not, add it

### Check 3: Check Render Logs for Actual Error
1. Click on error in Logs tab
2. See full stack trace
3. Look for what's actually failing

### Check 4: Hard Refresh
```bash
# In browser:
Ctrl+Shift+R  (Windows)
Cmd+Shift+R   (Mac)
```

---

## What Was Fixed (For Reference)

The old code had a bug where `process.env.JWT_EXPIRE` could be undefined:

```javascript
// OLD - BROKEN
const expiresIn = process.env.JWT_EXPIRE || '24h';
jwt.sign({...}, {...}, { expiresIn }); // ❌ Could pass undefined!
```

New code always validates the value:

```javascript
// NEW - FIXED
let expiresIn = process.env.JWT_EXPIRE || '24h';
if (!expiresIn || typeof expiresIn !== 'string') {
  expiresIn = '24h';  // Always ensure it's valid
}
jwt.sign({...}, {...}, { expiresIn }); // ✅ Always valid!
```

---

## Timeline

- Render rebuild: **5-10 minutes**
- Verification: **2 minutes**
- **Total time: ~15 minutes**

---

## Still Need Help?

1. Share the **exact error** from Render logs
2. Share the **commit hash** of latest deploy
3. Verify **environment variables** are all set
4. Try **hard rebuild** (Method 3 above)

**The fix is ready. Just need to rebuild the Docker image!**
