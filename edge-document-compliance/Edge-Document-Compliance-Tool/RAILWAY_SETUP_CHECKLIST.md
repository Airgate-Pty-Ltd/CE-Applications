# Railway Deployment Setup Checklist

## If Railway isn't auto-deploying, check these settings:

### 1. Railway Service Status
- [ ] Service is **Active** (green/running)
- [ ] Service is NOT **Paused** or **Stopped**
- [ ] Service has a valid **Deployment URL**

### 2. GitHub Repository Connection
- [ ] Repository connected: `Airgate-Pty-Ltd/EDCAT-Administrator`
- [ ] Railway has read/write access to the repo
- [ ] Connection is **Active** (not disconnected)

### 3. Branch Configuration
- [ ] **Production Branch** is set to: `main`
- [ ] **Auto Deploy** is **Enabled**
- [ ] Railway is watching the correct branch

### 4. Webhook Configuration
- [ ] Webhook is configured in Railway
- [ ] Webhook exists in GitHub (check repo settings)
- [ ] Recent webhook deliveries are successful

### 5. Build Configuration
- [ ] Build command is correct (should be automatic or `npm install`)
- [ ] Start command is set to: `npm start`
- [ ] Root directory is correct (if not root)

## How to Check in Railway Dashboard

1. **Go to Railway Dashboard**
2. **Click on your service**
3. **Go to Settings tab**
4. **Check "Source" section:**
   - Repository: Should show `EDCAT-Administrator`
   - Branch: Should be `main`
   - Auto Deploy: Should be **Enabled**
5. **Check "Deployments" section:**
   - Should show recent deployment attempts
   - Look for failed deployments or errors

## Quick Fixes

### Fix 1: Reconnect Repository
1. Railway Dashboard → Service → Settings → Source
2. Click "Disconnect" then "Connect Repository"
3. Select `EDCAT-Administrator`
4. Select `main` branch

### Fix 2: Change Branch
1. Railway Dashboard → Service → Settings → Source
2. Change "Branch" from `master` (or other) to `main`
3. Save changes

### Fix 3: Enable Auto Deploy
1. Railway Dashboard → Service → Settings → Source
2. Ensure "Auto Deploy" toggle is **ON**

### Fix 4: Unpause Service
1. Railway Dashboard → Service
2. If service shows "Paused", click "Resume" or "Start"

## Manual Deployment Test

To test if Railway can deploy at all:
1. Railway Dashboard → Your Service
2. Click **"Redeploy"** or **"Deploy Latest"** button
3. If this works, Railway can deploy but auto-deploy isn't working
4. If this fails, there's a configuration issue

## Still Not Working?

1. **Check Railway Status Page**: https://status.railway.app
2. **Check Railway Logs**: Look for deployment errors
3. **Check GitHub Webhooks**: https://github.com/Airgate-Pty-Ltd/EDCAT-Administrator/settings/hooks
4. **Try Railway Support**: Check Railway documentation or support

---

**Most Likely Issue:** Railway is watching the wrong branch or service is paused. Check Railway dashboard settings!

