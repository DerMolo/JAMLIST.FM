# Quick Start Guide - TL;DR Version

Get up and running in 5 minutes! ⚡

---

## 🖥️ On Your Computer (First Time)

### 1. Prerequisites Check
```bash
node -v    # Should be 18+
npm -v     # Should exist
```
If missing, install from [nodejs.org](https://nodejs.org/)

### 2. Get the Code
```bash
# If you have Git
git clone <repo-url>
cd FinalProjectSpotifyWebApp

# Or download and extract ZIP, then cd into folder
```

### 3. Auto Setup (Recommended)
**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```bash
setup.bat
```

**Or Manual Setup:**
```bash
npm install
# Create .env file (see below)
npx prisma generate
npx prisma migrate dev
```

### 4. Configure .env
Copy this template and fill in values:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/spotify_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
SPOTIFY_CLIENT_ID="get-from-spotify-dashboard"
SPOTIFY_CLIENT_SECRET="get-from-spotify-dashboard"
```

**Spotify Setup (2 minutes):**
1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create App → Get Client ID & Secret
3. Add Redirect URI: `http://localhost:3000/api/auth/callback/spotify`

**Database Options:**
- **Local:** Install PostgreSQL, create database
- **Cloud (Easier):** [Supabase](https://supabase.com/), [Neon](https://neon.tech/), or [Railway](https://railway.app/) (all have free tiers)

### 5. Start
```bash
npm run dev
```
Open `http://localhost:3000` 🎉

---

## 📱 On Another Device (Same Network)

### On Host Computer:
1. Find your IP:
   ```bash
   # Windows: ipconfig
   # Mac/Linux: ifconfig or ip addr
   # Look for something like 192.168.1.100
   ```

2. Start server for network:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

3. Update `.env`:
   ```env
   NEXTAUTH_URL="http://YOUR_IP:3000"
   ```

4. Add to Spotify Redirect URIs:
   ```
   http://YOUR_IP:3000/api/auth/callback/spotify
   ```

### On Other Device:
Open browser → `http://YOUR_IP:3000`

---

## 🌐 Deploy to Internet (Vercel)

### One-Time Setup (10 minutes):

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com/)
   - "New Project" → Import your repo
   - Add Environment Variables (same as .env)
   - Deploy!

3. **Update Spotify:**
   - Add Vercel URL to Redirect URIs
   - Update `NEXTAUTH_URL` in Vercel to your domain

4. **Database Migrations:**
   ```bash
   # Connect to production DB and run:
   npx prisma migrate deploy
   ```

**Done!** Your app is live on `https://your-app.vercel.app`

---

## 🔧 Troubleshooting (Common Issues)

### "Can't connect to database"
```bash
# Test connection
npx prisma db pull

# Check .env has correct DATABASE_URL
# Ensure PostgreSQL is running
```

### "Spotify auth fails"
- Redirect URIs must match EXACTLY (no trailing slashes)
- Check NEXTAUTH_URL matches your URL
- Clear cookies and try again

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Prisma Client error"
```bash
npx prisma generate
```

### Port 3000 in use
```bash
npm run dev -- -p 3001
# Update NEXTAUTH_URL to :3001
```

---

## 📱 Different Devices Scenarios

| Scenario | Setup Time | What You Need |
|----------|------------|---------------|
| Your laptop (first time) | 15-20 min | Node.js, PostgreSQL, Spotify app |
| Your laptop (already set up) | 30 seconds | Just `npm run dev` |
| Friend's computer | 15-20 min | Same as first time |
| Your phone (same WiFi) | 2 min | Host computer running app |
| Public internet | 20 min | GitHub + Vercel account |
| Another developer | 10 min | Clone + .env + migrations |

---

## 🎯 Minimum Required Files

To move project to another device, you need:
```
✅ All source code files
✅ package.json & package-lock.json
✅ prisma/ folder
✅ .env file (manually create with credentials)
❌ node_modules/ (will be regenerated)
❌ .next/ (will be regenerated)
```

---

## 📋 Setup Checklist

Copy this to a new device:

```
[ ] Node.js 18+ installed
[ ] Project files copied/cloned
[ ] npm install completed
[ ] .env file created with:
    [ ] DATABASE_URL
    [ ] NEXTAUTH_URL
    [ ] NEXTAUTH_SECRET
    [ ] SPOTIFY_CLIENT_ID
    [ ] SPOTIFY_CLIENT_SECRET
[ ] Spotify app created with correct redirect URI
[ ] Database created and accessible
[ ] npx prisma generate
[ ] npx prisma migrate dev
[ ] npm run dev
[ ] App opens at localhost:3000
[ ] Can log in with Spotify
```

---

## ⚡ Super Quick Commands

**First time setup:**
```bash
npm install && npx prisma generate && npx prisma migrate dev && npm run dev
```

**Subsequent runs:**
```bash
npm run dev
```

**Reset everything:**
```bash
rm -rf node_modules .next
npm install
npx prisma generate
npx prisma migrate reset
npm run dev
```

---

## 🆘 Need More Help?

- **Detailed Guide:** [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Project Info:** [README.md](./README.md)
- **Recent Changes:** [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md)

---

## 💡 Tips

- **Use cloud database** (Supabase/Neon) to avoid PostgreSQL install
- **Run setup script** for automatic configuration
- **Copy .env** from working device to save time
- **Use Vercel** for easiest public deployment
- **Keep Spotify redirect URIs** updated when changing URLs

---

**Total Setup Time:**
- First device: ~15-20 minutes
- Additional devices: ~5-10 minutes  
- Production deploy: ~10-20 minutes

**You're ready to start collaborating on playlists! 🎵**

