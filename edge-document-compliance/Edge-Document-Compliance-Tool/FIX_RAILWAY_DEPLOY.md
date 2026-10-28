# Fix Railway Auto-Deployment

## The Problem
Push succeeds but Railway doesn't automatically deploy.

## Most Common Causes

### 1. Railway Service is Paused ⚠️ (MOST COMMON)
**Check:**
- Railway Dashboard → Your Service
- Look for "Paused" status
- If paused, click "Resume" or "Start"

### 2. Railway is Watching Wrong Branch ⚠️
**Fix:**
1. Railway Dashboard → Service → Settings → Source
2. Check "Branch" field
3. Change to: `main` (if it says `master` or something else)
4. Save changes

### 3. Auto-Deploy is Disabled
**Fix:**
1. Railway Dashboard → Service → Settings → Source
2. Find "Auto Deploy" toggle
3. Turn it **ON**

### 4. Repository Not Connected
**Fix:**
1. Railway Dashboard → Service → Settings → Source
2. If repository shows "Disconnected"
3. Click "Connect Repository"
4. Select: `Airgate-Pty-Ltd/EDCAT-Administrator`
5. Select branch: `main`

## Quick Diagnostic Steps

### Step 1: Verify Push Reached GitHub
Run this:
```bash
node check-github-push.js
```

Or check manually:
1. Go to: https://github.com/Airgate-Pty-Ltd/EDCAT-Administrator
2. Check commit history
3. Should see: "Trigger: Force Railway redeploy"

### Step 2: Check Railway Dashboard
1. Open Railway: https://railway.app
2. Go to your service
3. Check **Settings** → **Source**
4. Verify:
   - Repository: `EDCAT-Administrator` ✅
   - Branch: `main` ✅
   - Auto Deploy: **Enabled** ✅
   - Status: **Active** ✅

### Step 3: Try Manual Redeploy
1. Railway Dashboard → Your Service
2. Look for **"Redeploy"** or **"Deploy Latest"** button
3. Click it
4. If this works, Railway can deploy but auto-deploy is broken
5. If this fails, there's a configuration issue

## Emergency Fix: Manual Redeploy

If auto-deploy isn't working, you can always manually redeploy:

1. **Railway Dashboard Method:**
   - Railway → Service → Click "Redeploy" button
   - This forces deployment from latest commit

2. **GitHub Integration:**
   - Railway should show recent commits
   - Click on a commit to deploy it manually

## Still Not Working?

### Check Railway Logs
1. Railway Dashboard → Service → Logs
2. Look for deployment errors
3. Check if build is failing

### Check GitHub Webhook
1. Go to: https://github.com/Airgate-Pty-Ltd/EDCAT-Administrator/settings/hooks
2. Look for Railway webhook
3. Check "Recent Deliveries" tab
4. See if webhooks are failing

### Railway Service Status
- Check: https://status.railway.app
- See if Railway has any outages

---

## Most Likely Solution

**99% of the time, one of these:**
1. Service is **paused** → Unpause it
2. Watching **wrong branch** → Change to `main`
3. **Auto-deploy disabled** → Enable it

**Check Railway Dashboard → Service → Settings → Source**

