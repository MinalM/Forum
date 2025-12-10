# Production Deployment - OAuth/JWT Fix

## Problem
OAuth login failing with error: `"expiresIn" should be a number of seconds or string representing a timespan`

## Root Cause
`JWT_EXPIRE` environment variable was undefined in production, causing JWT library to receive an invalid value.

## Solution Applied

### 1. Robust JWT Expiration Handling (`server/models/User.js`)
Added defensive validation to ensure JWT expiration is always valid:
```javascript
let expiresIn = process.env.JWT_EXPIRE || '24h';
if (!expiresIn || typeof expiresIn !== 'string') {
  expiresIn = '24h';
}
```

### 2. Environment Variable Initialization (`server/dist/server.js`)
Added early initialization of required environment variables:
```javascript
if (!process.env.JWT_EXPIRE) {
    process.env.JWT_EXPIRE = '24h';
}
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
```

## Required Render.com Environment Variables

Ensure these are set in Render.com dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Enables production mode |
| `JWT_SECRET` | (use your secret) | Required - generate strong secret |
| `JWT_EXPIRE` | `24h` | Optional - defaults to 24h if not set |
| `MONGO_URI` | (MongoDB connection) | Required |
| `GOOGLE_CLIENT_ID` | (from Google Cloud) | OAuth |
| `GOOGLE_CLIENT_SECRET` | (from Google Cloud) | OAuth |
| `GOOGLE_CALLBACK_URL` | `https://aiml-forum.onrender.com/api/users/auth/google/callback` | OAuth |
| `CORS_ORIGIN` | `https://cerulean-marshmallow-003d16.netlify.app` | Optional |

## Deployment Steps

1. **Push changes to GitHub**
   ```bash
   git add .
   git commit -m "Fix: Add JWT expiration validation for production OAuth"
   git push
   ```

2. **Redeploy on Render.com**
   - Changes will auto-deploy if webhook is connected
   - Or manually trigger deployment in Render dashboard

3. **Verify**
   - Test OAuth login flow at https://aiml-forum.onrender.com
   - Check logs in Render dashboard for JWT errors
   - Verify tokens persist beyond 24 seconds

## Files Changed
- `server/models/User.js` - JWT token generation
- `server/src/server.ts` - Environment variable initialization  
- `server/dist/server.js` - Compiled version
- `server/src/instrumentation/otel.ts` - Graceful shutdown for telemetry

## Rollback (if needed)
All changes are backward compatible. To rollback:
1. Revert the git commit
2. Redeploy on Render.com
