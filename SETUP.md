# Setup Guide - Spotify Collaborative Playlists

This guide will walk you through setting up the application from scratch.

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Node.js 18+ installed ([Download here](https://nodejs.org/))
- [ ] PostgreSQL installed and running ([Download here](https://www.postgresql.org/download/))
- [ ] A Spotify account
- [ ] Git (optional, for version control)

## Step-by-Step Setup

### 1. PostgreSQL Setup

#### Windows (Using pgAdmin):

1. Open pgAdmin or use psql command line
2. Create a new database named `spotifyapp`:
   ```sql
   CREATE DATABASE spotifyapp;
   ```

#### Using Command Line:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE spotifyapp;

# Verify it was created
\l

# Exit psql
\q
```

### 2. Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create App"**
4. Fill in the form:
   - **App Name**: `Spotify Collaborative Playlists` (or any name)
   - **App Description**: `Collaborative playlist management platform`
   - **Redirect URI**: `http://localhost:3000/api/auth/callback/spotify`
   - **APIs Used**: Select `Web API`
   - Accept the terms and click **Create**
5. On the app page, click **Settings**
6. Copy your **Client ID**
7. Click **View client secret** and copy the **Client Secret**
8. **Important**: Keep these credentials private!

### 3. Project Setup

1. **Navigate to the project directory**:
   ```bash
   cd C:\Users\Iampi\OneDrive\Desktop\FinalProjectSpotifyWebApp
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Create environment variables file**:
   
   Create a `.env` file in the root directory with the following content:

   ```env
   # Database Connection
   # Replace 'yourpassword' with your PostgreSQL password
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/spotifyapp"

   # Spotify API Credentials
   # Replace with your actual Spotify credentials from Step 2
   SPOTIFY_CLIENT_ID="your_spotify_client_id_here"
   SPOTIFY_CLIENT_SECRET="your_spotify_client_secret_here"

   # NextAuth Configuration
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your_generated_secret_1"

   # JWT Secret
   JWT_SECRET="your_generated_secret_2"
   ```

4. **Generate secure secrets**:
   
   Open PowerShell and run these commands to generate random secrets:

   ```powershell
   # For NEXTAUTH_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

   # For JWT_SECRET (run again for a different secret)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Copy each generated secret into your `.env` file.

### 4. Database Migration

1. **Push the schema to your database**:
   ```bash
   npx prisma db push
   ```

   You should see output like:
   ```
   ✔ Your database is now in sync with your Prisma schema.
   ✔ Generated Prisma Client
   ```

2. **(Optional) Open Prisma Studio** to view your database:
   ```bash
   npx prisma studio
   ```
   This will open a browser at `http://localhost:5555` where you can view and edit your database.

### 5. Verify Setup

Run a build to make sure everything is configured correctly:

```bash
npm run build
```

If the build succeeds, you're ready to go!

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## First Time Usage

### Create an Account

1. Go to http://localhost:3000
2. Click **"Create Account"** or **"Sign up with Spotify"**
3. If using email:
   - Enter your email, password, and display name
   - Click **"Create Account"**
4. If using Spotify:
   - You'll be redirected to Spotify to authorize the app
   - After authorization, you'll be redirected back to the dashboard

### Create Your First Playlist

1. Click **"+ Create Playlist"** on the dashboard
2. Fill in:
   - **Playlist Name**: e.g., "My First Playlist"
   - **Description**: Optional description
   - **Make playlist public**: Check if you want others to see it
   - **Enable collaborations**: Check if you want to accept pull requests
3. Click **"Create"**

## Troubleshooting

### Database Connection Issues

**Error: `connection refused` or `FATAL: role "Iampi" does not exist`**

Solution:
1. Make sure PostgreSQL is running
2. Check your DATABASE_URL in `.env`
3. The username should be `postgres` (default) unless you changed it
4. Verify the password is correct

Test your connection:
```bash
psql -U postgres -d spotifyapp
```

### Spotify OAuth Issues

**Error: `invalid_client` or redirect URI mismatch**

Solution:
1. Verify your Client ID and Secret in `.env` match your Spotify app
2. Check that `http://localhost:3000/api/auth/callback/spotify` is in your Spotify app's Redirect URIs
3. Make sure there are no trailing slashes

### Port Already in Use

**Error: `Port 3000 is already in use`**

Solution:
```bash
# Option 1: Kill the process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Use a different port
# In package.json, change "dev" script to:
# "dev": "next dev -p 3001"
```

### Build Errors

**Error: Missing modules or TypeScript errors**

Solution:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma Client
npx prisma generate

# Try building again
npm run build
```

## Database Management

### Reset Database (Warning: Deletes all data)

```bash
npx prisma db push --force-reset
```

### View Database

```bash
npx prisma studio
```

### Backup Database

```bash
pg_dump -U postgres spotifyapp > backup.sql
```

### Restore Database

```bash
psql -U postgres spotifyapp < backup.sql
```

## Environment-Specific Notes

### Development
- Uses `npm run dev`
- Hot reloading enabled
- Prisma Studio available

### Production
- Build with `npm run build`
- Run with `npm start`
- Set `NODE_ENV=production`
- Use a production PostgreSQL database (not localhost)

## Next Steps

Once your app is running:

1. **Explore the Dashboard**: View your playlists and stats
2. **Create Playlists**: Start building your music collection
3. **Try Collaborations**: Enable collaborative mode and test pull requests
4. **Check Profile**: Manage your settings and preferences
5. **Review PRs**: Test the pull request workflow

## Getting Help

- Check the main `README.md` for API documentation
- Review the design documents for system architecture
- Check Prisma schema at `prisma/schema.prisma`
- Inspect API routes in `app/api/`

## Security Notes

⚠️ **Important**:
- Never commit your `.env` file to git
- Keep your Spotify credentials private
- Use strong, unique secrets for production
- Change default passwords in production environments

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [NextAuth.js Documentation](https://next-auth.js.org/)

---

**You're all set!** 🎉 Enjoy building collaborative playlists!

