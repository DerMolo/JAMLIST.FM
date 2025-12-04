# ✅ Quick Start Checklist - Fix Spotify OAuth

## Current Status

✅ **CSS Error Fixed** - `resize-vertical` → `resize-y`  
✅ **Duplicate Servers Stopped** - Only ONE server on port 3000  
✅ **Cache Cleared** - Fresh Next.js build  
✅ **Server Running** - http://localhost:3000  

---

## 🎯 What You Need to Do Next

### Step 1: Configure Spotify Dashboard (5 minutes)

1. Go to https://developer.spotify.com/dashboard
2. Click on your app → **Settings**
3. Under **Redirect URIs**, add these TWO lines:
   ```
   http://127.0.0.1:3000/api/auth/callback/spotify
   http://[::1]:3000/api/auth/callback/spotify
   ```
4. Click **SAVE**
5. **WAIT 1-2 minutes** (important!)

**Note:** Per [Spotify's requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri), `localhost` is NOT allowed - you must use loopback IP addresses (`127.0.0.1` or `[::1]`).

### Step 2: Update Your .env File

Check your `.env` file has these variables:

```env
SPOTIFY_CLIENT_ID="paste_your_client_id_here"
SPOTIFY_CLIENT_SECRET="paste_your_client_secret_here"
NEXTAUTH_URL="http://127.0.0.1:3000"
```

**Important:** Use `127.0.0.1` NOT `localhost` - Spotify's new policy explicitly blocks `localhost` as a redirect URI.

**Get Client ID and Secret from:**
- Spotify Dashboard → Your App → Settings
- Copy Client ID
- Click "View client secret" and copy it

### Step 3: Restart Server (if you changed .env)

If you updated `.env`:
```powershell
# The server is already running, but if you need to restart:
# 1. Stop it with Ctrl+C in the terminal
# 2. Then run:
npm run dev
```

### Step 4: Test Spotify OAuth

1. Open your browser to: http://127.0.0.1:3000 (NOT localhost!)
2. Click **Sign In with Spotify** (or go to Profile page)
3. You should be redirected to Spotify to login
4. After login, you'll be redirected back to your app

---

## 🚫 Common Mistakes to Avoid

❌ **Using `localhost`** - Spotify explicitly blocks `localhost`, use `127.0.0.1` instead  
❌ **Using HTTPS without SSL** - Either use `http://127.0.0.1` or set up proper HTTPS  
❌ **Adding trailing slash** - No slash at the end of redirect URI  
❌ **Not waiting after saving** - Spotify needs 1-2 min to update  
❌ **Running multiple servers** - Use only ONE on port 3000  
❌ **Wrong port in .env** - Must match where server is running  

---

## ✅ If Everything Works

You should see:
- Spotify login page when clicking "Sign In with Spotify"
- Redirected back to your app after login
- No "redirect_uri_mismatch" error
- No "State cookie missing" error
- Can access Spotify playlists in your app

---

## ❌ If You Still Get Errors

### Error: "redirect_uri_mismatch"

**Solution:**
1. Double-check Spotify Dashboard has EXACTLY:
   ```
   http://127.0.0.1:3000/api/auth/callback/spotify
   ```
2. Must use `127.0.0.1` NOT `localhost` (Spotify requirement)
3. No typos, no capital letters, no trailing slash
4. Make sure you clicked SAVE
5. Wait 2 full minutes

### Error: "State cookie was missing"

**Solution:**
1. Clear browser cookies for localhost
2. Try in incognito/private mode
3. Make sure only ONE dev server is running
4. Check `.env` has `NEXTAUTH_URL="http://127.0.0.1:3000"` (NOT localhost)

### Error: "Can't connect"

**Solution:**
- Your server IS running on http://127.0.0.1:3000
- Check the terminal where you ran `npm run dev`
- You should see "Ready" message
- Make sure you're accessing `127.0.0.1` not `localhost`

---

## 📚 Full Documentation

For detailed explanations, see:
- `SPOTIFY_SETUP_GUIDE.md` - Complete step-by-step guide
- `SETUP_LOCAL_HTTPS.md` - HTTPS setup (optional, not needed)
- `SPOTIFY_LOCALHOST_FIX.md` - Troubleshooting guide

---

## 🎵 Summary

The main issue was:
1. **Multiple dev servers** causing OAuth state issues
2. **Redirect URI configuration** needed in Spotify Dashboard

**What we fixed:**
1. ✅ Stopped all duplicate servers
2. ✅ Started fresh on port 3000
3. ✅ Fixed CSS error
4. ✅ Documented complete setup process

**What you need to do:**
1. Configure Spotify Dashboard with redirect URIs
2. Update `.env` with your Spotify credentials
3. Test the OAuth flow

**You DO NOT need:**
- ❌ HTTPS setup (HTTP works with loopback IPs)
- ❌ ngrok or tunneling (for local development)
- ❌ Code changes (it's all configuration)

**What changed:**
- Spotify now requires `127.0.0.1` instead of `localhost` ([official docs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri))

---

## 🆘 Still Need Help?

If you've followed all steps and still have issues:
1. Enable debug mode: Add `NEXTAUTH_DEBUG=true` to `.env`
2. Check browser console (F12) for errors
3. Check terminal output for error messages
4. Verify redirect URI in Spotify Dashboard one more time

---

**Current Server:** http://127.0.0.1:3000 ✅  
**Status:** Ready to test Spotify OAuth  
**Next Step:** Configure Spotify Dashboard with `127.0.0.1` (NOT `localhost`)

