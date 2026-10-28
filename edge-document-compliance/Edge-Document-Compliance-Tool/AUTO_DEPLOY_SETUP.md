# Automatic Deployment Setup

This repository is configured for **automatic deployment** to Railway via GitHub.

## How It Works

1. **Git Hook**: A `post-commit` hook automatically pushes every commit to GitHub
2. **Railway Integration**: Railway monitors the GitHub repository and auto-deploys on push
3. **Zero Manual Steps**: No need to manually push or pull - everything happens automatically

## Workflow

### Option 1: Standard Git Commands (Recommended)
```bash
# Make changes to your files
# Stage changes
git add .

# Commit (this automatically pushes to GitHub)
git commit -m "Your commit message"
# ✅ Automatically pushed to GitHub
# 🚂 Railway automatically deploys
```

### Option 2: Use the Auto-Commit Script
```powershell
# Windows PowerShell
.\scripts\auto-commit.ps1 "Your commit message"

# Linux/Mac
./scripts/auto-commit.sh "Your commit message"
```

## Configuration

### Git Hook
- **Location**: `.git/hooks/post-commit`
- **Function**: Automatically pushes to GitHub after every commit
- **Behavior**: Pulls remote changes first (if any), then pushes

### Railway Configuration
- **File**: `railway.json`
- **Auto-deploy**: Enabled when Railway is connected to GitHub
- **Branch**: `main` branch triggers deployments

## Railway Setup

To enable automatic deployment in Railway:

1. Go to [Railway Dashboard](https://railway.app)
2. Create/Open your project
3. Click "New" → "GitHub Repo"
4. Select: `Airgate-Pty-Ltd/EDCAT-Administrator`
5. Select branch: `main`
6. Railway will automatically:
   - Detect `railway.json`
   - Run `npm install`
   - Run `npm start`
   - Deploy on every push to `main`

## Environment Variables

Make sure these are set in Railway:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Railway sets this automatically
- Any other variables from your `.env` file

## Troubleshooting

### Hook Not Running?
- Ensure Git Bash is installed (for Windows)
- Check hook permissions: `ls -la .git/hooks/post-commit`
- Make executable: `chmod +x .git/hooks/post-commit`

### Push Conflicts?
- The hook tries to pull first, but conflicts may occur
- Resolve manually: `git pull origin main`, fix conflicts, then commit again

### Railway Not Deploying?
- Check Railway dashboard for deployment status
- Verify GitHub webhook is connected
- Check Railway logs for errors

## Disabling Auto-Push

If you need to disable automatic pushing temporarily:

```bash
# Rename the hook
mv .git/hooks/post-commit .git/hooks/post-commit.disabled

# Re-enable later
mv .git/hooks/post-commit.disabled .git/hooks/post-commit
```

