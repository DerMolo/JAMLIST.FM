# Complete Spotify OAuth Setup Guide

## 🚨 Current Issues Resolved

1. ✅ Multiple dev servers running (causing port conflicts)
2. ✅ Spotify redirect URI configuration
3. ✅ HTTP vs HTTPS for localhost
4. ✅ OAuth "State cookie missing" errors

---

## Part 1: Spotify Dashboard Configuration

### Step 1: Access Your Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Click on your app (or create a new one if needed)
3. Click **Settings** (or **Edit Settings**)

### Step 2: Set Redirect URIs

**IMPORTANT:** Spotify **DOES** allow `http://` for localhost development!

Add these **exact** redirect URIs (case-sensitive, no trailing slash):

```
http://127.0.0.1:3000/api/auth/callback/spotify
http://[::1]:3000/api/auth/callback/spotify
```

**Important:** As per [Spotify's redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri):
- ✅ Loopback IP literals (`127.0.0.1` or `[::1]`) with HTTP are allowed
- ❌ `localhost` is **NOT allowed** as a redirect URI
- Both IPv4 and IPv6 loopback addresses are recommended for compatibility

### Step 3: Save and Wait

1. Click **SAVE** at the bottom
2. **Wait 1-2 minutes** for changes to propagate
3. Do NOT close the browser yet - you need your credentials

### Step 4: Copy Your Credentials

1. Click **Settings** if not already there
2. Copy your **Client ID**
3. Click **View client secret**
4. Copy your **Client Secret**

---

## Part 2: Environment Configuration

### Step 1: Create/Update .env File

In your project root, create or update `.env` with:

```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/spotifyapp"

# Spotify Credentials (from Spotify Dashboard)
SPOTIFY_CLIENT_ID="your_actual_client_id_here"
SPOTIFY_CLIENT_SECRET="your_actual_client_secret_here"

# NextAuth Configuration (use loopback IP, not localhost)
NEXTAUTH_URL="http://127.0.0.1:3000"
NEXTAUTH_SECRET="tQuda4LmCud9aiyimjRMeK/bL6UmeSPGsIuF1mOrkT0="

# JWT Secret
JWT_SECRET="mcfkivbLTbBMxwN8SZj92jnudjGh05PA9+2XmaIg100="
```

**Replace:**
- `YOUR_PASSWORD` with your PostgreSQL password
- `your_actual_client_id_here` with the Client ID from Spotify
- `your_actual_client_secret_here` with the Client Secret from Spotify

**Keep as-is:**
- NEXTAUTH_SECRET
- JWT_SECRET

**Important:** Use `127.0.0.1` (not `localhost`) for NEXTAUTH_URL

---

## Part 3: Clean Start

### Step 1: Kill All Running Servers

```powershell
# Find processes on port 3000, 3001, 3002
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002

# Kill each process (replace PID with actual process ID)
taskkill /PID <process_id> /F
```

Or simply close all terminal windows with `npm run dev`.

### Step 2: Clear Next.js Cache

```powershell
Remove-Item -Path ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 3: Start Fresh

```powershell
npm run dev
```

You should see:
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
- Environments: .env

✓ Ready in XXXms
```

---

## Part 4: Test Spotify OAuth

### Step 1: Open Your App

Navigate to: http://127.0.0.1:3000

**Note:** You must use `127.0.0.1` (not `localhost`) in your browser to match Spotify's requirements.

### Step 2: Sign In with Spotify

1. Click **Sign In with Spotify** or go to Profile page
2. You should be redirected to Spotify's login page
3. Login with your Spotify account
4. Authorize the app

### Step 3: Verify Success

You should be redirected back to your app at:
```
http://127.0.0.1:3000/dashboard
```

Or wherever your app redirects after successful login.

---

## Common Errors & Solutions

### Error: "redirect_uri_mismatch"

**Cause:** The URI in Spotify Dashboard doesn't match exactly

**Solution:**
1. Check Spotify Dashboard → Settings → Redirect URIs
2. Must be EXACTLY: `http://127.0.0.1:3000/api/auth/callback/spotify`
3. Use `127.0.0.1` NOT `localhost` (Spotify requirement)
4. No capital letters, no trailing slash, no typos
5. Save and wait 1-2 minutes

### Error: "State cookie was missing"

**Causes:**
1. Multiple dev servers running (port conflicts)
2. Browser cookies blocked/cleared mid-OAuth
3. NEXTAUTH_URL doesn't match actual URL

**Solutions:**
1. Kill all dev servers, start only ONE
2. Clear browser cookies for localhost
3. Try in incognito/private mode
4. Ensure NEXTAUTH_URL="http://127.0.0.1:3000" in .env (NOT localhost)

### Error: "invalid_client"

**Cause:** Wrong Client ID or Client Secret

**Solution:**
1. Go to Spotify Dashboard
2. Copy Client ID and Client Secret again
3. Update `.env` file
4. Restart dev server

### Error: 401/403 from Spotify API

**Cause:** OAuth flow didn't complete successfully

**Solution:**
1. Sign out completely
2. Clear browser cookies
3. Try the Spotify sign-in flow again

---

## Why Use 127.0.0.1 Instead of localhost?

As per [Spotify's official documentation](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri):

### Spotify's Requirements (Enforced April 2025):
- ✅ **ALLOWS:** `http://127.0.0.1` or `http://[::1]` (loopback IP literals)
- ❌ **BLOCKS:** `http://localhost` (explicitly not allowed)
- ❌ **BLOCKS:** `http://` with public domains (e.g., `http://example.com`)
- ✅ **ALLOWS:** `https://` for any domain (requires SSL certificate)

**This is why you were blocked!** You were trying to use `localhost` which Spotify no longer permits.

### If You Still Want HTTPS (Optional):

See `SETUP_LOCAL_HTTPS.md` for instructions on:
- Option A: Using ngrok (tunneling service)
- Option B: Using mkcert (local SSL certificates)

**For development, HTTP with loopback IPs (127.0.0.1) is the recommended approach!**

---

## Verification Checklist

- [ ] Spotify Dashboard has both redirect URIs added
- [ ] Clicked SAVE in Spotify Dashboard
- [ ] Waited 1-2 minutes after saving
- [ ] `.env` file has correct Client ID
- [ ] `.env` file has correct Client Secret
- [ ] `.env` file has NEXTAUTH_URL="http://127.0.0.1:3000" (NOT localhost)
- [ ] Only ONE dev server running on port 3000
- [ ] Can access http://127.0.0.1:3000 in browser
- [ ] Tried Spotify sign-in in incognito mode

---

## Still Having Issues?

### Enable Debug Mode

Add to `.env`:
```env
NEXTAUTH_DEBUG=true
NODE_ENV=development
```

Restart server and check the terminal for detailed logs.

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors when clicking "Sign In with Spotify"
4. Check Network tab for failed requests

### Verify OAuth Flow URL

When you click "Sign In with Spotify", you should be redirected to a URL like:

```
https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fauth%2Fcallback%2Fspotify&...
```

The `redirect_uri` parameter (when URL decoded) should match exactly what's in your Spotify Dashboard.

---

## Quick Reference

### Spotify Redirect URIs:
```
http://127.0.0.1:3000/api/auth/callback/spotify
http://[::1]:3000/api/auth/callback/spotify
```

### Environment Variables:
```env
NEXTAUTH_URL="http://127.0.0.1:3000"
SPOTIFY_CLIENT_ID="from_spotify_dashboard"
SPOTIFY_CLIENT_SECRET="from_spotify_dashboard"
```

### Start Server:
```bash
npm run dev
```

### Access App:
```
http://127.0.0.1:3000
```

---

## Summary

The key points:
1. **Use `127.0.0.1` NOT `localhost`** - Spotify explicitly blocks `localhost` as a redirect URI
2. **HTTP is allowed ONLY for loopback IPs** - `127.0.0.1` or `[::1]`
3. **Only run ONE dev server** - multiple servers cause OAuth state issues
4. **Redirect URIs must match EXACTLY** - no typos, no trailing slashes
5. **Wait after saving** in Spotify Dashboard - changes take 1-2 minutes
6. **Access via `http://127.0.0.1:3000`** - not localhost, not https

Follow this guide step-by-step and your Spotify OAuth should work perfectly! 🎵

