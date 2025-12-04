# 🎵 Spotify Playlist Branching System

A collaborative playlist management platform inspired by Git workflows. Create branches of playlists, propose changes through pull requests, and manage collaborative music curation with granular approval controls.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat&logo=postgresql)

---

## ✨ Features

### 🎼 Playlist Management
- **Import from Spotify:** Sync your existing Spotify playlists
- **Create Custom Playlists:** Build playlists from scratch
- **Collaborative Editing:** Share playlists with contributors
- **Public/Private Playlists:** Control visibility and access

### 🌿 Git-Like Branching
- **Fork Playlists:** Create your own copy of any public playlist
- **Create Branches:** Experiment with track orders and selections
- **Track Changes:** Automatic diff calculation (additions, removals, reordering)
- **Branch Protection:** Submitted branches remain accessible

### 🔄 Pull Request Workflow
- **Submit Changes:** Propose modifications to playlist owners
- **Visual Diff:** See exactly what changed (tracks added/removed)
- **Branch Tracking:** View complete branch tracklist in PRs
- **Granular Approvals:** Approve or reject individual changes
- **Merge Control:** Apply only approved changes to main playlist

### 🔔 Notification System
- **PR Updates:** Get notified when PRs are opened, approved, or rejected
- **Like Alerts:** Know when someone likes your playlist
- **Branch Notifications:** Be informed when users create branches
- **Fork Alerts:** Track who's forking your playlists

### 🎚️ Advanced Features
- **Track Reordering:** Drag tracks to new positions in playlists and branches
- **Granular Approval:** Chief contributors can approve changes individually
- **Change Tracking:** Full history of all modifications
- **User Profiles:** Customize your profile and view stats
- **Search & Discovery:** Browse public playlists and discover new music

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Spotify Developer account

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd FinalProjectSpotifyWebApp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Configure Spotify API:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
   - Copy Client ID and Secret to `.env`

5. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to `http://localhost:3000`

For detailed setup instructions, see **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**

---

## 📖 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions for all platforms
- **[CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md)** - Recent updates and feature additions
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Database migration instructions

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 14.2** - React framework with server-side rendering
- **React 18.3** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **NextAuth.js** - Authentication with Spotify OAuth
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Relational database

### External Services
- **Spotify Web API** - Music data and playback
- **Sharp** - Image processing for playlist covers

---

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── playlists/    # Playlist management
│   │   ├── pull-requests/# PR workflow
│   │   └── spotify/      # Spotify integration
│   ├── playlists/        # Playlist pages
│   ├── pull-requests/    # PR pages
│   └── dashboard/        # User dashboard
├── prisma/               # Database schema and migrations
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
└── public/              # Static assets
```

---

## 🎯 Core Workflows

### Creating a Branch and Pull Request

1. **Find a playlist** you want to contribute to
2. **Create a branch** with your proposed changes
3. **Add, remove, or reorder tracks** in your branch
4. **Submit a pull request** with your changes
5. **Playlist owner reviews** and approves/rejects changes
6. **Merge approved changes** into the main playlist

### Granular Approval Process

```
User Creates PR → Owner Reviews Individual Changes
                    ↓
              Approve Track A ✓
              Reject Track B ✗
              Approve Reorder ✓
                    ↓
              Owner Merges PR
                    ↓
         Only Approved Changes Applied
```

---

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL="postgresql://..."          # PostgreSQL connection
NEXTAUTH_URL="http://localhost:3000"     # Your app URL
NEXTAUTH_SECRET="random-secret-here"     # JWT secret
SPOTIFY_CLIENT_ID="your-client-id"       # Spotify app ID
SPOTIFY_CLIENT_SECRET="your-secret"      # Spotify app secret
```

See `.env.example` for a complete template.

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

Detailed instructions: [SETUP_GUIDE.md - Deploying to Production](./SETUP_GUIDE.md#-deploying-to-production-vercel---recommended)

### Other Platforms

Compatible with:
- **Railway** - One-click deployment
- **Heroku** - Container deployment
- **AWS/GCP/Azure** - Full control
- **Docker** - Containerized deployment

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Database Commands

```bash
npx prisma studio              # Open database viewer
npx prisma migrate dev         # Create and apply migration
npx prisma migrate deploy      # Apply migrations (production)
npx prisma generate            # Generate Prisma Client
```

---

## 🧪 Testing Features

After setup, try these workflows:

1. **Import a Spotify playlist**
2. **Create a branch** of that playlist
3. **Reorder tracks** in your branch
4. **Submit a PR** with your changes
5. **Review the PR** (if you're the owner)
6. **Approve individual tracks**
7. **Merge the PR**
8. **Verify changes** applied correctly

---

## 📊 Database Schema

Key models:

- **User** - User accounts and authentication
- **InternalPlaylist** - Playlist metadata and tracks
- **PlaylistBranch** - Branch information and tracks
- **PullRequest** - PR workflow and approvals
- **PRDiff** - Change tracking and granular approvals
- **Notification** - User notifications

View full schema: [prisma/schema.prisma](./prisma/schema.prisma)

---

## 🤝 Contributing

This project supports collaborative music curation! Features for contributors:

- Fork playlists to create your own versions
- Create branches for experimental changes
- Submit pull requests with detailed diffs
- Get notified of PR status updates
- View change history and approvals

---

## 🔒 Security

- **Authentication:** Secure OAuth 2.0 with Spotify
- **Authorization:** Role-based access control
- **Password Security:** bcrypt hashing
- **Session Management:** Secure JWT tokens
- **Database:** Parameterized queries via Prisma

---

## 🐛 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Verify DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Check connection string format

**"Spotify authentication fails"**
- Verify Spotify credentials in `.env`
- Check redirect URIs match exactly
- Clear browser cookies and retry

**"Module not found"**
```bash
rm -rf node_modules package-lock.json
npm install
```

See [SETUP_GUIDE.md - Troubleshooting](./SETUP_GUIDE.md#-troubleshooting) for more solutions.

---

## 📝 Recent Updates

### Version 1.1.0 (December 2025)

✅ **Issues Fixed:**
- Branch change tracking now works correctly
- PRs properly display branch tracks
- Branches persist after PR submission
- Multiple forks of same playlist allowed

✨ **New Features:**
- Granular approval system for individual changes
- Track reordering for playlists and branches
- Enhanced notification system (likes, branches, PRs)
- Auto-calculated diffs for branch PRs

See [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) for complete details.

---

## 🎵 Use Cases

- **DJs:** Collaborate on setlists with contributors
- **Party Planners:** Crowdsource playlist suggestions
- **Music Curators:** Manage editorial playlists with quality control
- **Friend Groups:** Build shared music collections together
- **Music Communities:** Discover and remix public playlists

---

## 📧 Support

For issues or questions:
1. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for setup help
2. Review [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) for recent changes
3. Check application logs for error messages

---

## 📄 License

This project is for educational and personal use.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Spotify Web API](https://developer.spotify.com/documentation/web-api) - Music data
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 🚀 Getting Started Now

```bash
# Quick start in 5 commands
git clone <repo-url>
cd FinalProjectSpotifyWebApp
npm install
cp .env.example .env
# Edit .env with your credentials, then:
npx prisma migrate dev
npm run dev
```

**Happy playlist curating! 🎶**
