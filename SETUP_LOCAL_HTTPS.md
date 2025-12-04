# Setting Up Local HTTPS for Development

If Spotify is forcing you to use HTTPS redirect URIs, follow these steps:

## Option A: Use a Tunneling Service (Easiest)

### Using ngrok (Recommended for Testing)

1. **Install ngrok:**
   - Download from: https://ngrok.com/download
   - Or with Chocolatey: `choco install ngrok`

2. **Run your dev server:**
   ```bash
   npm run dev
   ```

3. **In a new terminal, create tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update your `.env`:**
   ```env
   NEXTAUTH_URL="https://abc123.ngrok.io"
   ```

6. **Add to Spotify Dashboard:**
   ```
   https://abc123.ngrok.io/api/auth/callback/spotify
   https://abc123.ngrok.io/api/user/spotify-callback
   ```

7. **Restart your dev server**

**Note:** ngrok URLs change each time you restart it (free tier). For a permanent URL, upgrade to ngrok pro or use Option B.

---

## Option B: Local SSL Certificate (More Complex)

### Install mkcert

1. **Install mkcert:**
   ```bash
   choco install mkcert
   ```
   
   Or download from: https://github.com/FiloSottile/mkcert/releases

2. **Install local CA:**
   ```bash
   mkcert -install
   ```

3. **Create certificate for localhost:**
   ```bash
   cd C:\Users\Iampi\OneDrive\Desktop\FinalProjectSpotifyWebApp
   mkcert localhost 127.0.0.1 ::1
   ```

   This creates:
   - `localhost+2.pem` (certificate)
   - `localhost+2-key.pem` (key)

4. **Update package.json:**
   
   Change your dev script:
   ```json
   "scripts": {
     "dev": "node server.js",
     "build": "next build",
     "start": "next start",
     "lint": "next lint"
   }
   ```

5. **Create server.js:**
   ```javascript
   const { createServer } = require('https')
   const { parse } = require('url')
   const next = require('next')
   const fs = require('fs')

   const dev = process.env.NODE_ENV !== 'production'
   const app = next({ dev })
   const handle = app.getRequestHandler()

   const httpsOptions = {
     key: fs.readFileSync('./localhost+2-key.pem'),
     cert: fs.readFileSync('./localhost+2.pem')
   }

   app.prepare().then(() => {
     createServer(httpsOptions, (req, res) => {
       const parsedUrl = parse(req.url, true)
       handle(req, res, parsedUrl)
     }).listen(3000, (err) => {
       if (err) throw err
       console.log('> Ready on https://localhost:3000')
     })
   })
   ```

6. **Update your `.env`:**
   ```env
   NEXTAUTH_URL="https://localhost:3000"
   ```

7. **Update Spotify Dashboard redirect URIs to use HTTPS:**
   ```
   https://localhost:3000/api/auth/callback/spotify
   https://localhost:3000/api/user/spotify-callback
   ```

8. **Restart dev server:**
   ```bash
   npm run dev
   ```

9. **Access your app at:** `https://localhost:3000`

---

## Option C: Just Use HTTP (If Possible)

If you can, delete the HTTPS URIs from Spotify and try adding HTTP ones again:

```
http://localhost:3000/api/auth/callback/spotify
http://localhost:3000/api/user/spotify-callback
```

**This is the simplest and recommended for local development.**

---

## Which Option Should You Choose?

1. **Option C** (HTTP) - Try this first! Spotify should allow it.
2. **Option A** (ngrok) - If you need HTTPS quickly for testing
3. **Option B** (mkcert) - If you want a permanent local HTTPS setup

---

## Troubleshooting

**"Certificate not trusted" error in browser?**
- Make sure you ran `mkcert -install`
- Restart your browser

**ngrok URL keeps changing?**
- This is normal for free tier
- Update your .env each time
- Or upgrade to ngrok pro for permanent URLs

**Next.js won't start with HTTPS?**
- Make sure certificate files exist
- Check file paths in server.js
- Make sure you installed the dependencies: `npm install https fs`

