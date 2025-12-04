#!/bin/bash

# Spotify Playlist Web App - Quick Setup Script
# This script helps you set up the app quickly on any device

echo "🎵 Spotify Playlist Web App - Setup Script"
echo "=========================================="
echo ""

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected. Version 18+ is recommended."
else
    echo "✅ Node.js $(node -v) detected"
fi

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found"
    echo ""
    echo "Creating .env template..."
    
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/spotify_playlist_db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""

# Spotify API Credentials
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""
EOF
    
    # Generate NEXTAUTH_SECRET
    if command -v openssl &> /dev/null; then
        SECRET=$(openssl rand -base64 32)
        # Escape special characters for sed
        ESCAPED_SECRET=$(echo "$SECRET" | sed 's/[&/\]/\\&/g')
        sed -i.bak "s/NEXTAUTH_SECRET=\"\"/NEXTAUTH_SECRET=\"$ESCAPED_SECRET\"/" .env
        rm .env.bak 2>/dev/null
        echo "✅ Generated NEXTAUTH_SECRET"
    else
        echo "⚠️  openssl not found. Please manually set NEXTAUTH_SECRET in .env"
    fi
    
    echo ""
    echo "📝 Please edit .env file and add:"
    echo "   1. DATABASE_URL (your PostgreSQL connection string)"
    echo "   2. SPOTIFY_CLIENT_ID (from Spotify Developer Dashboard)"
    echo "   3. SPOTIFY_CLIENT_SECRET (from Spotify Developer Dashboard)"
    echo ""
    echo "Get Spotify credentials at: https://developer.spotify.com/dashboard"
    echo ""
    read -p "Press Enter when you've updated .env file..."
else
    echo "✅ .env file found"
fi
echo ""

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi
echo "✅ Prisma Client generated"
echo ""

# Run migrations
echo "🗄️  Setting up database..."
echo "Make sure your PostgreSQL database is running and DATABASE_URL in .env is correct"
echo ""
read -p "Run database migrations? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma migrate dev
    if [ $? -ne 0 ]; then
        echo "❌ Failed to run migrations"
        echo "   Please check your DATABASE_URL and database connection"
        exit 1
    fi
    echo "✅ Database migrations complete"
fi
echo ""

# Setup complete
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📚 Important URLs to configure in Spotify Dashboard:"
echo "   - Redirect URI: http://localhost:3000/api/auth/callback/spotify"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "📖 For more detailed instructions, see:"
echo "   - SETUP_GUIDE.md - Complete setup guide"
echo "   - README.md - Project overview"
echo ""
echo "🎵 Happy playlist curating!"

