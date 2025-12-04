# Deploying to GitHub Repository

This guide will help you push your code to: [https://github.com/DerMolo/JAMLIST.FM](https://github.com/DerMolo/JAMLIST.FM)

---

## 🚀 Quick Push to GitHub

### Step 1: Initialize Git (if not already done)

```bash
# Check if git is already initialized
git status

# If not initialized, run:
git init
```

### Step 2: Add Remote Repository

```bash
git remote add origin https://github.com/DerMolo/JAMLIST.FM.git

# Verify remote was added
git remote -v
```

### Step 3: Stage All Files

```bash
# Add all files (respects .gitignore)
git add .

# Check what will be committed
git status
```

### Step 4: Create Initial Commit

```bash
git commit -m "Initial commit: Spotify Playlist Branching System

- Complete playlist management system
- Git-like branching workflow
- Pull request system with granular approvals
- Track reordering functionality
- Notifications system
- Full authentication with Spotify OAuth"
```

### Step 5: Push to GitHub

```bash
# Push to main branch
git push -u origin main

# If your default branch is 'master', use:
# git push -u origin master
```

---

## 🔒 Important: Before Pushing

### Verify .gitignore

Make sure these are in your `.gitignore` (already set up):

```gitignore
# Environment variables (NEVER commit these!)
.env
.env*.local

# Dependencies
node_modules/

# Build outputs
.next/
out/
build/

# Database migrations (optional - usually committed)
# /prisma/migrations
```

### Check for Sensitive Data

```bash
# Make sure .env is NOT staged
git status

# If .env appears, remove it:
git rm --cached .env
```

### Double-Check Environment Variables

Ensure `.env` is NOT tracked:
```bash
# This should NOT show .env
git ls-files | grep .env
```

---

## 📝 What Gets Pushed

✅ **Will be pushed:**
- All source code files (`app/`, `lib/`, `types/`, etc.)
- `package.json` and `package-lock.json`
- Database schema (`prisma/schema.prisma`)
- Documentation (README.md, SETUP_GUIDE.md, etc.)
- Configuration files (tsconfig.json, tailwind.config, etc.)
- `.gitignore` file
- Setup scripts (setup.sh, setup.bat)

❌ **Will NOT be pushed (protected by .gitignore):**
- `.env` file (contains secrets!)
- `node_modules/` (too large, regenerated with npm install)
- `.next/` (build output, regenerated)
- Database migration history (optional)

---

## 🌐 After Pushing to GitHub

### 1. Verify Upload

Visit [https://github.com/DerMolo/JAMLIST.FM](https://github.com/DerMolo/JAMLIST.FM) and verify all files are there.

### 2. Set Up Repository Settings

**Add Repository Description:**
```
🎵 Collaborative playlist management with Git-like branching, pull requests, and granular approval controls for Spotify playlists
```

**Add Topics (Tags):**
- `spotify`
- `playlist-manager`
- `nextjs`
- `typescript`
- `prisma`
- `postgresql`
- `collaborative-editing`
- `music`

**Set Repository Visibility:**
- Public: Anyone can see and clone
- Private: Only you and collaborators can access

### 3. Enable GitHub Features

**Discussions:**
- Settings → Features → Enable Discussions

**Issues:**
- Already enabled by default
- Use for bug reports and feature requests

**Projects:**
- Create project board for task management

### 4. Add Repository Secrets (for GitHub Actions)

If you plan to use CI/CD:
- Settings → Secrets and variables → Actions
- Add: `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.

---

## 🔄 Future Updates

### Making Changes and Pushing

```bash
# 1. Make your changes to files

# 2. Check what changed
git status
git diff

# 3. Stage changes
git add .
# Or stage specific files:
# git add app/api/playlists/route.ts

# 4. Commit with descriptive message
git commit -m "Add granular approval system for PRs"

# 5. Push to GitHub
git push origin main
```

### Common Git Commands

```bash
# View commit history
git log --oneline

# View remote repository
git remote -v

# Pull latest changes (if working with others)
git pull origin main

# Create and switch to new branch
git checkout -b feature/new-feature

# Push new branch to GitHub
git push -u origin feature/new-feature

# Switch back to main
git checkout main

# Merge branch into main
git merge feature/new-feature
```

---

## 🚢 Deploying to Vercel from GitHub

Once your code is on GitHub, deploying is easy:

### 1. Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com/)
2. Sign in with GitHub
3. Click "New Project"
4. Import `DerMolo/JAMLIST.FM` repository

### 2. Configure Project

Vercel auto-detects Next.js settings:
- **Framework:** Next.js (auto-detected)
- **Root Directory:** `./` (default)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### 3. Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```env
DATABASE_URL=your-production-database-url
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-production-secret
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### 4. Deploy

Click "Deploy" and Vercel will:
- Clone your repo
- Install dependencies
- Build the app
- Deploy to a live URL

### 5. Update Spotify Redirect URIs

Add your Vercel domain to Spotify Developer Dashboard:
```
https://your-app.vercel.app/api/auth/callback/spotify
```

### 6. Automatic Deployments

Every time you push to GitHub:
- Vercel automatically deploys
- New deployments get preview URLs
- Main branch deploys to production

---

## 🔧 Troubleshooting

### "fatal: remote origin already exists"

```bash
# Remove existing remote
git remote remove origin

# Add correct remote
git remote add origin https://github.com/DerMolo/JAMLIST.FM.git
```

### "Authentication failed"

Use GitHub Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when pushing

Or use SSH:
```bash
git remote set-url origin git@github.com:DerMolo/JAMLIST.FM.git
```

### "Updates were rejected"

```bash
# If remote has commits you don't have
git pull origin main --rebase
git push origin main
```

### "Permission denied"

Ensure you have write access to the repository.

### Large files error

If you accidentally added large files:
```bash
# Remove from staging
git rm --cached path/to/large/file

# Add to .gitignore
echo "path/to/large/file" >> .gitignore

# Commit and push
git commit -m "Remove large file"
git push origin main
```

---

## 📋 Pre-Push Checklist

Before pushing, verify:

- [ ] `.env` is in `.gitignore` and NOT staged
- [ ] No sensitive data in code (API keys, passwords, etc.)
- [ ] README.md is up to date
- [ ] All documentation is included
- [ ] `node_modules/` is NOT staged
- [ ] Code has no critical bugs
- [ ] Setup instructions are clear
- [ ] Repository name is correct

---

## 🎯 Quick Command Summary

```bash
# First time push
git init
git remote add origin https://github.com/DerMolo/JAMLIST.FM.git
git add .
git commit -m "Initial commit"
git push -u origin main

# Future updates
git add .
git commit -m "Your commit message"
git push origin main

# Check status anytime
git status
git log --oneline
```

---

## 📱 GitHub Mobile App

Download GitHub Mobile to:
- View code on the go
- Review pull requests
- Manage issues
- Get notifications

Available for iOS and Android.

---

## 🤝 Collaborating with Others

### Adding Collaborators

1. Repository → Settings → Collaborators
2. Add GitHub usernames
3. They can now push to the repo

### Pull Request Workflow

When others contribute:
1. They fork your repo
2. Make changes in their fork
3. Submit pull request
4. You review and merge

---

## 🔐 Security Best Practices

1. **Never commit `.env`** - Always in `.gitignore`
2. **Use GitHub Secrets** - For CI/CD environment variables
3. **Regular updates** - Keep dependencies updated
4. **Enable Dependabot** - Automatic security updates
5. **Add LICENSE** - Specify how others can use your code

---

## 📚 Additional Resources

- [GitHub Docs](https://docs.github.com/)
- [Git Cheat Sheet](https://training.github.com/downloads/github-git-cheat-sheet/)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Ready to push?** Run the commands above and your code will be live on GitHub! 🚀

---

## 🎉 After First Push

Once pushed, you can:
- Share the repo link with others
- Deploy to Vercel in 2 clicks
- Enable GitHub Actions for CI/CD
- Add collaborators
- Track issues and features
- Build a community around your project

Your code is now backed up and version-controlled! 🎵

