# Running the Seed Script - Setup Guide

## Problem
The seed script needs to connect to Railway's EDCAT AI database, but:
1. Railway CLI isn't linked to your project
2. Local environment doesn't have `EDCAT_AI_DATABASE_URL` set

## Solution Options

### Option 1: Link Railway CLI (Recommended)

1. **Install Railway CLI** (if not installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   railway link
   ```
   This will prompt you to select your project from the list.

4. **Run the seed script**:
   ```bash
   railway run npm run seed:personality
   ```

### Option 2: Get Database URL and Run Locally

1. **Get EDCAT AI Database URL from Railway**:
   - Go to Railway Dashboard
   - Select your project
   - Find the "EDCAT AI" database service
   - Go to "Variables" tab
   - Copy the connection string (or create `EDCAT_AI_DATABASE_URL` if it doesn't exist)

2. **Create/Update `.env` file** in project root:
   ```env
   EDCAT_AI_DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```

3. **Run locally**:
   ```bash
   npm run seed:personality
   ```

### Option 3: Use Railway Web Terminal (Easiest)

1. **Go to Railway Dashboard**
2. **Select your EDCAT Administrator service** (not the database)
3. **Click "Deployments" → Select latest deployment → "Shell"**
   OR
   **Click "Settings" → "Shell"**
4. **Run the command**:
   ```bash
   npm run seed:personality
   ```

This runs directly in Railway's environment where all environment variables are already set!

### Option 4: Add to Startup Script (Automatic)

You could modify your startup to automatically run the seed script, but this is only recommended if the script is truly idempotent (which it is).

## Quick Fix: Railway Web Terminal

**Fastest way right now:**

1. Open Railway Dashboard: https://railway.app
2. Select your **EDCAT Administrator** project
3. Click on your **EDCAT Administrator** service (the app, not the database)
4. Click **"Deployments"** tab
5. Click on the latest deployment
6. Click **"Shell"** or **"View Logs"** → **"Shell"**
7. Run:
   ```bash
   npm run seed:personality
   ```

This will run in Railway's environment with all the correct database URLs already configured!

## Verification

After running, you should see output like:
```
✓ Default tenant exists
📋 Seeding 1 personas...
  ✓ vera
📝 Seeding prompts...
  ✓ system.vera.follow_rules
...
✅ Seed completed successfully!
```

Then test Vera:
- "What are your capabilities?"
- "Do you have audit capability?"

She should respond with detailed information!

