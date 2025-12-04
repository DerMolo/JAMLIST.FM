# Setup Guide - Spotify Playlist Web App

This guide will help you get the Spotify Playlist Branching System running on any device.

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **PostgreSQL** database ([Local installation](https://www.postgresql.org/download/) or cloud service like [Supabase](https://supabase.com/), [Neon](https://neon.tech/), or [Railway](https://railway.app/))
- **Spotify Developer Account** ([Sign up](https://developer.spotify.com/))
- **Git** (for cloning the repository)

---

## 🚀 Quick Start (Local Development)

### Step 1: Clone or Copy the Project

**Option A - If using Git:**
```bash
git clone <your-repo-url>
cd FinalProjectSpotifyWebApp
```

**Option B - Manual Copy:**
- Copy the entire project folder to your device
- Open terminal/command prompt in the project directory

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

This installs all required packages from `package.json`.

### Step 3: Set Up Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in the details:
   - **App Name:** Your app name (e.g., "My Playlist App")
   - **App Description:** Any description
   - **Redirect URI:** `http://localhost:3000/api/auth/callback/spotify`
   - **APIs Used:** Web API
4. Click "Save"
5. Note your **Client ID** and **Client Secret**
6. Click "Edit Settings" and add to Redirect URIs:
   - `http://localhost:3000/api/auth/callback/spotify`

### Step 4: Set Up Database

**Option A - Local PostgreSQL:**
```bash
# Install PostgreSQL, then create a database
createdb spotify_playlist_db
```

**Option B - Cloud Database (Recommended for ease):**

**Using Supabase (Free):**
1. Go to [supabase.com](https://supabase.com/)
2. Create new project
3. Go to Settings → Database
4. Copy the connection string (pooler connection string recommended)

**Using Neon (Free):**
1. Go to [neon.tech](https://neon.tech/)
2. Create new project
3. Copy the connection string

### Step 5: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# .env file

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/spotify_playlist_db"
# For cloud databases, use the connection string provided:
# DATABASE_URL="postgresql://user:pass@host.region.provider.com:5432/dbname?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key-here"
# Generate a secret: openssl rand -base64 32

# Spotify API Credentials
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
```

**To generate NEXTAUTH_SECRET:**
```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use any random 32+ character string
```

### Step 6: Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev

# Optional: Open Prisma Studio to view database
npx prisma studio
```

### Step 7: Start Development Server

```bash
npm run dev
# or
yarn dev
```

The app will be available at: **http://localhost:3000**

---

## 🌐 Setting Up on Another Local Device (Same Network)

### On the Host Machine:

1. Find your local IP address:
   ```bash
   # Windows:
   ipconfig
   # Look for "IPv4 Address" (e.g., 192.168.1.100)
   
   # Mac/Linux:
   ifconfig
   # or
   ip addr show
   # Look for inet address (e.g., 192.168.1.100)
   ```

2. Start the dev server on all interfaces:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

3. Update your Spotify App settings:
   - Add redirect URI: `http://YOUR_LOCAL_IP:3000/api/auth/callback/spotify`
   - Example: `http://192.168.1.100:3000/api/auth/callback/spotify`

4. Update `.env`:
   ```env
   NEXTAUTH_URL="http://YOUR_LOCAL_IP:3000"
   ```

### On Other Devices (Same Network):

1. Open browser and navigate to:
   ```
   http://YOUR_LOCAL_IP:3000
   # Example: http://192.168.1.100:3000
   ```

2. You can now use the app from any device on your local network!

---

## ☁️ Deploying to Production (Vercel - Recommended)

Vercel is the easiest way to deploy Next.js apps.

### Step 1: Prepare for Deployment

1. Push your code to GitHub, GitLab, or Bitbucket
2. Ensure `.env` is in `.gitignore` (already set up)

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com/) and sign up
2. Click "New Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

### Step 3: Set Environment Variables in Vercel

In Vercel project settings → Environment Variables, add:

```env
DATABASE_URL=your-production-database-url
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-production-secret
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### Step 4: Update Spotify App Settings

Add your Vercel domain to Spotify Redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/spotify
```

### Step 5: Deploy

Click "Deploy" - Vercel will:
- Install dependencies
- Run build
- Deploy your app
- Provide a live URL

### Step 6: Run Database Migrations in Production

**Option A - Using Vercel Terminal:**
1. Go to your project → Settings → General → Connect Git
2. In deployment logs, find the deployment
3. Run: `npx prisma migrate deploy`

**Option B - Locally with production database:**
```bash
# Set DATABASE_URL to your production database
DATABASE_URL="your-production-db" npx prisma migrate deploy
```

---

## 🐳 Docker Setup (Optional)

For containerized deployment, create:

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy app files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build app
RUN npm run build

EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
      - SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=spotify_app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Run with Docker:**
```bash
docker-compose up
```

---

## 📱 Mobile Device Access

### Same Network (Development):
1. Start dev server on `0.0.0.0` (see above)
2. Access via `http://YOUR_LOCAL_IP:3000` on mobile browser

### Production:
- Access your Vercel URL directly on mobile browser
- Works like any website

### Progressive Web App (PWA) - Optional Enhancement:
Consider adding PWA support for app-like experience on mobile:
```bash
npm install next-pwa
```

---

## 🔧 Troubleshooting

### "Module not found" errors:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database connection errors:
```bash
# Test database connection
npx prisma db pull

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Spotify authentication fails:
1. Check Redirect URIs in Spotify Dashboard match exactly
2. Verify `NEXTAUTH_URL` in `.env`
3. Clear browser cookies and try again

### Port 3000 already in use:
```bash
# Use different port
npm run dev -- -p 3001
# Update NEXTAUTH_URL to match new port
```

### "Prisma Client not found":
```bash
npx prisma generate
```

---

## 🔐 Security Best Practices

### For Production:

1. **Use Strong Secrets:**
   - Generate new `NEXTAUTH_SECRET` for production
   - Never commit `.env` file

2. **Database Security:**
   - Use SSL connections (add `?sslmode=require` to DATABASE_URL)
   - Use separate database for production

3. **Environment Variables:**
   - Use different credentials for dev/production
   - Store secrets in Vercel/hosting platform, not in code

4. **Spotify App:**
   - Create separate Spotify app for production
   - Restrict redirect URIs to your domain only

---

## 📊 Database Management

### View Database:
```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Backup Database:
```bash
# PostgreSQL
pg_dump -U username dbname > backup.sql

# Restore
psql -U username dbname < backup.sql
```

### Apply New Migrations:
```bash
# After pulling new code with schema changes
npx prisma migrate deploy
```

---

## 🎯 Different Setup Scenarios

### Scenario 1: Developer's Personal Machine
- Use local PostgreSQL or free cloud DB (Supabase)
- Run with `npm run dev`
- Access at `localhost:3000`

### Scenario 2: Team Development (Multiple Developers)
- Use shared cloud database (staging)
- Each developer has own `.env` with same DATABASE_URL
- Use separate Spotify app credentials per developer (optional)

### Scenario 3: Production Server (VPS/Cloud)
- Use production database with backups
- Run with `npm run build && npm start`
- Use PM2 or systemd to keep app running
- Set up reverse proxy (Nginx) for custom domain

### Scenario 4: Serverless (Vercel/Netlify)
- Use serverless database (Supabase, PlanetScale, Neon)
- Deploy through Git integration
- Automatic deployments on push

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | ✅ | Your app URL | `http://localhost:3000` or `https://yourdomain.com` |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT | `openssl rand -base64 32` |
| `SPOTIFY_CLIENT_ID` | ✅ | From Spotify Developer Dashboard | `abc123...` |
| `SPOTIFY_CLIENT_SECRET` | ✅ | From Spotify Developer Dashboard | `xyz789...` |

---

## 🚦 Getting Started Checklist

- [ ] Node.js 18+ installed
- [ ] Project files copied/cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Spotify Developer App created
- [ ] Database created (local or cloud)
- [ ] `.env` file created with all variables
- [ ] Database migrations run (`npx prisma migrate dev`)
- [ ] Dev server started (`npm run dev`)
- [ ] App accessible at `localhost:3000`
- [ ] Spotify login working
- [ ] Test creating a playlist

---

## 📞 Quick Commands Reference

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open database viewer
npx prisma studio

# Run migrations in production
npx prisma migrate deploy

# Reset database (⚠️ deletes data)
npx prisma migrate reset
```

---

## 🎓 Next Steps After Setup

1. Create your first account
2. Connect Spotify account
3. Import a playlist
4. Create a branch
5. Test the PR workflow
6. Explore granular approvals

---

**Setup Time Estimate:**
- First time: 15-30 minutes
- Subsequent setups: 5-10 minutes
- Production deployment: 10-20 minutes

Need help? Check the troubleshooting section or review the application logs!

