# Railway CLI Setup Guide

## Step 1: Install Railway CLI

### Option A: Using npm (Recommended)
```bash
npm install -g @railway/cli
```

### Option B: Using PowerShell (Windows)
```powershell
# Download and install Railway CLI
iwr https://railway.app/install.ps1 -useb | iex
```

### Option C: Using Homebrew (if you have it)
```bash
brew install railway
```

### Verify Installation
```bash
railway --version
```
You should see something like: `railway 3.x.x`

## Step 2: Login to Railway

```bash
railway login
```

This will:
1. Open your browser
2. Ask you to authorize Railway CLI
3. Return to the terminal once authorized

## Step 3: Link to Your Project

```bash
# Navigate to your project directory
cd "C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"

# Link to Railway project
railway link
```

You'll see a prompt like:
```
? Select a project:
❯ EDCAT Administrator
```

Select your project from the list.

## Step 4: Verify Connection

```bash
# Check current project
railway status
```

This should show your project name and environment.

## Step 5: Run the Seed Script

Now you can run the seed script:

```bash
railway run npm run seed:personality
```

This will:
- Connect to Railway's environment
- Use all the correct environment variables (including `EDCAT_AI_DATABASE_URL`)
- Run the seed script in Railway's context

## Troubleshooting

### Error: "railway: command not found"
- Make sure Railway CLI is installed
- Try: `npm install -g @railway/cli` again
- Restart your terminal/PowerShell

### Error: "No linked project found"
- Make sure you're in the project directory
- Run `railway link` again
- Select the correct project

### Error: "Authentication failed"
- Run `railway login` again
- Make sure you're logged into Railway in your browser

### Error: "Cannot find module" when running seed script
- The script runs in Railway's environment, so all dependencies should be available
- If it fails, check Railway logs for more details

## Alternative: Check Environment Variables

If you want to verify your database connection:

```bash
# List all environment variables (without showing values)
railway variables

# Or check specific variable
railway variables get EDCAT_AI_DATABASE_URL
```

## Full Command Sequence

Here's the complete sequence:

```bash
# 1. Install Railway CLI (if not installed)
npm install -g @railway/cli

# 2. Login
railway login

# 3. Navigate to project
cd "C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"

# 4. Link project
railway link

# 5. Run seed script
railway run npm run seed:personality
```

## What to Expect

After running `railway run npm run seed:personality`, you should see:

```
🌱 Seeding EDCAT AI Personality System
============================================================
✓ Default tenant exists
📋 Seeding 1 personas...
  ✓ vera
📝 Seeding prompts...
  ✓ system.vera.follow_rules
...
🔧 Seeding policies...
  ✓ vera.intent.router
  ✓ vera.expert.credentials
  ✓ vera.knowledge.templates
  ✓ vera.knowledge.base
  ✓ vera.enhanced.intents
...
✅ Seed completed successfully!
```

## Next Steps

After the seed script completes:
1. Test Vera in your application
2. Ask: "What are your capabilities?"
3. Ask: "Do you have audit capability?"
4. She should respond with detailed information!

