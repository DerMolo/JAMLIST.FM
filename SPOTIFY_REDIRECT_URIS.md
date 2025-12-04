# Spotify Redirect URIs Configuration

## Required Redirect URIs

Add **BOTH** of these redirect URIs to your Spotify Developer Dashboard:

### 1. NextAuth Spotify Sign In
```
http://localhost:3000/api/auth/callback/spotify
```
**Used for:** Signing in with Spotify button on login/signup pages

### 2. Connect Spotify to Existing Account
```
http://localhost:3000/api/user/spotify-callback
```
**Used for:** Connecting Spotify to an existing email/password account

---

## How to Add Redirect URIs

1. **Go to Spotify Developer Dashboard:**
   - https://developer.spotify.com/dashboard

2. **Select Your App:**
   - Click on your app name

3. **Edit Settings:**
   - Click the "Edit Settings" button in the top right

4. **Add Redirect URIs:**
   - Scroll down to the "Redirect URIs" section
   - Enter the first URI: `http://localhost:3000/api/auth/callback/spotify`
   - Click "ADD"
   - Enter the second URI: `http://localhost:3000/api/user/spotify-callback`
   - Click "ADD"

5. **Save:**
   - Scroll to the bottom and click "SAVE"

---

## For Production Deployment

When you deploy to production, you'll need to add the production versions:

### Production URIs (replace yourdomain.com with your actual domain):
```
https://yourdomain.com/api/auth/callback/spotify
https://yourdomain.com/api/user/spotify-callback
```

Don't forget to update your `.env` file with:
```
NEXTAUTH_URL="https://yourdomain.com"
```

---

## Troubleshooting

**Still getting "Invalid redirect URI" error?**

1. **Check for typos** - The URIs must match EXACTLY
2. **Make sure you clicked "SAVE"** in the Spotify Dashboard
3. **Clear your browser cache** and try again
4. **Restart your dev server** (`npm run dev`)
5. **Check your `.env` file** - Make sure `NEXTAUTH_URL="http://localhost:3000"` (no trailing slash)

**Error: "INVALID_CLIENT: Invalid client"?**
- Double-check your `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`
- Make sure there are no extra spaces or quotes

---

## Current Configuration Check

Your current setup should look like this in `.env`:
```env
SPOTIFY_CLIENT_ID="your_actual_client_id"
SPOTIFY_CLIENT_SECRET="your_actual_client_secret"
NEXTAUTH_URL="http://localhost:3000"
```

**Note:** No trailing slashes in the NEXTAUTH_URL!

