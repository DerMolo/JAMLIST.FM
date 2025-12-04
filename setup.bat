@echo off
REM Spotify Playlist Web App - Quick Setup Script (Windows)
REM This script helps you set up the app quickly on Windows

echo ===========================================
echo 🎵 Spotify Playlist Web App - Setup Script
echo ===========================================
echo.

REM Check Node.js
echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js detected
node -v
echo.

REM Check npm
echo Checking npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed
    pause
    exit /b 1
)
echo ✅ npm detected
npm -v
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Check for .env file
if not exist .env (
    echo ⚠️  .env file not found
    echo.
    echo Creating .env template...
    
    (
        echo # Database Configuration
        echo DATABASE_URL="postgresql://username:password@localhost:5432/spotify_playlist_db"
        echo.
        echo # NextAuth Configuration
        echo NEXTAUTH_URL="http://localhost:3000"
        echo NEXTAUTH_SECRET=""
        echo.
        echo # Spotify API Credentials
        echo SPOTIFY_CLIENT_ID=""
        echo SPOTIFY_CLIENT_SECRET=""
    ) > .env
    
    echo ✅ Created .env template
    echo.
    echo 📝 Please edit .env file and add:
    echo    1. DATABASE_URL (your PostgreSQL connection string)
    echo    2. NEXTAUTH_SECRET (random 32+ character string)
    echo    3. SPOTIFY_CLIENT_ID (from Spotify Developer Dashboard)
    echo    4. SPOTIFY_CLIENT_SECRET (from Spotify Developer Dashboard)
    echo.
    echo Get Spotify credentials at: https://developer.spotify.com/dashboard
    echo.
    echo Opening .env file for editing...
    start notepad .env
    echo.
    pause
) else (
    echo ✅ .env file found
)
echo.

REM Generate Prisma Client
echo 🔧 Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to generate Prisma Client
    pause
    exit /b 1
)
echo ✅ Prisma Client generated
echo.

REM Run migrations
echo 🗄️  Setting up database...
echo Make sure your PostgreSQL database is running and DATABASE_URL in .env is correct
echo.
set /p MIGRATE="Run database migrations? (y/n): "
if /i "%MIGRATE%"=="y" (
    call npx prisma migrate dev
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to run migrations
        echo    Please check your DATABASE_URL and database connection
        pause
        exit /b 1
    )
    echo ✅ Database migrations complete
)
echo.

REM Setup complete
echo ===========================================
echo ✅ Setup Complete!
echo ===========================================
echo.
echo 📚 Important URLs to configure in Spotify Dashboard:
echo    - Redirect URI: http://localhost:3000/api/auth/callback/spotify
echo.
echo 🚀 To start the development server:
echo    npm run dev
echo.
echo 📖 For more detailed instructions, see:
echo    - SETUP_GUIDE.md - Complete setup guide
echo    - README.md - Project overview
echo.
echo 🎵 Happy playlist curating!
echo.
pause

