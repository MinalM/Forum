# Google OAuth Setup Guide

## Fixing "redirect_uri_mismatch" Error

This error occurs when the callback URL in your `.env` file doesn't match what's configured in Google Cloud Console.

### Step 1: Check Your Server `.env` File

Ensure `server/.env` has the correct callback URL:

```env
GOOGLE_CALLBACK_URL=http://localhost:2000/api/users/auth/google/callback
```

**Important:** 
- Must be exactly `http://localhost:2000/api/users/auth/google/callback` (no trailing slash)
- Port must match your server port (2000 for local dev)

### Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:2000/api/users/auth/google/callback
   ```
5. Click **Save**

### Step 3: Restart Your Server

After updating the `.env` file, restart your server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

Check the server logs - you should see:
```
Google OAuth Callback URL: http://localhost:2000/api/users/auth/google/callback
```

### Step 4: Clear Browser Cache & Rebuild Client

The OAuthSuccess error should be fixed, but you may need to:

1. **Hard refresh the browser**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Or rebuild the client**:
   ```bash
   cd client
   npm run build
   ```

### Common Issues

- **Port mismatch**: Make sure the port in `GOOGLE_CALLBACK_URL` matches your server port
- **Trailing slash**: Don't include a trailing slash in the callback URL
- **HTTP vs HTTPS**: Use `http://` for local development, not `https://`
- **Multiple redirect URIs**: You can add multiple URIs in Google Console (one per line)

### Testing

1. Go to your login page
2. Click "Sign in with Google"
3. You should be redirected to Google's consent screen
4. After authorization, you should be redirected back to `/oauth-success`
5. You should then be redirected to `/dashboard`

