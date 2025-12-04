# Fixing Spotify Localhost URI Issues

## Problem
Spotify redirect URI not working with localhost

## Solution Options

### Option 1: Correct Localhost Configuration (RECOMMENDED)

#### 1. Spotify Dashboard Setup
Go to https://developer.spotify.com/dashboard

**Add BOTH of these Redirect URIs:**
```
http://localhost:3000/api/auth/callback/spotify
http://127.0.0.1:3000/api/auth/callback/spotify
```

**Important:**
- ✅ Use `http://` NOT `https://`
- ✅ Include full path `/api/auth/callback/spotify`
- ✅ NO trailing slash
- ✅ Click "Save" and wait 1-2 minutes

#### 2. Your .env File Should Have:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/spotifyapp"
SPOTIFY_CLIENT_ID="your_actual_client_id_from_spotify"
SPOTIFY_CLIENT_SECRET="your_actual_client_secret_from_spotify"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_generated_secret"
JWT_SECRET="your_generated_secret"
```

#### 3. Access Your App:
- Option A: http://localhost:3000
- Option B: http://127.0.0.1:3000

Both should work if you added both redirect URIs in Spotify Dashboard.

---

### Option 2: Use ngrok for Public URL (If localhost still doesn't work)

If Spotify absolutely won't accept localhost (rare), use ngrok:

#### 1. Install ngrok:
```bash
# Download from https://ngrok.com/download
# Or use winget:
winget install ngrok
```

#### 2. Start ngrok tunnel:
```bash
ngrok http 3000
```

You'll get output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

#### 3. Update Spotify Dashboard:
Add the ngrok URL as redirect URI:
```
https://abc123.ngrok.io/api/auth/callback/spotify
```

#### 4. Update your .env:
```env
NEXTAUTH_URL="https://abc123.ngrok.io"
```

#### 5. Restart your dev server

**Note:** ngrok URLs change each time you restart (free tier), so you'll need to update Spotify Dashboard each time.

---

### Option 3: Multiple Redirect URIs (BEST for Development)

Add ALL these to Spotify Dashboard:
```
http://localhost:3000/api/auth/callback/spotify
http://127.0.0.1:3000/api/auth/callback/spotify
http://localhost:3001/api/auth/callback/spotify
```

This gives you flexibility to use different ports/addresses.

---

## Troubleshooting Checklist

- [ ] Redirect URI in Spotify Dashboard is EXACTLY: `http://localhost:3000/api/auth/callback/spotify`
- [ ] No typos in the path (callback, not callbacks)
- [ ] Used `http://` not `https://`
- [ ] No trailing slash at the end
- [ ] Clicked "Save" in Spotify Dashboard
- [ ] Waited 1-2 minutes after saving
- [ ] NEXTAUTH_URL in .env matches: `http://localhost:3000`
- [ ] Restarted dev server after changing .env
- [ ] Cleared browser cache/cookies
- [ ] Trying in incognito/private window

---

## Common Error Messages & Fixes

### Error: "invalid_client"
**Fix:** Check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env are correct

### Error: "redirect_uri_mismatch"
**Fix:** The redirect URI in Spotify Dashboard must EXACTLY match what NextAuth sends
- Check for typos
- Check for trailing slashes
- Make sure it's saved in Spotify Dashboard

### Error: "REDIRECT_URI_MISMATCH"
**Fix:** 
1. Go to Spotify Dashboard → Settings
2. Look at "Redirect URIs" section
3. Make sure `http://localhost:3000/api/auth/callback/spotify` is listed
4. Click Save
5. Wait 2 minutes
6. Try again

---

## Verify Your Setup

### 1. Check Spotify Dashboard:
- App exists
- Client ID matches your .env
- Redirect URIs include localhost callback
- Settings are saved

### 2. Check .env file has all 6 variables:
```
DATABASE_URL
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
NEXTAUTH_URL
NEXTAUTH_SECRET
JWT_SECRET
```

### 3. Test the OAuth flow:
1. Go to http://localhost:3000
2. Click "Sign In with Spotify"
3. Should redirect to Spotify login
4. After login, should redirect back to your app

---

## Still Not Working?

### Debug Mode
Add this to your .env temporarily:
```env
NEXTAUTH_DEBUG=true
```

Restart server and check the terminal for detailed error messages.

### Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for error messages when clicking "Sign In with Spotify"

### Verify Callback URL
When you click "Sign In with Spotify", look at the URL you're redirected to.
It should include:
```
redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fspotify
```

If this doesn't match what's in your Spotify Dashboard, that's the issue.

